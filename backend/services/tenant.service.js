const bcrypt = require('bcrypt');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Exam = require('../models/Exam');
const StudentExamAssignment = require('../models/StudentExamAssignment');

class TenantService {
  static async getSettings(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      const error = new Error('Tenant not found');
      error.statusCode = 404;
      throw error;
    }

    return tenant;
  }

  static async updateSettings(tenantId, updates) {
    const updated = await Tenant.updateBranding(tenantId, updates);
    if (!updated) {
      const error = new Error('No settings updated');
      error.statusCode = 400;
      throw error;
    }

    return this.getSettings(tenantId);
  }

  static async listUsers(tenantId, filters = {}) {
    return User.findAll(tenantId, filters);
  }

  static async inviteUser(tenantId, userData) {
    const { name, email, role, password } = userData;

    if (!['teacher', 'student'].includes(role)) {
      const error = new Error('Only teacher and student roles can be invited');
      error.statusCode = 400;
      throw error;
    }

    const exists = await User.emailExists(email.toLowerCase(), tenantId);
    if (exists) {
      const error = new Error('Email already registered in this tenant');
      error.statusCode = 409;
      throw error;
    }

    const rawPassword = password || Math.random().toString(36).slice(-10);
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const password_hash = await bcrypt.hash(rawPassword, saltRounds);

    const userId = await User.create({
      tenant_id: tenantId,
      name,
      email: email.toLowerCase(),
      password_hash,
      role
    });

    const user = await User.findById(userId, tenantId);

    return {
      user,
      temporary_password: password ? undefined : rawPassword
    };
  }

  static async removeUser(tenantId, userId) {
    const deleted = await User.delete(userId, tenantId);
    if (!deleted) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return true;
  }

  static async listExamsForAssignment(tenantId) {
    const exams = await Exam.findAll(tenantId);
    return exams.map((exam) => ({
      exam_id: exam.exam_id,
      title: exam.title,
      status: exam.status,
      question_count: exam.question_count || 0,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      created_at: exam.created_at,
      updated_at: exam.updated_at
    }));
  }

  static async listStudentsForExam(tenantId, examId) {
    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    const [students, assignedStudentIds] = await Promise.all([
      User.findAll(tenantId, { role: 'student' }),
      StudentExamAssignment.listStudentIdsByExam(tenantId, examId)
    ]);

    const assignedSet = new Set(assignedStudentIds.map((id) => Number(id)));

    return {
      exam,
      students: students.map((student) => ({
        ...student,
        assigned: assignedSet.has(Number(student.user_id))
      }))
    };
  }

  static async assignStudentsToExam(tenantId, examId, studentIds, assignedBy) {
    const normalizedStudentIds = Array.from(
      new Set((studentIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
    );

    const exam = await Exam.findById(examId, tenantId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      throw error;
    }

    const students = await User.findAll(tenantId, { role: 'student' });
    const validStudentIds = new Set(students.map((student) => Number(student.user_id)));

    const invalidIds = normalizedStudentIds.filter((id) => !validStudentIds.has(id));
    if (invalidIds.length > 0) {
      const error = new Error('Some selected users are not valid students in this tenant');
      error.statusCode = 400;
      throw error;
    }

    await StudentExamAssignment.replaceExamAssignments(tenantId, examId, normalizedStudentIds, assignedBy);

    return {
      exam_id: Number(examId),
      assigned_student_count: normalizedStudentIds.length,
      assigned_student_ids: normalizedStudentIds
    };
  }
}

module.exports = TenantService;
