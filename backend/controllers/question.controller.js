const QuestionService = require('../services/question.service');
const { asyncHandler } = require('../middleware/error.middleware');
const logger = require('../config/logger');

class QuestionController {
  /**
   * Create question (Admin/Teacher)
   * POST /questions
   */
  static createQuestion = asyncHandler(async (req, res) => {
    const questionData = req.body;

    logger.info('Creating new question', {
      creator_id: req.user.user_id,
      role: req.user.role,
      question_type: questionData.question_type
    });

    const question = await QuestionService.createQuestion(questionData, req.tenant_id, req.user.user_id);

    logger.info('Question created successfully', {
      question_id: question.question_id,
      question_type: question.question_type
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });
  });

  /**
   * Get all questions (role-aware)
   * GET /questions
   */
  static getAllQuestions = asyncHandler(async (req, res) => {
    const filters = {};

    if (req.query.question_type) {
      filters.question_type = req.query.question_type;
    }

    // Pass user for role-based filtering
    const questions = await QuestionService.getAllQuestions(req.tenant_id, req.user, filters);

    res.status(200).json({
      success: true,
      data: questions
    });
  });

  /**
   * Get question by ID (Admin only)
   * GET /questions/:id
   */
  static getQuestionById = asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const question = await QuestionService.getQuestionById(questionId, req.tenant_id);

    res.status(200).json({
      success: true,
      data: question
    });
  });

  /**
   * Update question (Admin only)
   * PUT /questions/:id
   */
  static updateQuestion = asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const updates = req.body;

    logger.info('Updating question', {
      admin_id: req.user.user_id,
      question_id: questionId
    });

    const question = await QuestionService.updateQuestion(questionId, updates, req.tenant_id);

    logger.info('Question updated successfully', { question_id: questionId });

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });
  });

  /**
   * Delete question (Admin only)
   * DELETE /questions/:id
   */
  static deleteQuestion = asyncHandler(async (req, res) => {
    const questionId = req.params.id;

    logger.warn('Deleting question', {
      admin_id: req.user.user_id,
      question_id: questionId
    });

    await QuestionService.deleteQuestion(questionId, req.tenant_id);

    logger.info('Question deleted successfully', { question_id: questionId });

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  });

  /**
   * Bulk create questions from JSON array (Admin only)
   * POST /questions/bulk
   */
  static bulkCreateQuestions = asyncHandler(async (req, res) => {
    const { questions } = req.body;

    logger.info('Bulk creating questions', {
      admin_id: req.user.user_id,
      count: questions.length
    });

    const result = await QuestionService.bulkCreateQuestions(questions, req.tenant_id, req.user.user_id);

    logger.info('Bulk creation completed', {
      created: result.created.length,
      errors: result.errors.length
    });

    res.status(201).json({
      success: true,
      message: `${result.created.length} questions created successfully`,
      data: {
        created_count: result.created.length,
        error_count: result.errors.length,
        created: result.created,
        errors: result.errors
      }
    });
  });

  /**
   * Create question bank
   * POST /questions/banks
   */
  static createQuestionBank = asyncHandler(async (req, res) => {
    const bank = await QuestionService.createQuestionBank(req.body, req.tenant_id, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Question bank created successfully',
      data: bank
    });
  });

  /**
   * Get question banks
   * GET /questions/banks
   */
  static getQuestionBanks = asyncHandler(async (req, res) => {
    const banks = await QuestionService.getQuestionBanks(req.tenant_id, req.user);

    res.status(200).json({
      success: true,
      data: banks
    });
  });

  /**
   * Delete question bank (detaches questions, does not delete them)
   * DELETE /questions/banks/:id
   */
  static deleteQuestionBank = asyncHandler(async (req, res) => {
    await QuestionService.deleteQuestionBank(req.params.id, req.tenant_id, req.user.user_id);

    res.status(200).json({
      success: true,
      message: 'Question bank deleted. Questions have been kept and unlinked from the bank.'
    });
  });

  /**
   * Assign existing questions to a bank
   * POST /questions/banks/:id/assign
   */
  static assignQuestionsToBank = asyncHandler(async (req, res) => {
    const { question_ids } = req.body;
    const result = await QuestionService.assignQuestionsToBank(req.params.id, req.tenant_id, question_ids);

    res.status(200).json({
      success: true,
      message: `${result.assigned} question(s) added to the bank`,
      data: result
    });
  });
}

module.exports = QuestionController;
