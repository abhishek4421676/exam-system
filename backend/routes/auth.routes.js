const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authValidators } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * @route   POST /auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authLimiter, authValidators.register, AuthController.register);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, authValidators.login, AuthController.login);

/**
 * @route   POST /auth/google
 * @desc    Login with Google OAuth
 * @access  Public
 */
router.post('/google', authLimiter, AuthController.googleAuth);

/**
 * @route   GET /auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, AuthController.updateProfile);

/**
 * @route   POST /auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticate, authValidators.changePassword, AuthController.changePassword);

module.exports = router;
