const pool = require('../config/connection');

class StudentExamAttempt {
  /**
   * Create new exam attempt
   */
  static async create(attemptData) {
    const { tenant_id, exam_id, student_id } = attemptData;
    const [result] = await pool.execute(
      'INSERT INTO StudentExamAttempts (tenant_id, exam_id, student_id, status) VALUES (?, ?, ?, ?)',
      [tenant_id, exam_id, student_id, 'in_progress']
    );
    return result.insertId;
  }

  /**
   * Find attempt by ID
   */
  static async findById(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT sea.*, e.title as exam_title, e.duration_minutes, e.total_marks,
              u.name as student_name, u.email as student_email
       FROM StudentExamAttempts sea
       JOIN Exams e ON sea.exam_id = e.exam_id
       JOIN Users u ON sea.student_id = u.user_id
       WHERE sea.attempt_id = ? AND sea.tenant_id = ?`,
      [attemptId, tenantId]
    );
    return rows[0];
  }

  /**
   * Check if student has already attempted exam
   */
  static async hasStudentAttempted(examId, studentId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM StudentExamAttempts WHERE exam_id = ? AND student_id = ? AND tenant_id = ?',
      [examId, studentId, tenantId]
    );
    return rows[0].count > 0;
  }

  /**
   * Get active attempt for student
   */
  static async getActiveAttempt(examId, studentId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT * FROM StudentExamAttempts 
       WHERE exam_id = ? AND student_id = ? AND tenant_id = ? AND status = 'in_progress'`,
      [examId, studentId, tenantId]
    );
    return rows[0];
  }

  /**
   * Get all attempts for an exam
   */
  static async findByExamId(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT sea.*, u.name as student_name, u.email as student_email, e.total_marks as exam_total_marks
       FROM StudentExamAttempts sea
       JOIN Users u ON sea.student_id = u.user_id
       JOIN Exams e ON sea.exam_id = e.exam_id
       WHERE sea.exam_id = ? AND sea.tenant_id = ?
       ORDER BY sea.start_time DESC`,
      [examId, tenantId]
    );
    return rows;
  }

  /**
   * Get all attempts by student
   */
  static async findByStudentId(studentId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT sea.*, e.title as exam_title, e.total_marks, e.duration_minutes
       FROM StudentExamAttempts sea
       JOIN Exams e ON sea.exam_id = e.exam_id
       WHERE sea.student_id = ? AND sea.tenant_id = ?
       ORDER BY sea.start_time DESC`,
      [studentId, tenantId]
    );
    return rows;
  }

  /**
   * Update attempt status
   */
  static async updateStatus(attemptId, status, tenantId) {
    const [result] = await pool.execute(
      'UPDATE StudentExamAttempts SET status = ?, end_time = CURRENT_TIMESTAMP WHERE attempt_id = ? AND tenant_id = ?',
      [status, attemptId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Update total score
   */
  static async updateScore(attemptId, totalScore, tenantId) {
    const [result] = await pool.execute(
      'UPDATE StudentExamAttempts SET total_score = ?, status = ? WHERE attempt_id = ? AND tenant_id = ?',
      [totalScore, 'evaluated', attemptId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Submit exam
   */
  static async submit(attemptId, tenantId) {
    const [result] = await pool.execute(
      'UPDATE StudentExamAttempts SET status = ?, end_time = CURRENT_TIMESTAMP WHERE attempt_id = ? AND tenant_id = ?',
      ['submitted', attemptId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if attempt time exceeded
   */
  static async isTimeExceeded(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT 
        TIMESTAMPDIFF(MINUTE, sea.start_time, CURRENT_TIMESTAMP) as elapsed_minutes,
        e.duration_minutes
       FROM StudentExamAttempts sea
       JOIN Exams e ON sea.exam_id = e.exam_id
       WHERE sea.attempt_id = ? AND sea.tenant_id = ?`,
      [attemptId, tenantId]
    );
    
    if (rows.length === 0) return false;
    return rows[0].elapsed_minutes >= rows[0].duration_minutes;
  }

  /**
   * Get remaining time for attempt
   */
  static async getRemainingTime(attemptId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT 
        e.duration_minutes - TIMESTAMPDIFF(MINUTE, sea.start_time, CURRENT_TIMESTAMP) as remaining_minutes
       FROM StudentExamAttempts sea
       JOIN Exams e ON sea.exam_id = e.exam_id
       WHERE sea.attempt_id = ? AND sea.tenant_id = ?`,
      [attemptId, tenantId]
    );
    
    return rows[0]?.remaining_minutes || 0;
  }
}

module.exports = StudentExamAttempt;
