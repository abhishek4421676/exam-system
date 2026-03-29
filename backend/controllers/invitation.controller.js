const InvitationService = require('../services/invitation.service');
const { asyncHandler } = require('../middleware/error.middleware');
const logger = require('../config/logger');

class InvitationController {
  /**
   * Send invitation to new user
   * POST /invitations
   */
  static sendInvitation = asyncHandler(async (req, res) => {
    const { email, assigned_role } = req.body;
    const tenant_id = req.tenant_id;
    const invited_by = req.user.user_id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const invitation = await InvitationService.inviteUser({
      tenant_id,
      email: email.toLowerCase(),
      assigned_role: assigned_role || 'student',
      invited_by
    });

    // TODO: Send email with invitation link
    logger.info('User invited', { email, tenant_id, role: assigned_role, invited_by });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: invitation
    });
  });

  /**
   * Get all invitations for a tenant
   * GET /invitations
   */
  static getInvitations = asyncHandler(async (req, res) => {
    const tenant_id = req.tenant_id;

    const invitations = await InvitationService.listInvitations(tenant_id);

    res.status(200).json({
      success: true,
      data: invitations
    });
  });

  /**
   * Get pending invitations for user (before login)
   * GET /invitations/pending?email=user@example.com
   */
  static getPendingInvitations = asyncHandler(async (req, res) => {
    // Can be called from authenticated user or with email parameter
    const email = req.user?.email || req.query.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const invitations = await InvitationService.getPendingInvitations(email);

    res.status(200).json({
      success: true,
      data: invitations
    });
  });

  /**
   * Get invitation details by invitation ID (public for invite link)
   * GET /invitations/:id/details
   */
  static getInvitationDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const invitation = await InvitationService.getInvitationDetails(id);

    res.status(200).json({
      success: true,
      data: invitation
    });
  });

  /**
   * Revoke invitation (admin only)
   * DELETE /invitations/:id
   */
  static revokeInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenant_id = req.tenant_id;

    const result = await InvitationService.revokeInvitation(id, tenant_id);

    logger.info('Invitation revoked', { invitation_id: id, tenant_id });

    res.status(200).json({
      success: true,
      message: 'Invitation revoked',
      data: result
    });
  });

  /**
   * Accept invitation via invitation ID (for email links)
   * POST /invitations/:id/accept
   * Body can include either:
   * - googleToken (for production Google OAuth)
   * - googleData (for testing/mock scenarios)
   */
  static acceptInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { googleToken, googleData } = req.body;

    let userData;

    // If googleData is provided directly (for testing), use it
    if (googleData && googleData.email && googleData.id) {
      logger.info('Using provided googleData (test mode)', { email: googleData.email });
      userData = await InvitationService.acceptInvitation(id, googleData);
    } 
    // If googleToken is provided, verify it with Google
    else if (googleToken) {
      try {
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const verifiedGoogleData = {
          id: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture
        };

        userData = await InvitationService.acceptInvitation(id, verifiedGoogleData);
      } catch (error) {
        logger.error('Google token verification failed', { error: error.message });
        return res.status(401).json({
          success: false,
          message: 'Invalid Google token'
        });
      }
    } 
    // If neither is provided
    else {
      return res.status(400).json({
        success: false,
        message: 'Either googleToken or googleData is required'
      });
    }

    logger.info('Invitation accepted', {
      invitation_id: id,
      user_id: userData.user_id,
      email: userData.email
    });

    // Generate JWT token for the new user
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        user_id: userData.user_id,
        email: userData.email,
        role: userData.role,
        tenant_id: userData.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Invitation accepted',
      data: {
        ...userData,
        token
      }
    });
  });
}

module.exports = InvitationController;
