const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt.util');
const logger = require('../config/logger');
const InvitationService = require('./invitation.service');

class AuthService {
  /**
   * Register new user
   */
  static async register(userData, tenant) {
    const { name, email, password, role } = userData;
    const tenantId = tenant.tenant_id;

    try {
      // Check if email already exists
      const existingUser = await User.findByEmail(email.toLowerCase(), tenantId);
      if (existingUser) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = await User.create({
        tenant_id: tenantId,
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || 'student'
      });

      // Get created user (without password)
      const user = await User.findById(userId, tenantId);

      // Generate JWT token
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        name: user.name,
        tenant_id: user.tenant_id,
        tenant_subdomain: tenant.subdomain
      });

      return {
        user: {
          user_id: user.user_id,
          tenant_id: user.tenant_id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      logger.error('Registration failed', { 
        email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(credentials, tenant) {
    const { email, password } = credentials;
    const tenantId = tenant.tenant_id;

    try {
      // Find user by email (case-insensitive)
      const user = await User.findByEmail(email.toLowerCase(), tenantId);
      if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Check if user has password (OAuth-only users won't have one)
      if (!user.password_hash) {
        logger.warn('Failed login attempt - user has no password (OAuth user)', { email });
        const error = new Error('This account uses Google Sign-In. Please use Google login instead.');
        error.statusCode = 401;
        throw error;
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn('Failed login attempt - invalid password', { email });
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Generate JWT token
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        name: user.name,
        tenant_id: user.tenant_id,
        tenant_subdomain: tenant.subdomain
      });

      return {
        user: {
          user_id: user.user_id,
          tenant_id: user.tenant_id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      logger.error('Login failed', { 
        email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId, tenantId) {
    const user = await User.findById(userId, tenantId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, tenantId, updates) {
    // If password is being updated, hash it
    if (updates.password) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      updates.password_hash = await bcrypt.hash(updates.password, saltRounds);
      delete updates.password;
    }

    const updated = await User.update(userId, tenantId, updates);
    if (!updated) {
      throw new Error('Failed to update profile');
    }

    return await User.findById(userId, tenantId);
  }

  /**
   * Change password
   */
  static async changePassword(userId, tenantId, oldPassword, newPassword) {
    const profile = await User.findById(userId, tenantId);
    const user = await User.findByEmail(profile.email, tenantId);
    
    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.update(userId, tenantId, { password_hash });
    return true;
  }

  /**
   * Google OAuth login
   */
  /**
   * Google OAuth login - Multi-tenant aware
   * Handles: 1) Invited users, 2) Self-service signup, 3) Existing users
   */
  static async googleAuth(googleToken, tenant, requestContext = {}) {
    const { OAuth2Client } = require('google-auth-library');
    const tenantId = tenant?.tenant_id;

    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const googleData = { 
        id: payload.sub, 
        email: payload.email.toLowerCase(), 
        name: payload.name || payload.email.split('@')[0]
      };

      // FLOW 1: User already exists in this tenant
      if (tenantId) {
        let user = await User.findByEmail(googleData.email, tenantId);
        
        if (user) {
          // Link Google ID if not already linked
          if (!user.google_id) {
            await User.update(user.user_id, tenantId, { google_id: googleData.id });
          }
          
          return this._generateAuthResponse(user, tenant);
        }
      }

      // FLOW 2: Check for pending invitations in any tenant
      const pendingInvitations = await InvitationService.getPendingInvitations(googleData.email);
      
      if (pendingInvitations.length > 0) {
        // If multiple invitations, user should select which to accept
        // For now, accept the first one (could improve UX with selection screen)
        const invitation = pendingInvitations[0];
        
        const userData = await InvitationService.acceptInvitation(
          invitation.invitation_id,
          googleData
        );

        // Fetch complete user details
        const user = await User.findById(userData.user_id, userData.tenant_id);
        const userTenant = { tenant_id: userData.tenant_id };

        logger.info('User accepted invitation via Google', {
          user_id: userData.user_id,
          email: googleData.email,
          tenant_id: invitation.tenant_id
        });

        return this._generateAuthResponse(user, userTenant);
      }

      // FLOW 3: Self-service signup (create new tenant)
      // This should only work if explicitly allowed/requested
      if (requestContext.allowSelfSignup === true) {
        const userData = await InvitationService.createSelfServiceTenant(googleData);
        const user = await User.findById(userData.user_id, userData.tenant_id);
        const userTenant = { tenant_id: userData.tenant_id };

        logger.info('Self-service tenant created via Google', {
          user_id: userData.user_id,
          email: googleData.email,
          tenant_id: userData.tenant_id
        });

        return {
          ...this._generateAuthResponse(user, userTenant),
          is_new_account: true,
          is_new_tenant: true
        };
      }

      // FLOW 4: Unauthorized login attempt
      // User tried to login with Google but has no invite and no self-service allowed
      await InvitationService.logUnauthorizedLogin(googleData, requestContext.ipAddress);

      const error = new Error(
        'No account found. Ask your tenant admin to invite you, or sign up with email.'
      );
      error.statusCode = 403;
      error.code = 'NO_INVITATION';
      throw error;

    } catch (error) {
      if (error.code === 'NO_INVITATION') {
        throw error;
      }
      logger.error('Google OAuth failed', { error: error.message });
      const err = new Error('Invalid Google token or authentication failed');
      err.statusCode = 401;
      throw err;
    }
  }

  /**
   * Helper to generate auth response
   */
  static _generateAuthResponse(user, tenant) {
    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      tenant_id: user.tenant_id,
      tenant_subdomain: tenant.subdomain
    });

    return {
      user: {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    };
  }
}

module.exports = AuthService;
