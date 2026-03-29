const AuthService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/error.middleware');
const logger = require('../config/logger');

class AuthController {
  /**
   * Register new user
   * POST /auth/register
   */
  static register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    logger.info('User registration attempt', { email, role: role || 'student' });

    const result = await AuthService.register({ name, email, password, role }, req.tenant);

    logger.info('User registered successfully', { 
      user_id: result.user.user_id, 
      email: result.user.email 
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  });

  /**
   * Login user
   * POST /auth/login
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('Login attempt', { email, ip: req.ip });

    const result = await AuthService.login({ email, password }, req.tenant);

    logger.info('Login successful', { 
      user_id: result.user.user_id, 
      email: result.user.email,
      role: result.user.role 
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  /**
   * Get current user profile
   * GET /auth/profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = await AuthService.getProfile(req.user.user_id, req.tenant_id);

    res.status(200).json({
      success: true,
      data: user
    });
  });

  /**
   * Update user profile
   * PUT /auth/profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const updates = req.body;
    
    // Don't allow role update through this endpoint
    delete updates.role;

    const user = await AuthService.updateProfile(req.user.user_id, req.tenant_id, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  });

  /**
   * Change password
   * POST /auth/change-password
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    logger.info('Password change request', { user_id: req.user.user_id });

    await AuthService.changePassword(req.user.user_id, req.tenant_id, oldPassword, newPassword);

    logger.info('Password changed successfully', { user_id: req.user.user_id });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  /**
   * Google OAuth login
   * POST /auth/google
   * Body: { token, invite_id?, allow_self_signup? }
   */
  static googleAuth = asyncHandler(async (req, res) => {
    const { token, allow_self_signup } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    logger.info('Google OAuth login attempt');

    // Pass request context
    const requestContext = {
      ipAddress: req.ip || req.connection.remoteAddress,
      allowSelfSignup: allow_self_signup === true
    };

    const result = await AuthService.googleAuth(token, req.tenant, requestContext);

    logger.info('Google OAuth login successful', {
      user_id: result.user.user_id,
      email: result.user.email,
      role: result.user.role,
      is_new_account: result.is_new_account || false
    });

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: result
    });
  });
}

module.exports = AuthController;
