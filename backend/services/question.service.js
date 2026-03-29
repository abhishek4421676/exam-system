const Question = require('../models/Question');
const QuestionOption = require('../models/QuestionOption');
const AnswerKey = require('../models/AnswerKey');
const QuestionBank = require('../models/QuestionBank');
const logger = require('../config/logger');

class QuestionService {
  /**
   * Create MCQ question with options
   */
  static async createMCQQuestion(questionData, tenantId, createdBy) {
    const { question_text, marks, negative_marks, options, correct_option_index, question_bank_id } = questionData;

    if (!options || options.length < 2) {
      const error = new Error('MCQ question must have at least 2 options');
      error.statusCode = 400;
      throw error;
    }

    if (correct_option_index === undefined || correct_option_index < 0 || correct_option_index >= options.length) {
      const error = new Error('Invalid correct option index');
      error.statusCode = 400;
      throw error;
    }

    const questionId = await Question.createMCQWithOptions({
      tenant_id: tenantId,
      question_text,
      marks,
      negative_marks: negative_marks || 0,
      options,
      correct_option_index,
      question_bank_id,
      created_by: createdBy
    });

    return await this.getQuestionById(questionId, tenantId);
  }

  /**
   * Create NUMERIC question
   */
  static async createNumericQuestion(questionData, tenantId, createdBy) {
    const { question_text, marks, negative_marks, correct_numeric_answer, question_bank_id } = questionData;

    if (correct_numeric_answer === undefined) {
      const error = new Error('Correct numeric answer is required');
      error.statusCode = 400;
      throw error;
    }

    const questionId = await Question.createNumericWithAnswer({
      tenant_id: tenantId,
      question_text,
      marks,
      negative_marks: negative_marks || 0,
      correct_numeric_answer,
      question_bank_id,
      created_by: createdBy
    });

    return await this.getQuestionById(questionId, tenantId);
  }

  /**
   * Create DESCRIPTIVE question
   */
  static async createDescriptiveQuestion(questionData, tenantId, createdBy) {
    const { question_text, marks, question_bank_id } = questionData;

    const questionId = await Question.create({
      tenant_id: tenantId,
      question_text,
      question_type: 'DESCRIPTIVE',
      marks,
      negative_marks: 0,
      question_bank_id,
      created_by: createdBy
    });

    return await this.getQuestionById(questionId, tenantId);
  }

  /**
   * Create question based on type
   */
  static async createQuestion(questionData, tenantId, createdBy) {
    const { question_type } = questionData;

    switch (question_type) {
      case 'MCQ':
        return await this.createMCQQuestion(questionData, tenantId, createdBy);
      case 'NUMERIC':
        return await this.createNumericQuestion(questionData, tenantId, createdBy);
      case 'DESCRIPTIVE':
        return await this.createDescriptiveQuestion(questionData, tenantId, createdBy);
      default:
        const error = new Error('Invalid question type');
        error.statusCode = 400;
        throw error;
    }
  }

  /**
   * Get question by ID (with options and answer key)
   */
  static async getQuestionById(questionId, tenantId) {
    const question = await Question.getQuestionWithOptions(questionId, tenantId);
    if (!question) {
      logger.warn('Question not found', { question_id: questionId });
      const error = new Error('Question not found');
      error.statusCode = 404;
      throw error;
    }
    return question;
  }

  /**
   * Get all questions (role-aware filtering)
   * - Admin: sees all questions
   * - Teacher: sees only their own questions
   */
  static async getAllQuestions(tenantId, user, filters = {}) {
    if (user && user.role === 'teacher') {
      // Teacher sees only their own questions
      return await Question.findAll(tenantId, { ...filters, created_by: user.user_id });
    }
    // Admin and other roles see all questions
    return await Question.findAll(tenantId, filters);
  }

  static async createQuestionBank(bankData, tenantId, createdBy) {
    const { name, description } = bankData;

    if (!name || !String(name).trim()) {
      const error = new Error('Question bank name is required');
      error.statusCode = 400;
      throw error;
    }

    const bankId = await QuestionBank.create({
      tenant_id: tenantId,
      name: String(name).trim(),
      description: description || null,
      created_by: createdBy
    });

    return await QuestionBank.findById(bankId, tenantId);
  }

