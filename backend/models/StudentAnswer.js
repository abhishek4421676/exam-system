const pool = require('../config/connection');

class StudentAnswer {
  /**
   * Save or update student answer
   */
  static async saveAnswer(answerData) {
    const { tenant_id, attempt_id, question_id, selected_option_id, numeric_answer, descriptive_answer } = answerData;

    // Check if answer already exists
    const [existing] = await pool.execute(
      'SELECT student_answer_id FROM StudentAnswers WHERE attempt_id = ? AND question_id = ? AND tenant_id = ?',
      [attempt_id, question_id, tenant_id]
    );

    if (existing.length > 0) {
      // Update existing answer
      const [result] = await pool.execute(
        `UPDATE StudentAnswers 
         SET selected_option_id = ?, numeric_answer = ?, descriptive_answer = ?
         WHERE attempt_id = ? AND question_id = ? AND tenant_id = ?`,
        [selected_option_id, numeric_answer, descriptive_answer, attempt_id, question_id, tenant_id]
      );
      return existing[0].student_answer_id;
    } else {
      // Insert new answer
      const [result] = await pool.execute(
        `INSERT INTO StudentAnswers (tenant_id, attempt_id, question_id, selected_option_id, numeric_answer, descriptive_answer)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenant_id, attempt_id, question_id, selected_option_id, numeric_answer, descriptive_answer]
      );
      return result.insertId;
    }
  }

  /**
   * Get all answers for an attempt
   */
  static async findByAttemptId(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT sa.*, q.question_text, q.question_type, q.marks, q.negative_marks
       FROM StudentAnswers sa
       JOIN Questions q ON sa.question_id = q.question_id
       WHERE sa.attempt_id = ? AND sa.tenant_id = ?`,
      [attemptId, tenantId]
    );
    return rows;
  }

  /**
   * Get answer for specific question in attempt
   */
  static async findAnswer(attemptId, questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT * FROM StudentAnswers WHERE attempt_id = ? AND question_id = ? AND tenant_id = ?',
      [attemptId, questionId, tenantId]
    );
    return rows[0];
  }

  /**
   * Get answer by student_answer_id
   */
  static async findById(studentAnswerId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT * FROM StudentAnswers WHERE student_answer_id = ? AND tenant_id = ?',
      [studentAnswerId, tenantId]
    );
    return rows[0];
  }

  /**
   * Update marks for an answer
   */
  static async updateMarks(studentAnswerId, marksAwarded, isCorrect, tenantId) {
    const [result] = await pool.execute(
      'UPDATE StudentAnswers SET marks_awarded = ?, is_correct = ? WHERE student_answer_id = ? AND tenant_id = ?',
      [marksAwarded, isCorrect, studentAnswerId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Bulk update marks for multiple answers
   */
  static async bulkUpdateMarks(answers, tenantId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      for (const answer of answers) {
        await connection.execute(
          'UPDATE StudentAnswers SET marks_awarded = ?, is_correct = ? WHERE student_answer_id = ? AND tenant_id = ?',
          [answer.marks_awarded, answer.is_correct, answer.student_answer_id, tenantId]
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

  /**
   * Get answered count for attempt
   */
  static async getAnsweredCount(attemptId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM StudentAnswers WHERE attempt_id = ? AND tenant_id = ?',
      [attemptId, tenantId]
    );
    return rows[0].count;
  }

  /**
   * Get answers with correct answer keys (for evaluation)
   */
  static async getAnswersWithKeys(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT 
        sa.*,
        q.question_type, q.marks, q.negative_marks,
        ak.correct_option_id, ak.correct_numeric_answer, ak.correct_text_answer
       FROM StudentAnswers sa
       JOIN Questions q ON sa.question_id = q.question_id
       LEFT JOIN AnswerKeys ak ON q.question_id = ak.question_id AND ak.tenant_id = sa.tenant_id
       WHERE sa.attempt_id = ? AND sa.tenant_id = ?`,
      [attemptId, tenantId]
    );
    return rows;
  }

  /**
   * Delete answer
   */
  static async delete(attemptId, questionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM StudentAnswers WHERE attempt_id = ? AND question_id = ? AND tenant_id = ?',
      [attemptId, questionId, tenantId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = StudentAnswer;
