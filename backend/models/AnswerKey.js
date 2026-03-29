const pool = require('../config/connection');

class AnswerKey {
  /**
   * Create answer key for a question
   */
  static async create(answerData) {
    const { tenant_id, question_id, correct_option_id, correct_numeric_answer, correct_text_answer } = answerData;
    const [result] = await pool.execute(
      'INSERT INTO AnswerKeys (tenant_id, question_id, correct_option_id, correct_numeric_answer, correct_text_answer) VALUES (?, ?, ?, ?, ?)',
      [tenant_id, question_id, correct_option_id, correct_numeric_answer, correct_text_answer]
    );
    return result.insertId;
  }

  /**
   * Get answer key for a question
   */
  static async findByQuestionId(questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT * FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return rows[0];
  }

  /**
   * Update answer key
   */
  static async update(questionId, tenantId, updates) {
    const fields = [];
    const values = [];

    if (updates.correct_option_id !== undefined) {
      fields.push('correct_option_id = ?');
      values.push(updates.correct_option_id);
    }
    if (updates.correct_numeric_answer !== undefined) {
      fields.push('correct_numeric_answer = ?');
      values.push(updates.correct_numeric_answer);
    }
    if (updates.correct_text_answer !== undefined) {
      fields.push('correct_text_answer = ?');
      values.push(updates.correct_text_answer);
    }

    if (fields.length === 0) return false;

    values.push(questionId, tenantId);
    const query = `UPDATE AnswerKeys SET ${fields.join(', ')} WHERE question_id = ? AND tenant_id = ?`;
    
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete answer key
   */
  static async delete(questionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get correct answer for MCQ question
   */
  static async getCorrectOptionId(questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT correct_option_id FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return rows[0]?.correct_option_id;
  }

  /**
   * Get correct answer for NUMERIC question
   */
  static async getCorrectNumericAnswer(questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT correct_numeric_answer FROM AnswerKeys WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return rows[0]?.correct_numeric_answer;
  }
}

module.exports = AnswerKey;
