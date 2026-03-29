const express = require('express');
const router = express.Router();
const InvitationController = require('../controllers/invitation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isTenantAdmin } = require('../middleware/role.middleware');
const { idValidator } = require('../middleware/validation.middleware');

/**
 * @route   POST /invitations
 * @desc    Send invitation to new user
 * @access  Admin
 */
router.post('/', authenticate, isTenantAdmin, InvitationController.sendInvitation);

/**
 * @route   GET /invitations
 * @desc    Get all invitations for tenant
 * @access  Admin
 */
router.get('/', authenticate, isTenantAdmin, InvitationController.getInvitations);

/**
 * @route   GET /invitations/pending
 * @desc    Get pending invitations for logged-in user
 * @access  Public (before login)
 */
router.get('/pending', InvitationController.getPendingInvitations);

/**
 * @route   GET /invitations/:id/details
 * @desc    Get invitation details by link ID
 * @access  Public (before login)
 */
router.get('/:id/details', idValidator, InvitationController.getInvitationDetails);

/**
 * @route   DELETE /invitations/:id
 * @desc    Revoke invitation
 * @access  Admin
 */
router.delete('/:id', authenticate, isTenantAdmin, idValidator, InvitationController.revokeInvitation);

/**
 * @route   POST /invitations/:id/accept
 * @desc    Accept invitation (via email link)
 * @access  Public (before login)
 */
router.post('/:id/accept', idValidator, InvitationController.acceptInvitation);

module.exports = router;
