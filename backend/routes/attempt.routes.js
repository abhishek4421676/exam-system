const express = require('express');
const router = express.Router();
const AttemptController = require('../controllers/attempt.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isStudent, isTeacher, authorize } = require('../middleware/role.middleware');
const { attemptValidators, idValidator } = require('../middleware/validation.middleware');
const { examSubmissionLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * @route   POST /exams/:id/start
 * @desc    Start exam attempt
 * @access  Student only
 */
router.post('/exams/:id/start', authenticate, isStudent, attemptValidators.startExam, AttemptController.startExam);

/**
 * @route   GET /exams/:id/questions
 * @desc    Get exam questions
 * @access  Student only
 */
router.get('/exams/:id/questions', authenticate, isStudent, idValidator, AttemptController.getExamQuestions);

/**
 * @route   POST /exams/:id/save-answer
 * @desc    Save answer
 * @access  Student only
 */
router.post('/exams/:id/save-answer', authenticate, isStudent, attemptValidators.saveAnswer, AttemptController.saveAnswer);

/**
 * @route   POST /exams/:id/submit
 * @desc    Submit exam
 * @access  Student only
 */
router.post('/exams/:id/submit', authenticate, isStudent, examSubmissionLimiter, attemptValidators.submitExam, AttemptController.submitExam);

/**
 * @route   GET /exams/:id/active-attempt
 * @desc    Get active attempt for exam
 * @access  Student only
 */
router.get('/exams/:id/active-attempt', authenticate, isStudent, idValidator, AttemptController.getActiveAttempt);

/**
 * @route   GET /exams/:id/attempts
 * @desc    Get attempts for an exam (for results view)
 * @access  Teacher/Tenant Admin/Admin
 */
router.get('/exams/:id/attempts', authenticate, authorize('admin', 'tenant_admin', 'teacher'), idValidator, AttemptController.getExamAttempts);

/**
 * @route   GET /student/attempts
 * @desc    Get all student attempts
 * @access  Student only
 */
router.get('/student/attempts', authenticate, isStudent, AttemptController.getStudentAttempts);

/**
 * @route   GET /attempts/:id
 * @desc    Get attempt details
 * @access  Private
 */
router.get('/attempts/:id', authenticate, authorize('admin', 'tenant_admin', 'teacher', 'student'), idValidator, AttemptController.getAttemptDetails);

/**
 * @route   POST /attempts/:id/evaluate
 * @desc    Evaluate attempt
 * @access  Admin only
 */
router.post('/attempts/:id/evaluate', authenticate, isTeacher, idValidator, AttemptController.evaluateAttempt);

/**
 * @route   GET /attempts/:id/report
 * @desc    Get evaluation report
 * @access  Private
 */
router.get('/attempts/:id/report', authenticate, authorize('admin', 'tenant_admin', 'teacher', 'student'), idValidator, AttemptController.getEvaluationReport);

/**
 * @route   GET /teacher/pending-descriptive
 * @desc    Get pending descriptive answers for teacher
 * @access  Teacher only
 */
router.get('/teacher/pending-descriptive', authenticate, isTeacher, AttemptController.getPendingDescriptiveAnswers);

/**
 * @route   POST /teacher/grade-answer
 * @desc    Grade a descriptive answer
 * @access  Teacher only
 */
router.post('/teacher/grade-answer', authenticate, isTeacher, attemptValidators.gradeAnswer, AttemptController.gradeDescriptiveAnswer);

module.exports = router;
