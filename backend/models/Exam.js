const pool = require('../config/connection');

class Exam {
  /**
   * Create new exam
   */
  static async create(examData) {
    const { tenant_id, title, description, duration_minutes, total_marks, created_by, status } = examData;
    const [result] = await pool.execute(
      'INSERT INTO Exams (tenant_id, title, description, duration_minutes, total_marks, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant_id, title, description, duration_minutes, total_marks, created_by, status || 'draft']
    );
    return result.insertId;
  }

  /**
   * Find exam by ID
   */
  static async findById(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT e.*, u.name as created_by_name 
       FROM Exams e 
       LEFT JOIN Users u ON e.created_by = u.user_id 
       WHERE e.exam_id = ? AND e.tenant_id = ?`,
      [examId, tenantId]
    );
    return rows[0];
  }

  /**
   * Get all exams with filters
   */
  static async findAll(tenantId, filters = {}) {
    let query = `
      SELECT e.*, u.name as created_by_name,
              (
                (SELECT COUNT(*) FROM ExamQuestions WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id)
                + COALESCE((SELECT SUM(questions_to_pick) FROM ExamQuestionBanks WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id), 0)
              ) as question_count,
              (SELECT COUNT(*) FROM StudentExamAssignments WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id) as assigned_student_count
      FROM Exams e
      LEFT JOIN Users u ON e.created_by = u.user_id
      WHERE e.tenant_id = ?
    `;
    const params = [tenantId];

    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    if (filters.created_by) {
      query += ' AND e.created_by = ?';
      params.push(filters.created_by);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Get published exams for students
   */
  static async findPublished(tenantId) {
    const [rows] = await pool.execute(
      `SELECT e.*,
              (
                (SELECT COUNT(*) FROM ExamQuestions WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id)
                + COALESCE((SELECT SUM(questions_to_pick) FROM ExamQuestionBanks WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id), 0)
              ) as question_count,
              (SELECT COUNT(*) FROM StudentExamAssignments WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id) as assigned_student_count
       FROM Exams e
       WHERE e.status = 'published' AND e.tenant_id = ?
       ORDER BY e.created_at DESC`,
      [tenantId]
    );
    return rows;
  }

  /**
   * Get published exams assigned to a specific student
   */
  static async findPublishedForStudent(tenantId, studentId) {
    const [rows] = await pool.execute(
      `SELECT e.*,
              (
                (SELECT COUNT(*) FROM ExamQuestions WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id)
                + COALESCE((SELECT SUM(questions_to_pick) FROM ExamQuestionBanks WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id), 0)
              ) as question_count,
              (SELECT COUNT(*) FROM StudentExamAssignments WHERE exam_id = e.exam_id AND tenant_id = e.tenant_id) as assigned_student_count
       FROM Exams e
       JOIN StudentExamAssignments sea
         ON sea.exam_id = e.exam_id
        AND sea.tenant_id = e.tenant_id
       WHERE e.status = 'published'
         AND e.tenant_id = ?
         AND sea.student_id = ?
       ORDER BY e.created_at DESC`,
      [tenantId, studentId]
    );
    return rows;
  }

  /**
   * Update exam
   */
  static async update(examId, tenantId, updates) {
    const fields = [];
    const values = [];

    const allowedFields = ['title', 'description', 'duration_minutes', 'total_marks', 'status'];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(examId, tenantId);
    const query = `UPDATE Exams SET ${fields.join(', ')} WHERE exam_id = ? AND tenant_id = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete exam
   */
  static async delete(examId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM Exams WHERE exam_id = ? AND tenant_id = ?',
      [examId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get exam with question count
   */
  static async getExamDetails(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT e.*, u.name as created_by_name,
              COUNT(DISTINCT eq.question_id) as question_count,
              COUNT(DISTINCT sea.attempt_id) as total_attempts
       FROM Exams e
       LEFT JOIN Users u ON e.created_by = u.user_id
       LEFT JOIN ExamQuestions eq ON e.exam_id = eq.exam_id AND eq.tenant_id = e.tenant_id
       LEFT JOIN StudentExamAttempts sea ON e.exam_id = sea.exam_id AND sea.tenant_id = e.tenant_id
       WHERE e.exam_id = ? AND e.tenant_id = ?
       GROUP BY e.exam_id`,
      [examId, tenantId]
    );
    return rows[0];
  }

  /**
   * Verify user owns the exam (authorization)
   */
  static async verifyOwnership(examId, tenantId, userId) {
    const [rows] = await pool.execute(
      'SELECT created_by FROM Exams WHERE exam_id = ? AND tenant_id = ?',
      [examId, tenantId]
    );
    if (!rows[0]) return false;
    return rows[0].created_by === userId;
  }
}

module.exports = Exam;