  static async getQuestionBanks(tenantId, user) {
    return await QuestionBank.findAll(tenantId, user);
  }

  static async deleteQuestionBank(bankId, tenantId, userId) {
    const bank = await QuestionBank.findById(bankId, tenantId);
    if (!bank) {
      const error = new Error('Question bank not found');
      error.statusCode = 404;
      throw error;
    }
    // Only the creator can delete (teachers)
    const isOwner = await QuestionBank.verifyOwnership(bankId, tenantId, userId);
    if (!isOwner) {
      const error = new Error('You do not have permission to delete this bank');
      error.statusCode = 403;
      throw error;
    }
    return await QuestionBank.delete(bankId, tenantId);
  }

  static async assignQuestionsToBank(bankId, tenantId, questionIds) {
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      const error = new Error('No question IDs provided');
      error.statusCode = 400;
      throw error;
    }
    const bank = await QuestionBank.findById(bankId, tenantId);
    if (!bank) {
      const error = new Error('Question bank not found');
      error.statusCode = 404;
      throw error;
    }
    const count = await QuestionBank.assignQuestions(bankId, tenantId, questionIds.map(Number));
    return { assigned: count };
  }

  /**
   * Update question
   */
  static async updateQuestion(questionId, updates, tenantId) {
    const question = await Question.findById(questionId, tenantId);
    if (!question) {
      logger.warn('Attempt to update non-existent question', { question_id: questionId });
      const error = new Error('Question not found');
      error.statusCode = 404;
      throw error;
    }

    // Update question text and marks
    const updated = await Question.update(questionId, tenantId, updates);
    if (!updated) {
      logger.error('Failed to update question', { question_id: questionId });
      const error = new Error('Failed to update question');
      error.statusCode = 500;
      throw error;
    }

    // Update options if provided (for MCQ)
    if (updates.options && question.question_type === 'MCQ') {
      // Delete existing options
      await QuestionOption.deleteByQuestionId(questionId, tenantId);

      // Add new options
      for (let i = 0; i < updates.options.length; i++) {
        await QuestionOption.create({
          tenant_id: tenantId,
          question_id: questionId,
          option_text: updates.options[i],
          option_order: i + 1
        });
      }
    }

    // Update answer key if provided
    if (updates.correct_option_index !== undefined && question.question_type === 'MCQ') {
      const options = await QuestionOption.findByQuestionId(questionId, tenantId);
      const correctOptionId = options[updates.correct_option_index]?.option_id;
      if (correctOptionId) {
        await AnswerKey.update(questionId, tenantId, { correct_option_id: correctOptionId });
      }
    }

    if (updates.correct_numeric_answer !== undefined && question.question_type === 'NUMERIC') {
      await AnswerKey.update(questionId, tenantId, { correct_numeric_answer: updates.correct_numeric_answer });
    }

    return await this.getQuestionById(questionId, tenantId);
  }

  /**
   * Delete question
   */
  static async deleteQuestion(questionId, tenantId) {
    const question = await Question.findById(questionId, tenantId);
    if (!question) {
      logger.warn('Attempt to delete non-existent question', { question_id: questionId });
      const error = new Error('Question not found');
      error.statusCode = 404;
      throw error;
    }

    const deleted = await Question.delete(questionId, tenantId);
    if (!deleted) {
      logger.error('Failed to delete question', { question_id: questionId });
      const error = new Error('Failed to delete question');
      error.statusCode = 500;
      throw error;
    }

    return true;
  }

  /**
   * Bulk create questions from CSV
   */
  static async bulkCreateQuestions(questionsData, tenantId, createdBy) {
    const created = [];
    const errors = [];

    for (let i = 0; i < questionsData.length; i++) {
      try {
        const question = await this.createQuestion(questionsData[i], tenantId, createdBy);
        created.push(question);
      } catch (error) {
        logger.error('Bulk create question failed', { index: i, error: error.message });
        errors.push({
          index: i,
          data: questionsData[i],
          error: error.message
        });
      }
    }

    return { created, errors };
  }
}

module.exports = QuestionService;
