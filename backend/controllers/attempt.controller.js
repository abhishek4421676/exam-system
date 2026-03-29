const AttemptService = require('../services/attempt.service');
const EvaluationService = require('../services/evaluation.service');
const Exam = require('../models/Exam');
const StudentExamAttempt = require('../models/StudentExamAttempt');
const { asyncHandler } = require('../middleware/error.middleware');
const logger = require('../config/logger');

class AttemptController {
  /**
   * Start exam attempt (Student)
   * POST /exams/:id/start
   */
  static startExam = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const studentId = req.user.user_id;

    logger.info('Student starting exam', { student_id: studentId, exam_id: examId });

    const attempt = await AttemptService.startExam(examId, studentId, req.tenant_id);

    logger.info('Exam started successfully', { 
      attempt_id: attempt.attempt_id,
      student_id: studentId,
      exam_id: examId 
    });

    res.status(201).json({
      success: true,
      message: 'Exam started successfully',
      data: attempt
    });
  });

  /**
   * Get exam questions (Student)
   * GET /exams/:id/questions
   */
  static getExamQuestions = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const studentId = req.user.user_id;

    const data = await AttemptService.getExamQuestions(examId, studentId, req.tenant_id);

    res.status(200).json({
      success: true,
      data
    });
  });

  /**
   * Save answer (Student)
   * POST /exams/:id/save-answer
   */
  static saveAnswer = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const studentId = req.user.user_id;
    const { attempt_id, question_id, selected_option_id, numeric_answer, descriptive_answer } = req.body;

    const result = await AttemptService.saveAnswer(
      attempt_id,
      studentId,
      { question_id, selected_option_id, numeric_answer, descriptive_answer },
      req.tenant_id
    );

    logger.info('Answer saved', { 
      attempt_id, 
      question_id,
      student_id: studentId 
    });

    res.status(200).json({
      success: true,
      message: 'Answer saved successfully',
      data: result
    });
  });

  /**
   * Submit exam (Student)
   * POST /exams/:id/submit
   */
  static submitExam = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const studentId = req.user.user_id;
    const { attempt_id } = req.body;

    logger.info('Student submitting exam', { 
      attempt_id,
      student_id: studentId,
      exam_id: examId 
    });

    await AttemptService.submitExam(attempt_id, studentId, req.tenant_id);

    // Auto-evaluate the exam
    try {
      const evaluationResult = await EvaluationService.evaluateAttempt(attempt_id, req.tenant_id);
      
      logger.info('Exam submitted and evaluated', { 
        attempt_id,
        score: evaluationResult.score_obtained 
      });
      
      res.status(200).json({
        success: true,
        message: 'Exam submitted and evaluated successfully',
        data: evaluationResult
      });
    } catch (error) {
      logger.error('Evaluation failed after submission', { 
        attempt_id,
        error: error.message 
      });
      
      // If evaluation fails, still return success for submission
      res.status(200).json({
        success: true,
        message: 'Exam submitted successfully. Evaluation will be done by admin.',
        data: { attempt_id }
      });
    }
  });

  /**
   * Get student's attempts (Student)
   * GET /student/attempts
   */
  static getStudentAttempts = asyncHandler(async (req, res) => {
    const studentId = req.user.user_id;
    const attempts = await AttemptService.getStudentAttempts(studentId, req.tenant_id);

    res.status(200).json({
      success: true,
      data: attempts
    });
  });

  /**
   * Get attempt details (Student)
   * GET /attempts/:id
   */
  static getAttemptDetails = asyncHandler(async (req, res) => {
    const attemptId = req.params.id;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    let attempt;
    if (userRole === 'student') {
      attempt = await AttemptService.getAttemptDetails(attemptId, userId, req.tenant_id);
    } else if (userRole === 'teacher') {
      const rawAttempt = await StudentExamAttempt.findById(attemptId, req.tenant_id);
      if (!rawAttempt) {
        return res.status(404).json({
          success: false,
          message: 'Attempt not found'
        });
      }

      const ownsExam = await Exam.verifyOwnership(rawAttempt.exam_id, req.tenant_id, userId);
      if (!ownsExam) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      attempt = await AttemptService.getAttemptDetails(attemptId, rawAttempt.student_id, req.tenant_id);
    } else if (userRole === 'tenant_admin' || userRole === 'admin') {
      const rawAttempt = await StudentExamAttempt.findById(attemptId, req.tenant_id);
      if (!rawAttempt) {
        return res.status(404).json({
          success: false,
          message: 'Attempt not found'
        });
      }

      attempt = await AttemptService.getAttemptDetails(attemptId, rawAttempt.student_id, req.tenant_id);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: attempt
    });
  });

  /**
   * Get active attempt (Student)
   * GET /exams/:id/active-attempt
   */
  static getActiveAttempt = asyncHandler(async (req, res) => {
    const examId = req.params.id;
    const studentId = req.user.user_id;

    const attempt = await AttemptService.getActiveAttempt(examId, studentId, req.tenant_id);

    res.status(200).json({
      success: true,
      data: attempt
    });
  });

  /**
   * Get attempts for an exam (Teacher/Admin/Tenant Admin)
   * GET /exams/:id/attempts
   */
  static getExamAttempts = asyncHandler(async (req, res) => {
    const examId = req.params.id;

    const data = await AttemptService.getExamAttempts(
      examId,
      req.user.user_id,
      req.user.role,
      req.tenant_id
    );

    res.status(200).json({
      success: true,
      data
    });
  });

  /**
   * Evaluate attempt (Admin)
   * POST /attempts/:id/evaluate
   */
  static evaluateAttempt = asyncHandler(async (req, res) => {
    const attemptId = req.params.id;

    logger.info('Admin evaluating attempt', { 
      admin_id: req.user.user_id,
      attempt_id: attemptId 
    });

    const result = await EvaluationService.evaluateAttempt(attemptId, req.tenant_id);

    logger.info('Attempt evaluated successfully', { 
      attempt_id: attemptId,
      score: result.score_obtained 
    });

    res.status(200).json({
      success: true,
      message: 'Attempt evaluated successfully',
      data: result
    });
  });

  /**
   * Get evaluation report (Student/Admin)
   * GET /attempts/:id/report
   */
  static getEvaluationReport = asyncHandler(async (req, res) => {
    const attemptId = req.params.id;

    const report = await EvaluationService.getEvaluationReport(attemptId, req.tenant_id);

    if (req.user.role === 'student' && Number(report.student_id) !== Number(req.user.user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'teacher') {
      const ownsExam = await Exam.verifyOwnership(report.exam_id, req.tenant_id, req.user.user_id);
      if (!ownsExam) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    if (!['student', 'teacher', 'tenant_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  });

  /**
   * Get pending descriptive answers (Teacher)
   * GET /teacher/pending-descriptive
   */
  static getPendingDescriptiveAnswers = asyncHandler(async (req, res) => {
    const teacherId = req.user.user_id;
    const { exam_id } = req.query;

    const answers = await EvaluationService.getPendingDescriptiveAnswers(
      teacherId,
      req.tenant_id,
      exam_id ? Number(exam_id) : null
    );

    res.status(200).json({
      success: true,
      data: answers
    });
  });

  /**
   * Grade descriptive answer (Teacher)
   * POST /teacher/grade-answer
   */
  static gradeDescriptiveAnswer = asyncHandler(async (req, res) => {
    const teacherId = req.user.user_id;
    const { student_answer_id, marks_awarded } = req.body;

    const result = await EvaluationService.gradeDescriptiveAnswer(
      Number(student_answer_id),
      Number(marks_awarded),
      req.tenant_id,
      teacherId
    );

    res.status(200).json({
      success: true,
      message: 'Answer graded successfully',
      data: result
    });
  });
}

module.exports = AttemptController;
