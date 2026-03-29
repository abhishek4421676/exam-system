const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isTenantAdmin } = require('../middleware/role.middleware');

router.get('/settings', authenticate, isTenantAdmin, TenantController.getSettings);
router.put('/settings', authenticate, isTenantAdmin, TenantController.updateSettings);
router.get('/users', authenticate, isTenantAdmin, TenantController.listUsers);
router.post('/users/invite', authenticate, isTenantAdmin, TenantController.inviteUser);
router.delete('/users/:id', authenticate, isTenantAdmin, TenantController.removeUser);
router.get('/exam-assignments/exams', authenticate, isTenantAdmin, TenantController.listExamsForAssignment);
router.get('/exam-assignments/exams/:examId/students', authenticate, isTenantAdmin, TenantController.listStudentsForExam);
router.put('/exam-assignments/exams/:examId/students', authenticate, isTenantAdmin, TenantController.assignStudentsToExam);

module.exports = router;
