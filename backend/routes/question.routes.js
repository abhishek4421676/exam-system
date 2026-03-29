const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/question.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isTeacher } = require('../middleware/role.middleware');
const { questionValidators, idValidator } = require('../middleware/validation.middleware');
const { checkCanCreateQuestion, checkQuestionOwnership } = require('../middleware/authorize.middleware');

/**
 * @route   POST /questions
 * @desc    Create new question
 * @access  Teacher only
 */
router.post('/', authenticate, checkCanCreateQuestion, questionValidators.create, QuestionController.createQuestion);

/**
 * @route   POST /questions/bulk
 * @desc    Bulk create questions
 * @access  Teacher only
 */
router.post('/bulk', authenticate, isTeacher, QuestionController.bulkCreateQuestions);

/**
 * @route   GET /questions
 * @desc    Get all questions
 * @access  Teacher only
 */
router.get('/', authenticate, isTeacher, QuestionController.getAllQuestions);

/**
 * @route   POST /questions/banks
 * @desc    Create question bank
 * @access  Teacher only
 */
router.post('/banks', authenticate, isTeacher, QuestionController.createQuestionBank);

/**
 * @route   GET /questions/banks
 * @desc    Get all question banks
 * @access  Teacher only
 */
router.get('/banks', authenticate, isTeacher, QuestionController.getQuestionBanks);

/**
 * @route   DELETE /questions/banks/:id
 * @desc    Delete a question bank (questions are kept, just unlinked)
 * @access  Teacher only (owner)
 */
router.delete('/banks/:id', authenticate, isTeacher, QuestionController.deleteQuestionBank);

/**
 * @route   POST /questions/banks/:id/assign
 * @desc    Assign existing questions to a bank
 * @access  Teacher only
 */
router.post('/banks/:id/assign', authenticate, isTeacher, QuestionController.assignQuestionsToBank);

/**
 * @route   GET /questions/:id
 * @desc    Get question by ID
 * @access  Teacher only
 */
router.get('/:id', authenticate, isTeacher, idValidator, QuestionController.getQuestionById);

/**
 * @route   PUT /questions/:id
 * @desc    Update question
 * @access  Owner Teacher only
 */
router.put('/:id', authenticate, checkQuestionOwnership, questionValidators.update, QuestionController.updateQuestion);

/**
 * @route   DELETE /questions/:id
 * @desc    Delete question
 * @access  Owner Teacher only
 */
router.delete('/:id', authenticate, checkQuestionOwnership, idValidator, QuestionController.deleteQuestion);

module.exports = router;
