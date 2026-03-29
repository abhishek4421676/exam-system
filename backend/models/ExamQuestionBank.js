const pool = require('../config/connection');

class ExamQuestionBank {
  static async setForExam(examId, tenantId, bankConfigs = []) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        'DELETE FROM ExamQuestionBanks WHERE exam_id = ? AND tenant_id = ?',
        [examId, tenantId]
      );

      for (const config of bankConfigs) {
        await connection.execute(
          `INSERT INTO ExamQuestionBanks (tenant_id, exam_id, bank_id, questions_to_pick)
           VALUES (?, ?, ?, ?)`,
          [tenantId, examId, config.bank_id, config.questions_to_pick]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByExamId(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT eqb.*, qb.name as bank_name,
              (SELECT COUNT(*) FROM Questions q WHERE q.question_bank_id = eqb.bank_id AND q.tenant_id = eqb.tenant_id) as available_questions
       FROM ExamQuestionBanks eqb
       JOIN QuestionBanks qb ON qb.bank_id = eqb.bank_id
       WHERE eqb.exam_id = ? AND eqb.tenant_id = ?
       ORDER BY eqb.created_at ASC`,
      [examId, tenantId]
    );
    return rows;
  }
}

module.exports = ExamQuestionBank;
