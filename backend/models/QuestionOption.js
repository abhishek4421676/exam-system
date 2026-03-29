const pool = require('../config/connection');

class QuestionOption {
  /**
   * Create option for a question
   */
  static async create(optionData) {
    const { tenant_id, question_id, option_text, option_order } = optionData;
    const [result] = await pool.execute(
      'INSERT INTO QuestionOptions (tenant_id, question_id, option_text, option_order) VALUES (?, ?, ?, ?)',
      [tenant_id, question_id, option_text, option_order]
    );
    return result.insertId;
  }

  /**
   * Get options for a question
   */
  static async findByQuestionId(questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT * FROM QuestionOptions WHERE question_id = ? AND tenant_id = ? ORDER BY option_order',
      [questionId, tenantId]
    );
    return rows;
  }

  /**
   * Update option
   */
  static async update(optionId, tenantId, updates) {
    const fields = [];
    const values = [];

    if (updates.option_text) {
      fields.push('option_text = ?');
      values.push(updates.option_text);
    }
    if (updates.option_order !== undefined) {
      fields.push('option_order = ?');
      values.push(updates.option_order);
    }

    if (fields.length === 0) return false;

    values.push(optionId, tenantId);
    const query = `UPDATE QuestionOptions SET ${fields.join(', ')} WHERE option_id = ? AND tenant_id = ?`;
    
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete option
   */
  static async delete(optionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM QuestionOptions WHERE option_id = ? AND tenant_id = ?',
      [optionId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete all options for a question
   */
  static async deleteByQuestionId(questionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM QuestionOptions WHERE question_id = ? AND tenant_id = ?',
      [questionId, tenantId]
    );
    return result.affectedRows;
  }
}

module.exports = QuestionOption;
