const express = require('express');
const router = express.Router();
const ExamController = require('../controllers/exam.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { examValidators, idValidator } = require('../middleware/validation.middleware');
const { checkCanCreateExam, checkExamOwnership } = require('../middleware/authorize.middleware');

/**
 * @route   POST /exams
 * @desc    Create new exam
 * @access  Admin/Teacher
 */
router.post('/', authenticate, checkCanCreateExam, examValidators.create, ExamController.createExam);

/**
 * @route   GET /exams
 * @desc    Get all exams (role-aware: admin=all, teacher=own, student=published)
 * @access  Private
 */
router.get('/', authenticate, authorize('teacher', 'student'), ExamController.getAllExams);

/**
 * @route   GET /exams/published
 * @desc    Get published exams (for students)
 * @access  Private
 */
router.get('/published', authenticate, ExamController.getPublishedExams);

/**
 * @route   GET /exams/:id
 * @desc    Get exam by ID
 * @access  Private
 */
router.get('/:id', authenticate, authorize('teacher', 'student'), idValidator, ExamController.getExamById);

/**
 * @route   PUT /exams/:id
 * @desc    Update exam
 * @access  Admin/Owner Teacher
 */
router.put('/:id', authenticate, checkExamOwnership, examValidators.update, ExamController.updateExam);

/**
 * @route   DELETE /exams/:id
 * @desc    Delete exam
 * @access  Admin/Owner Teacher
 */
router.delete('/:id', authenticate, checkExamOwnership, idValidator, ExamController.deleteExam);

/**
 * @route   POST /exams/:examId/questions
 * @desc    Add questions to exam
 * @access  Admin/Owner Teacher
 */
router.post('/:examId/questions', authenticate, checkExamOwnership, examValidators.addQuestions, ExamController.addQuestions);

/**
 * @route   DELETE /exams/:examId/questions/:questionId
 * @desc    Remove question from exam
 * @access  Admin/Owner Teacher
 */
router.delete('/:examId/questions/:questionId', authenticate, checkExamOwnership, ExamController.removeQuestion);

/**
 * @route   PUT /exams/:id/publish
 * @desc    Publish exam
 * @access  Admin/Owner Teacher
 */
router.put('/:id/publish', authenticate, checkExamOwnership, idValidator, ExamController.publishExam);

/**
 * @route   PUT /exams/:id/question-banks
 * @desc    Configure question banks for exam
 * @access  Admin/Owner Teacher
 */
router.put('/:id/question-banks', authenticate, checkExamOwnership, idValidator, ExamController.setQuestionBanks);

/**
 * @route   GET /exams/:id/question-banks
 * @desc    Get question banks configured for exam
 * @access  Admin/Owner Teacher
 */
router.get('/:id/question-banks', authenticate, checkExamOwnership, idValidator, ExamController.getQuestionBanks);

/**
 * @route   GET /exams/:id/analytics
 * @desc    Get exam analytics
 * @access  Admin/Owner Teacher
 */
router.get('/:id/analytics', authenticate, checkExamOwnership, idValidator, ExamController.getAnalytics);

module.exports = router;
