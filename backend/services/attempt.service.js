const StudentExamAttempt = require('../models/StudentExamAttempt');
const StudentAnswer = require('../models/StudentAnswer');
const Exam = require('../models/Exam');
const ExamQuestion = require('../models/ExamQuestion');
const StudentExamAssignment = require('../models/StudentExamAssignment');
const logger = require('../config/logger');

class AttemptService {
  /**
   * Start exam attempt
   */
  static async startExam(examId, studentId, tenantId) {
    // Check if exam exists and is published
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      logger.warn('Exam not found for attempt', { exam_id: examId, student_id: studentId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    if (exam.status !== 'published') {
      logger.warn('Attempt to start unpublished exam', { exam_id: examId, status: exam.status });
      const error = new Error('Exam is not available for attempt');
      error.statusCode = 400;
      throw error;
    }

    const isAssigned = await StudentExamAssignment.isAssigned(tenantId, examId, studentId);
    if (!isAssigned) {
      logger.warn('Student attempted unassigned exam', { exam_id: examId, student_id: studentId });
      const error = new Error('You are not assigned to this exam');
      error.statusCode = 403;
      throw error;
    }

    // Check if student has already attempted
    const hasAttempted = await StudentExamAttempt.hasStudentAttempted(examId, studentId, tenantId);
    if (hasAttempted) {
      logger.warn('Student already attempted exam', { exam_id: examId, student_id: studentId });
      const error = new Error('You have already attempted this exam');
      error.statusCode = 400;
      throw error;
    }

    // Check if there are questions in exam
    const questionCount = await ExamQuestion.getEffectiveQuestionCount(examId, tenantId);
    if (questionCount === 0) {
      logger.warn('Attempt to start exam without questions', { exam_id: examId });
      const error = new Error('Exam has no questions');
      error.statusCode = 400;
      throw error;
    }

    // Create attempt
    const attemptId = await StudentExamAttempt.create({
      tenant_id: tenantId,
      exam_id: examId,
      student_id: studentId
    });

    logger.info('Exam attempt started', { attempt_id: attemptId, exam_id: examId, student_id: studentId });
    return await StudentExamAttempt.findById(attemptId, tenantId);
  }

  /**
   * Get exam questions for student (without answer keys)
   */
  static async getExamQuestions(examId, studentId, tenantId) {
    // Verify student has active attempt
    const attempt = await StudentExamAttempt.getActiveAttempt(examId, studentId, tenantId);
    if (!attempt) {
      logger.warn('No active attempt found', { exam_id: examId, student_id: studentId });
      const error = new Error('No active attempt found. Please start the exam first.');
      error.statusCode = 404;
      throw error;
    }

    // Check if time is not exceeded
    const isTimeExceeded = await StudentExamAttempt.isTimeExceeded(attempt.attempt_id, tenantId);
    if (isTimeExceeded) {
      logger.warn('Exam time exceeded, auto-submitting', { attempt_id: attempt.attempt_id });
      // Auto-submit exam
      await this.submitExam(attempt.attempt_id, studentId, tenantId);
      const error = new Error('Exam time has expired');
      error.statusCode = 400;
      throw error;
    }

    // Get questions without answer keys
    const questions = await ExamQuestion.getExamQuestionsForStudent(examId, tenantId, attempt.attempt_id);

    // Get student's saved answers
    const savedAnswers = await StudentAnswer.findByAttemptId(attempt.attempt_id, tenantId);
    
    // Map saved answers to questions
    questions.forEach(q => {
      const savedAnswer = savedAnswers.find(a => a.question_id === q.question_id);
      if (savedAnswer) {
        q.saved_answer = {
          selected_option_id: savedAnswer.selected_option_id,
          numeric_answer: savedAnswer.numeric_answer,
          descriptive_answer: savedAnswer.descriptive_answer
        };
      }
    });

    return {
      attempt_id: attempt.attempt_id,
      remaining_minutes: await StudentExamAttempt.getRemainingTime(attempt.attempt_id, tenantId),
      questions
    };
  }

  /**
   * Save answer
   */
  static async saveAnswer(attemptId, studentId, answerData, tenantId) {
    // Verify attempt belongs to student
    const attempt = await StudentExamAttempt.findById(attemptId, tenantId);
    if (!attempt || attempt.student_id !== studentId) {
      logger.warn('Invalid attempt access', { attempt_id: attemptId, student_id: studentId });
      const error = new Error('Invalid attempt');
      error.statusCode = 403;
      throw error;
    }

    if (attempt.status !== 'in_progress') {
      logger.warn('Attempt to save answer to non-active exam', { attempt_id: attemptId, status: attempt.status });
      const error = new Error('Cannot save answer. Exam is not in progress.');
      error.statusCode = 400;
      throw error;
    }

    // Check if time is not exceeded
    const isTimeExceeded = await StudentExamAttempt.isTimeExceeded(attemptId, tenantId);
    if (isTimeExceeded) {
      logger.warn('Time exceeded while saving answer', { attempt_id: attemptId });
      // Auto-submit exam
      await this.submitExam(attemptId, studentId, tenantId);
      const error = new Error('Exam time has expired');
      error.statusCode = 400;
      throw error;
    }

    // Save answer
    const answerId = await StudentAnswer.saveAnswer({
      tenant_id: tenantId,
      attempt_id: attemptId,
      question_id: answerData.question_id,
      selected_option_id: answerData.selected_option_id || null,
      numeric_answer: answerData.numeric_answer || null,
      descriptive_answer: answerData.descriptive_answer || null
    });

    return {
      success: true,
      student_answer_id: answerId
    };
  }

  /**
   * Submit exam
   */
  static async submitExam(attemptId, studentId, tenantId) {
    // Verify attempt belongs to student
    const attempt = await StudentExamAttempt.findById(attemptId, tenantId);
    if (!attempt || attempt.student_id !== studentId) {
      logger.warn('Invalid attempt submission', { attempt_id: attemptId, student_id: studentId });
      const error = new Error('Invalid attempt');
      error.statusCode = 403;
      throw error;
    }

    if (attempt.status !== 'in_progress') {
      logger.warn('Attempt to re-submit exam', { attempt_id: attemptId, status: attempt.status });
      const error = new Error('Exam already submitted');
      error.statusCode = 400;
      throw error;
    }

    // Submit exam
    await StudentExamAttempt.submit(attemptId, tenantId);

    logger.info('Exam submitted', { attempt_id: attemptId, student_id: studentId });
    return {
      success: true,
      message: 'Exam submitted successfully'
    };
  }

  /**
   * Get student's attempt details
   */
  static async getAttemptDetails(attemptId, studentId, tenantId) {
    const attempt = await StudentExamAttempt.findById(attemptId, tenantId);
    if (!attempt || attempt.student_id !== studentId) {
      logger.warn('Attempt not found or unauthorized', { attempt_id: attemptId, student_id: studentId });
      const error = new Error('Attempt not found');
      error.statusCode = 404;
      throw error;
    }

    const answers = await StudentAnswer.findByAttemptId(attemptId, tenantId);
    
    return {
      ...attempt,
      answers,
      answered_count: answers.length
    };
  }

  /**
   * Get all attempts by student
   */
  static async getStudentAttempts(studentId, tenantId) {
    return await StudentExamAttempt.findByStudentId(studentId, tenantId);
  }

  /**
   * Get active attempt
   */
  static async getActiveAttempt(examId, studentId, tenantId) {
    const attempt = await StudentExamAttempt.getActiveAttempt(examId, studentId, tenantId);
    if (!attempt) {
      return null;
    }

    const isTimeExceeded = await StudentExamAttempt.isTimeExceeded(attempt.attempt_id, tenantId);
    if (isTimeExceeded) {
      logger.warn('Active attempt expired, auto-submitting before returning', {
        attempt_id: attempt.attempt_id,
        exam_id: examId,
        student_id: studentId
      });
      await this.submitExam(attempt.attempt_id, studentId, tenantId);
      return null;
    }

    const remainingTime = await StudentExamAttempt.getRemainingTime(attempt.attempt_id, tenantId);
    if (remainingTime <= 0) {
      logger.warn('Active attempt has no remaining time, auto-submitting before returning', {
        attempt_id: attempt.attempt_id,
        exam_id: examId,
        student_id: studentId
      });
      await this.submitExam(attempt.attempt_id, studentId, tenantId);
      return null;
    }

    return {
      ...attempt,
      remaining_minutes: remainingTime
    };
  }

  /**
   * Get attempts for an exam (Teacher/Admin/Tenant Admin)
   */
  static async getExamAttempts(examId, userId, userRole, tenantId) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    if (userRole === 'teacher') {
      const ownsExam = await Exam.verifyOwnership(examId, tenantId, userId);
      if (!ownsExam) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
    }

    const attempts = await StudentExamAttempt.findByExamId(examId, tenantId);
    return {
      exam_id: exam.exam_id,
      exam_title: exam.title,
      attempts
    };
  }
}

module.exports = AttemptService;
