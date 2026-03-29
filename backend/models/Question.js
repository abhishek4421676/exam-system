const pool = require('../config/connection');

class Question {
  /**
   * Create new question (without options/answer key)
   */
  static async create(questionData) {
    const { tenant_id, question_text, question_type, marks, negative_marks, created_by, question_bank_id } = questionData;
    const [result] = await pool.execute(
      'INSERT INTO Questions (tenant_id, question_text, question_type, marks, negative_marks, created_by, question_bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant_id, question_text, question_type, marks, negative_marks || 0, created_by, question_bank_id || null]
    );
    return result.insertId;
  }

  /**
   * Create MCQ question with options and answer key (uses transaction)
   */
  static async createMCQWithOptions(questionData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert question
      const [questionResult] = await connection.execute(
        'INSERT INTO Questions (tenant_id, question_text, question_type, marks, negative_marks, created_by, question_bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [questionData.tenant_id, questionData.question_text, 'MCQ', questionData.marks, questionData.negative_marks || 0, questionData.created_by, questionData.question_bank_id || null]
      );
      const question_id = questionResult.insertId;

      // Insert options
      const optionIds = [];
      for (let i = 0; i < questionData.options.length; i++) {
        const [optionResult] = await connection.execute(
          'INSERT INTO QuestionOptions (tenant_id, question_id, option_text, option_order) VALUES (?, ?, ?, ?)',
          [questionData.tenant_id, question_id, questionData.options[i], i + 1]
        );
        optionIds.push(optionResult.insertId);
      }

      // Insert answer key
      const correctOptionIndex = questionData.correct_option_index || 0;
      const correctOptionId = optionIds[correctOptionIndex];

      await connection.execute(
        'INSERT INTO AnswerKeys (tenant_id, question_id, correct_option_id) VALUES (?, ?, ?)',
        [questionData.tenant_id, question_id, correctOptionId]
      );

      await connection.commit();
      return question_id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create NUMERIC question with answer
   */
  static async createNumericWithAnswer(questionData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert question
      const [questionResult] = await connection.execute(
        'INSERT INTO Questions (tenant_id, question_text, question_type, marks, negative_marks, created_by, question_bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [questionData.tenant_id, questionData.question_text, 'NUMERIC', questionData.marks, questionData.negative_marks || 0, questionData.created_by, questionData.question_bank_id || null]
      );
      const question_id = questionResult.insertId;

      // Insert answer key
      await connection.execute(
        'INSERT INTO AnswerKeys (tenant_id, question_id, correct_numeric_answer) VALUES (?, ?, ?)',
        [questionData.tenant_id, question_id, questionData.correct_numeric_answer]
      );

      await connection.commit();
      return question_id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find question by ID
   */
  static async findById(questionId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT q.*, u.name as created_by_name, qb.name as question_bank_name FROM Questions q 
       LEFT JOIN Users u ON q.created_by = u.user_id 
       LEFT JOIN QuestionBanks qb ON q.question_bank_id = qb.bank_id
       WHERE q.question_id = ? AND q.tenant_id = ?`,
      [questionId, tenantId]
    );
    return rows[0];
  }

  /**
   * Get question with options (for admin)
   */
  static async getQuestionWithOptions(questionId, tenantId) {
    const question = await this.findById(questionId, tenantId);
    if (!question) return null;

    if (question.question_type === 'MCQ') {
      const [options] = await pool.execute(
        'SELECT option_id, option_text, option_order FROM QuestionOptions WHERE question_id = ? AND tenant_id = ? ORDER BY option_order',
        [questionId, tenantId]
      );
      question.options = options.map(o => o.option_text);

      // Get correct answer index
      const [answerKey] = await pool.execute(
        'SELECT correct_option_id FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
        [questionId, tenantId]
      );
      const correctOptionId = answerKey[0]?.correct_option_id;
      question.correct_option_id = correctOptionId;
      // Derive the 0-based index the frontend relies on
      question.correct_option_index = options.findIndex(o => o.option_id === correctOptionId);
    } else if (question.question_type === 'NUMERIC') {
      const [answerKey] = await pool.execute(
        'SELECT correct_numeric_answer FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
        [questionId, tenantId]
      );
      question.correct_numeric_answer = answerKey[0]?.correct_numeric_answer;
    }

    return question;
  }

  /**
   * Get all questions
   */
  static async findAll(tenantId, filters = {}) {
    let query = `SELECT q.*, u.name as created_by_name, qb.name as question_bank_name FROM Questions q 
                 LEFT JOIN Users u ON q.created_by = u.user_id 
           LEFT JOIN QuestionBanks qb ON q.question_bank_id = qb.bank_id
                 WHERE q.tenant_id = ?`;
    const params = [tenantId];

    if (filters.question_type) {
      query += ' AND q.question_type = ?';
      params.push(filters.question_type);
    }

    if (filters.created_by) {
      query += ' AND q.created_by = ?';
      params.push(filters.created_by);
    }

    if (filters.question_bank_id) {
      query += ' AND q.question_bank_id = ?';
      params.push(filters.question_bank_id);
    }

    query += ' ORDER BY q.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Update question
   */
  static async update(questionId, tenantId, updates) {
    const fields = [];
    const values = [];

    const allowedFields = ['question_text', 'marks', 'negative_marks', 'question_bank_id'];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(questionId, tenantId);
    const query = `UPDATE Questions SET ${fields.join(', ')} WHERE question_id = ? AND tenant_id = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Get all questions for an exam
   */
  static async findByExamId(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT q.* FROM Questions q
       JOIN ExamQuestions eq ON q.question_id = eq.question_id
       WHERE eq.exam_id = ? AND q.tenant_id = ?
       ORDER BY eq.question_order`,
      [examId, tenantId]
    );
    return rows;
  }

  /**
   * Verify user owns the question (authorization)
   */
  static async verifyOwnership(questionId, tenantId, userId) {
    const [rows] = await pool.execute(
      'SELECT created_by FROM Questions WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    if (!rows[0]) return false;
    return Number(rows[0].created_by) === Number(userId);
  }

  /**
   * Delete question
   */
  static async delete(questionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM Questions WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Question;
