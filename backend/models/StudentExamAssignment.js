const pool = require('../config/connection');

class StudentExamAssignment {
  static async listByExam(tenantId, examId) {
    const [rows] = await pool.execute(
      `SELECT sea.assignment_id, sea.exam_id, sea.student_id, sea.assigned_by, sea.assigned_at,
              u.name as student_name, u.email as student_email
       FROM StudentExamAssignments sea
       JOIN Users u ON u.user_id = sea.student_id AND u.tenant_id = sea.tenant_id
       WHERE sea.tenant_id = ? AND sea.exam_id = ?
       ORDER BY u.name ASC`,
      [tenantId, examId]
    );
    return rows;
  }

  static async listStudentIdsByExam(tenantId, examId) {
    const [rows] = await pool.execute(
      `SELECT student_id
       FROM StudentExamAssignments
       WHERE tenant_id = ? AND exam_id = ?`,
      [tenantId, examId]
    );
    return rows.map((row) => row.student_id);
  }

  static async replaceExamAssignments(tenantId, examId, studentIds, assignedBy) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `DELETE FROM StudentExamAssignments
         WHERE tenant_id = ? AND exam_id = ?`,
        [tenantId, examId]
      );

      if (studentIds.length > 0) {
        for (const studentId of studentIds) {
          await connection.execute(
            `INSERT INTO StudentExamAssignments (tenant_id, exam_id, student_id, assigned_by)
             VALUES (?, ?, ?, ?)`,
            [tenantId, examId, studentId, assignedBy]
          );
        }
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

  static async isAssigned(tenantId, examId, studentId) {
    const [rows] = await pool.execute(
      `SELECT 1
       FROM StudentExamAssignments
       WHERE tenant_id = ? AND exam_id = ? AND student_id = ?
       LIMIT 1`,
      [tenantId, examId, studentId]
    );
    return rows.length > 0;
  }
}

module.exports = StudentExamAssignment;