const pool = require('../config/connection');

class QuestionBank {
  static async create({ tenant_id, name, description, created_by }) {
    // Use INSERT IGNORE so a duplicate doesn't crash — just return the existing bank
    const [result] = await pool.execute(
      `INSERT IGNORE INTO QuestionBanks (tenant_id, name, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [tenant_id, name, description || null, created_by]
    );

    if (result.insertId) return result.insertId;

    // Bank already existed for this teacher — fetch its id
    const [rows] = await pool.execute(
      'SELECT bank_id FROM QuestionBanks WHERE tenant_id = ? AND name = ? AND created_by = ?',
      [tenant_id, name, created_by]
    );
    return rows[0].bank_id;
  }

  static async findAll(tenantId, user = null) {
    let query = `
      SELECT qb.*, u.name as created_by_name,
             (SELECT COUNT(*) FROM Questions q WHERE q.question_bank_id = qb.bank_id AND q.tenant_id = qb.tenant_id) as question_count
      FROM QuestionBanks qb
      LEFT JOIN Users u ON qb.created_by = u.user_id
      WHERE qb.tenant_id = ?
    `;

    const params = [tenantId];

    if (user?.role === 'teacher') {
      query += ' AND qb.created_by = ?';
      params.push(user.user_id);
    }

    query += ' ORDER BY qb.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findById(bankId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT qb.*,
              (SELECT COUNT(*) FROM Questions q WHERE q.question_bank_id = qb.bank_id AND q.tenant_id = qb.tenant_id) as question_count
       FROM QuestionBanks qb
       WHERE qb.bank_id = ? AND qb.tenant_id = ?`,
      [bankId, tenantId]
    );
    return rows[0];
  }

  static async verifyOwnership(bankId, tenantId, userId) {
    const [rows] = await pool.execute(
      'SELECT created_by FROM QuestionBanks WHERE bank_id = ? AND tenant_id = ?',
      [bankId, tenantId]
    );
    if (!rows[0]) return false;
    return Number(rows[0].created_by) === Number(userId);
  }

  static async delete(bankId, tenantId) {
    // Detach questions from this bank (keep questions, just unlink them)
    await pool.execute(
      'UPDATE Questions SET question_bank_id = NULL WHERE question_bank_id = ? AND tenant_id = ?',
      [bankId, tenantId]
    );
    const [result] = await pool.execute(
      'DELETE FROM QuestionBanks WHERE bank_id = ? AND tenant_id = ?',
      [bankId, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async assignQuestions(bankId, tenantId, questionIds) {
    if (!questionIds.length) return 0;
    const placeholders = questionIds.map(() => '?').join(',');
    const [result] = await pool.execute(
      `UPDATE Questions SET question_bank_id = ? WHERE question_id IN (${placeholders}) AND tenant_id = ?`,
      [bankId, ...questionIds, tenantId]
    );
    return result.affectedRows;
  }
}

module.exports = QuestionBank;
