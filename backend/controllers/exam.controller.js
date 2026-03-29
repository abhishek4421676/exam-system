const ExamService = require('../services/exam.service');
const StudentExamAttempt = require('../models/StudentExamAttempt');
const { asyncHandler } = require('../middleware/error.middleware');
const logger = require('../config/logger');

class ExamController {
  /**
   * Create new exam (Admin/Teacher)
   * POST /exams
   */
  static createExam = asyncHandler(async (req, res) => {
    const { title, description, duration_minutes, total_marks, status } = req.body;

    logger.info('Creating exam', { 
      creator_id: req.user.user_id, 
      role: req.user.role,
      title 
    });

    const exam = await ExamService.createExam(
      { title, description, duration_minutes, total_marks, status },
      req.user.user_id,
      req.tenant_id
    );

    logger.info('Exam created successfully', { 
      exam_id: exam.exam_id, 
      creator_id: req.user.user_id 
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  });

  /**
   * Get all exams (role-aware filtering)
   * GET /exams
   */
  static getAllExams = asyncHandler(async (req, res) => {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }

    // Pass user to service for role-based filtering
    const exams = await ExamService.getAllExams(req.tenant_id, req.user, filters);

    res.status(200).json({
      success: true,
      data: exams
    });
  });

  /**
   * Get published exams (for students)
   * GET /exams/published
   */
  static getPublishedExams = asyncHandler(async (req, res) => {
    const exams = await ExamService.getPublishedExams(req.tenant_id, req.user);

    res.status(200).json({
      success: true,
      data: exams
    });
  });

  /**
   * Get exam by ID
   * GET /exams/:id
   */
  static getExamById = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const exam = await ExamService.getExamById(examId, req.tenant_id);

    res.status(200).json({
      success: true,
      data: exam
    });
  });

  /**
   * Update exam (Admin/Owner Teacher)
   * PUT /exams/:id
   */
  static updateExam = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const updates = req.body;

    logger.info('Updating exam', { exam_id: examId, user_id: req.user.user_id, role: req.user.role });

    const exam = await ExamService.updateExam(examId, req.tenant_id, updates);

    res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: exam
    });
  });

  /**
   * Delete exam (Admin/Owner Teacher)
   * DELETE /exams/:id
   */
  static deleteExam = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    
    logger.info('Deleting exam', { exam_id: examId, user_id: req.user.user_id, role: req.user.role });
    
    await ExamService.deleteExam(examId, req.tenant_id);

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully'
    });
  });

  /**
   * Add questions to exam (Admin/Owner Teacher)
   * POST /exams/:examId/questions
   */
  static addQuestions = asyncHandler(async (req, res) => {
    const examId = req.params.examId;
    const { question_ids } = req.body;

    logger.info('Adding questions to exam', { 
      exam_id: examId, 
      question_count: question_ids.length,
      user_id: req.user.user_id,
      role: req.user.role
    });

    const exam = await ExamService.addQuestionsToExam(examId, question_ids, req.tenant_id);

    logger.info('Questions added successfully', { 
      exam_id: examId, 
      question_count: question_ids.length 
    });

    res.status(200).json({
      success: true,
      message: 'Questions added to exam successfully',
      data: exam
    });
  });

  /**
   * Remove question from exam (Admin only)
   * DELETE /exams/:examId/questions/:questionId
   */
  static removeQuestion = asyncHandler(async (req, res) => {
    const { examId, questionId } = req.params;
    await ExamService.removeQuestionFromExam(examId, questionId, req.tenant_id);

    res.status(200).json({
      success: true,
      message: 'Question removed from exam successfully'
    });
  });

  /**
   * Publish exam (Admin only)
   * POST /exams/:id/publish
   */
  static publishExam = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    await ExamService.publishExam(examId, req.tenant_id);

    res.status(200).json({
      success: true,
      message: 'Exam published successfully'
    });
  });

  /**
   * Get exam analytics (Admin only)
   * GET /exams/:id/analytics
   */
  static getAnalytics = asyncHandler(async (req, res) => {
    const examId = req.params.id;

    // Get all attempts for the exam
    const attempts = await StudentExamAttempt.findByExamId(examId, req.tenant_id);

    // Filter evaluated attempts
    const evaluatedAttempts = attempts.filter(a => a.status === 'evaluated');

    if (evaluatedAttempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          exam_id: examId,
          total_attempts: attempts.length,
          evaluated_attempts: 0,
          average_score: 0,
          highest_score: 0,
          lowest_score: 0,
          pass_rate: 0
        }
      });
    }

    // Calculate analytics
    const scores = evaluatedAttempts.map(a => parseFloat(a.total_score));
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Get exam details for pass percentage
    const exam = await ExamService.getExamById(examId, req.tenant_id);
    const passMark = exam.total_marks * 0.4; // 40% pass mark
    const passedCount = scores.filter(score => score >= passMark).length;
    const passRate = (passedCount / evaluatedAttempts.length) * 100;

    res.status(200).json({
      success: true,
      data: {
        exam_id: examId,
        exam_title: exam.title,
        total_marks: exam.total_marks,
        total_attempts: attempts.length,
        evaluated_attempts: evaluatedAttempts.length,
        average_score: averageScore.toFixed(2),
        highest_score: highestScore,
        lowest_score: lowestScore,
        pass_rate: passRate.toFixed(2) + '%',
        attempts: evaluatedAttempts.map(a => ({
          student_name: a.student_name,
          total_score: a.total_score,
          percentage: ((a.total_score / exam.total_marks) * 100).toFixed(2) + '%',
          start_time: a.start_time,
          end_time: a.end_time
        }))
      }
    });
  });

  /**
   * Configure question banks for exam
   * PUT /exams/:id/question-banks
   */
  static setQuestionBanks = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const bankConfigs = req.body?.bank_configs || [];

    const data = await ExamService.setQuestionBanksForExam(
      examId,
      bankConfigs,
      req.tenant_id,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Question banks configured successfully',
      data
    });
  });

  /**
   * Get question banks assigned to exam
   * GET /exams/:id/question-banks
   */
  static getQuestionBanks = asyncHandler(async (req, res) => {
    const examId = req.params.id;

    const data = await ExamService.getQuestionBanksForExam(examId, req.tenant_id, req.user);

    res.status(200).json({
      success: true,
      data
    });
  });
}

module.exports = ExamController;
