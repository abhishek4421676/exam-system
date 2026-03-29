const Exam = require('../models/Exam');
const ExamQuestion = require('../models/ExamQuestion');
const ExamQuestionBank = require('../models/ExamQuestionBank');
const QuestionBank = require('../models/QuestionBank');
const logger = require('../config/logger');

class ExamService {
  /**
   * Create new exam
   */
  static async createExam(examData, createdBy, tenantId) {
    const examId = await Exam.create({
      tenant_id: tenantId,
      ...examData,
      created_by: createdBy,
      status: examData.status || 'draft'
    });

    return await Exam.findById(examId, tenantId);
  }

  /**
   * Get all exams (role-aware filtering)
   * - Teacher: sees only their own exams
   * - Student: sees only published exams
   */
  static async getAllExams(tenantId, user, filters = {}) {
    if (user.role === 'teacher') {
      // Teacher sees only their own exams
      return await Exam.findAll(tenantId, { ...filters, created_by: user.user_id });
    } else if (user.role === 'student') {
      // Student sees only published exams
      return await Exam.findPublished(tenantId);
    }
    return [];
  }

  /**
   * Get exam by ID
   */
  static async getExamById(examId, tenantId) {
    const exam = await Exam.getExamDetails(examId, tenantId);
    if (!exam) {
      logger.warn('Exam not found', { exam_id: examId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }
    return exam;
  }

  /**
   * Update exam
   */
  static async updateExam(examId, tenantId, updates) {
    // Check if exam exists
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      logger.warn('Attempt to update non-existent exam', { exam_id: examId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await Exam.update(examId, tenantId, updates);
    if (!updated) {
      logger.error('Failed to update exam', { exam_id: examId });
      const error = new Error('Failed to update exam');
      error.statusCode = 500;
      throw error;
    }

    return await Exam.findById(examId, tenantId);
  }

  /**
   * Delete exam
   */
  static async deleteExam(examId, tenantId) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      logger.warn('Attempt to delete non-existent exam', { exam_id: examId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    const deleted = await Exam.delete(examId, tenantId);
    if (!deleted) {
      logger.error('Failed to delete exam', { exam_id: examId });
      const error = new Error('Failed to delete exam');
      error.statusCode = 500;
      throw error;
    }

    return true;
  }

  /**
   * Publish exam
   */
  static async publishExam(examId, tenantId) {
    // Check if exam has questions
    const questionCount = await ExamQuestion.getEffectiveQuestionCount(examId, tenantId);
    if (questionCount === 0) {
      logger.warn('Attempt to publish exam without questions', { exam_id: examId });
      const error = new Error('Cannot publish exam without questions');
      error.statusCode = 400;
      throw error;
    }

    return await Exam.update(examId, tenantId, { status: 'published' });
  }

  /**
   * Archive exam
   */
  static async archiveExam(examId, tenantId) {
    return await Exam.update(examId, tenantId, { status: 'archived' });
  }

  /**
   * Get published exams for students
   */
  static async getPublishedExams(tenantId, user) {
    if (user?.role === 'student') {
      return await Exam.findPublishedForStudent(tenantId, user.user_id);
    }
    return await Exam.findPublished(tenantId);
  }

  /**
   * Get exam with questions (for admin preview)
   */
  static async getExamWithQuestions(examId, tenantId) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      logger.warn('Exam not found', { exam_id: examId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    const questions = await ExamQuestion.findByExamId(examId, tenantId);
    exam.questions = questions;

    return exam;
  }

  /**
   * Add questions to exam
   */
  static async addQuestionsToExam(examId, questionIds, tenantId) {
    // Check if exam exists
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      logger.warn('Attempt to add questions to non-existent exam', { exam_id: examId });
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    // Add questions
    await ExamQuestion.addMultipleQuestions(tenantId, examId, questionIds);

    return await this.getExamWithQuestions(examId, tenantId);
  }

  /**
   * Remove question from exam
   */
  static async removeQuestionFromExam(examId, questionId, tenantId) {
    const removed = await ExamQuestion.delete(examId, questionId, tenantId);
    if (!removed) {
      logger.warn('Question not found in exam', { exam_id: examId, question_id: questionId });
      const error = new Error('Question not found in exam');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }

  static async setQuestionBanksForExam(examId, bankConfigs, tenantId, user) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'teacher' && Number(exam.created_by) !== Number(user.user_id)) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    const normalized = [];
    for (const config of (bankConfigs || [])) {
      const bankId = Number(config.bank_id);
      const questionsToPick = Number(config.questions_to_pick || 0);

      if (!bankId || questionsToPick <= 0) continue;

      const bank = await QuestionBank.findById(bankId, tenantId);
      if (!bank) {
        const error = new Error(`Question bank ${bankId} not found`);
        error.statusCode = 404;
        throw error;
      }

      if (user.role === 'teacher' && Number(bank.created_by) !== Number(user.user_id)) {
        const error = new Error(`Access denied for question bank ${bankId}`);
        error.statusCode = 403;
        throw error;
      }

      normalized.push({ bank_id: bankId, questions_to_pick: questionsToPick });
    }

    await ExamQuestionBank.setForExam(examId, tenantId, normalized);
    return await ExamQuestionBank.findByExamId(examId, tenantId);
  }

  static async getQuestionBanksForExam(examId, tenantId, user) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'teacher' && Number(exam.created_by) !== Number(user.user_id)) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    return await ExamQuestionBank.findByExamId(examId, tenantId);
  }
}

module.exports = ExamService;
