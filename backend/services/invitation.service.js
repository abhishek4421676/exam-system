const pool = require('../config/connection');
const logger = require('../config/logger');
const crypto = require('crypto');
const emailService = require('./email.service');

class InvitationService {
  /**
   * Send invitation to user (admin only)
   */
  static async inviteUser(invitationData) {
    const { tenant_id, email, assigned_role, invited_by } = invitationData;
    
    // Check if there's already an accepted user with this email
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM Users WHERE email = ? AND tenant_id = ?',
      [email, tenant_id]
    );

    if (existingUsers.length > 0) {
      const error = new Error('User already exists in this tenant');
      error.statusCode = 400;
      throw error;
    }

    // Check for pending or accepted invitations
    const [existingInvite] = await pool.execute(
      'SELECT invitation_id FROM Invitations WHERE email = ? AND tenant_id = ? AND status IN ("pending", "accepted")',
      [email, tenant_id]
    );

    if (existingInvite.length > 0) {
      const error = new Error('User already invited to this tenant');
      error.statusCode = 400;
      throw error;
    }

    // Get tenant name for email
    const [tenants] = await pool.execute(
      'SELECT name FROM Tenants WHERE tenant_id = ?',
      [tenant_id]
    );

    const tenantName = tenants[0]?.name || 'Our Examination System';

    // Get invited by user name
    let invitedByName = null;
    if (invited_by) {
      const [invitedByUsers] = await pool.execute(
        'SELECT name FROM Users WHERE user_id = ?',
        [invited_by]
      );
      invitedByName = invitedByUsers[0]?.name;
    }

    // Create invitation
    const [result] = await pool.execute(
      `INSERT INTO Invitations (tenant_id, email, assigned_role, invited_by) 
       VALUES (?, ?, ?, ?)`,
      [tenant_id, email, assigned_role || 'student', invited_by]
    );

    const invitationId = result.insertId;

    logger.info('User invitation created', {
      invitation_id: invitationId,
      email,
      tenant_id,
      role: assigned_role,
      invited_by
    });

    // Send invitation email
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invite/${invitationId}`;
    const emailResult = await emailService.sendInvitationEmail(
      email,
      tenantName,
      invitationUrl,
      invitedByName
    );

    if (!emailResult.success) {
      logger.warn('Invitation email failed to send', {
        email,
        error: emailResult.error,
        invitationId
      });
    }

    return {
      invitation_id: invitationId,
      email,
      status: 'pending',
      role: assigned_role,
      emailSent: emailResult.success,
      previewUrl: emailResult.previewUrl // For testing with Ethereal
    };
  }

  /**
   * Check if email has pending invitation in any tenant
   */
  static async getPendingInvitations(email) {
    const [invitations] = await pool.execute(
      `SELECT i.*, t.name as tenant_name 
       FROM Invitations i
       LEFT JOIN Tenants t ON i.tenant_id = t.tenant_id
       WHERE i.email = ? AND i.status = 'pending' AND i.expires_at > NOW()`,
      [email]
    );

    return invitations;
  }

  /**
   * Get single pending invitation by ID (public for invite link page)
   */
  static async getInvitationDetails(invitationId) {
    const [invitations] = await pool.execute(
      `SELECT i.invitation_id, i.email, i.assigned_role, i.status, i.expires_at,
              i.tenant_id, t.name as tenant_name, u.name as invited_by_name
       FROM Invitations i
       LEFT JOIN Tenants t ON i.tenant_id = t.tenant_id
       LEFT JOIN Users u ON i.invited_by = u.user_id
       WHERE i.invitation_id = ?`,
      [invitationId]
    );

    if (invitations.length === 0) {
      const error = new Error('Invitation not found');
      error.statusCode = 404;
      throw error;
    }

    const invitation = invitations[0];

    if (invitation.status === 'accepted') {
      const error = new Error('This invitation has already been used. Please sign in with your Google account.');
      error.statusCode = 409;
      throw error;
    }

    if (invitation.status === 'rejected' || invitation.status === 'expired') {
      const error = new Error('This invitation is no longer valid. Please request a new invitation.');
      error.statusCode = 410;
      throw error;
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      await pool.execute(
        `UPDATE Invitations SET status = 'expired' WHERE invitation_id = ? AND status = 'pending'`,
        [invitationId]
      );
      const error = new Error('This invitation has expired. Please request a new invitation.');
      error.statusCode = 410;
      throw error;
    }

    return invitation;
  }

  /**
   * Accept invitation and create user account
   */
  static async acceptInvitation(invitationId, googleData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get invitation details
      const [invitations] = await connection.execute(
        `SELECT * FROM Invitations WHERE invitation_id = ?`,
        [invitationId]
      );

      if (invitations.length === 0) {
        const error = new Error('Invitation not found');
        error.statusCode = 404;
        throw error;
      }

      const invitation = invitations[0];

      if (invitation.status === 'accepted') {
        const error = new Error('This invitation has already been used. Please sign in instead.');
        error.statusCode = 409;
        throw error;
      }

      if (invitation.status !== 'pending') {
        const error = new Error('This invitation is no longer valid. Please request a new invitation.');
        error.statusCode = 410;
        throw error;
      }

      if (new Date(invitation.expires_at) <= new Date()) {
        await connection.execute(
          `UPDATE Invitations SET status = 'expired' WHERE invitation_id = ? AND status = 'pending'`,
          [invitationId]
        );
        const error = new Error('This invitation has expired. Please request a new invitation.');
        error.statusCode = 410;
        throw error;
      }

      // Verify email matches
      if (invitation.email.toLowerCase() !== googleData.email.toLowerCase()) {
        logger.warn('Invitation email mismatch', {
          invitation_email: invitation.email,
          google_email: googleData.email
        });
        const error = new Error('Email does not match invitation');
        error.statusCode = 400;
        throw error;
      }

      // Create user account
      const [userResult] = await connection.execute(
        `INSERT INTO Users (tenant_id, email, name, role, google_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [invitation.tenant_id, googleData.email, googleData.name, invitation.assigned_role, googleData.id]
      );

