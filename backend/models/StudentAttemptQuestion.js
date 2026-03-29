const pool = require('../config/connection');

class StudentAttemptQuestion {
  static async findByAttemptId(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT question_id, question_order
       FROM StudentAttemptQuestions
       WHERE attempt_id = ? AND tenant_id = ?
       ORDER BY question_order ASC`,
      [attemptId, tenantId]
    );
    return rows;
  }

  static async createPaper(tenantId, attemptId, examId, questionIds = []) {
    if (!questionIds.length) return true;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (let index = 0; index < questionIds.length; index++) {
        await connection.execute(
          `INSERT INTO StudentAttemptQuestions (tenant_id, attempt_id, exam_id, question_id, question_order)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, attemptId, examId, questionIds[index], index + 1]
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
}

module.exports = StudentAttemptQuestion;