      const user_id = userResult.insertId;

      // Mark invitation as accepted
      await connection.execute(
        `UPDATE Invitations SET status = 'accepted', used_at = NOW() WHERE invitation_id = ?`,
        [invitationId]
      );

      await connection.commit();

      logger.info('Invitation accepted', {
        invitation_id: invitationId,
        user_id,
        email: googleData.email,
        tenant_id: invitation.tenant_id
      });

      return {
        user_id,
        email: googleData.email,
        role: invitation.assigned_role,
        tenant_id: invitation.tenant_id
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create new tenant for self-signup user
   */
  static async createSelfServiceTenant(googleData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Create tenant (subdomain from email prefix)
      const emailPrefix = googleData.email.split('@')[0];
      const subdomain = `${emailPrefix}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      const [tenantResult] = await connection.execute(
        `INSERT INTO Tenants (name, subdomain) VALUES (?, ?)`,
        [`${googleData.name}'s Exam System`, subdomain]
      );

      const tenant_id = tenantResult.insertId;

      // Create admin user
      const [userResult] = await connection.execute(
        `INSERT INTO Users (tenant_id, email, name, role, google_id) 
         VALUES (?, ?, ?, 'admin', ?)`,
        [tenant_id, googleData.email, googleData.name, googleData.id]
      );

      const user_id = userResult.insertId;

      await connection.commit();

      logger.info('Self-service tenant created', {
        tenant_id,
        subdomain,
        user_id,
        email: googleData.email
      });

      return {
        user_id,
        email: googleData.email,
        role: 'admin',
        tenant_id,
        is_new_tenant: true
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Log unauthorized login attempt
   */
  static async logUnauthorizedLogin(googleData, ipAddress) {
    await pool.execute(
      `INSERT INTO UnauthorizedLogins (google_id, email, name, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [googleData.id, googleData.email, googleData.name, ipAddress]
    );

    logger.warn('Unauthorized Google login attempt', {
      email: googleData.email,
      google_id: googleData.id,
      ip_address: ipAddress
    });
  }

  /**
   * List invitations for a tenant (admin only)
   */
  static async listInvitations(tenant_id) {
    const [invitations] = await pool.execute(
      `SELECT i.*, u.name as invited_by_name 
       FROM Invitations i
       LEFT JOIN Users u ON i.invited_by = u.user_id
       WHERE i.tenant_id = ?
       ORDER BY i.created_at DESC`,
      [tenant_id]
    );

    return invitations;
  }

  /**
   * Revoke invitation (admin only) - actually deletes it
   */
  static async revokeInvitation(invitationId, tenant_id) {
    const [result] = await pool.execute(
      `DELETE FROM Invitations 
       WHERE invitation_id = ? AND tenant_id = ?`,
      [invitationId, tenant_id]
    );

    if (result.affectedRows === 0) {
      const error = new Error('Invitation not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Invitation revoked', { invitation_id: invitationId });
    return { success: true };
  }
}

module.exports = InvitationService;
