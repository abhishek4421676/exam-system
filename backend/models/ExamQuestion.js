const pool = require('../config/connection');
const ExamQuestionBank = require('./ExamQuestionBank');
const StudentAttemptQuestion = require('./StudentAttemptQuestion');
const { shuffleArray, randomizeOptions } = require('../utils/randomize.util');

class ExamQuestion {
  /**
   * Add question to exam
   */
  static async create(examQuestionData) {
    const { tenant_id, exam_id, question_id, question_order } = examQuestionData;
    const [result] = await pool.execute(
      'INSERT INTO ExamQuestions (tenant_id, exam_id, question_id, question_order) VALUES (?, ?, ?, ?)',
      [tenant_id, exam_id, question_id, question_order]
    );
    return result.insertId;
  }

  /**
   * Add multiple questions to exam
   */
  static async addMultipleQuestions(tenantId, examId, questionIds) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      for (let i = 0; i < questionIds.length; i++) {
        await connection.execute(
          'INSERT INTO ExamQuestions (tenant_id, exam_id, question_id, question_order) VALUES (?, ?, ?, ?)',
          [tenantId, examId, questionIds[i], i + 1]
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
   * Get all questions for an exam
   */
  static async findByExamId(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT eq.*, q.question_text, q.question_type, q.marks, q.negative_marks
       FROM ExamQuestions eq
       JOIN Questions q ON eq.question_id = q.question_id
       WHERE eq.exam_id = ? AND eq.tenant_id = ?
       ORDER BY eq.question_order`,
      [examId, tenantId]
    );
    return rows;
  }

  /**
   * Get questions with options for an exam (without answers)
   */
  static async getExamQuestionsForStudent(examId, tenantId, attemptId = null) {
    const paperQuestionIds = attemptId
      ? await this.getOrCreateAttemptPaper(examId, tenantId, attemptId)
      : await this.getDirectQuestionIds(examId, tenantId);

    if (!paperQuestionIds.length) {
      return [];
    }

    const placeholders = paperQuestionIds.map(() => '?').join(',');
    const [questions] = await pool.execute(
      `SELECT q.question_id, q.question_text, q.question_type, q.marks
       FROM Questions q
       WHERE q.tenant_id = ? AND q.question_id IN (${placeholders})`,
      [tenantId, ...paperQuestionIds]
    );

    const orderMap = new Map(paperQuestionIds.map((id, index) => [Number(id), index + 1]));

    const orderedQuestions = questions
      .sort((a, b) => (orderMap.get(Number(a.question_id)) || 0) - (orderMap.get(Number(b.question_id)) || 0))
      .map((question) => ({
        ...question,
        question_order: orderMap.get(Number(question.question_id)) || 0
      }));

    for (const question of orderedQuestions) {
      if (question.question_type === 'MCQ') {
        const [options] = await pool.execute(
          `SELECT option_id, option_text, option_order
           FROM QuestionOptions
           WHERE question_id = ? AND tenant_id = ?
           ORDER BY option_order`,
          [question.question_id, tenantId]
        );
        const seed = attemptId ? `${attemptId}:${question.question_id}` : `exam:${examId}:${question.question_id}`;
        question.options = randomizeOptions(options, seed);
      }
    }

    return orderedQuestions;
  }

  static async getDirectQuestionIds(examId, tenantId) {
    const [rows] = await pool.execute(
      `SELECT q.question_id
       FROM ExamQuestions eq
       JOIN Questions q ON q.question_id = eq.question_id
       WHERE eq.exam_id = ? AND eq.tenant_id = ?
       ORDER BY eq.question_order`,
      [examId, tenantId]
    );

    return rows.map(row => Number(row.question_id));
  }

  static async getOrCreateAttemptPaper(examId, tenantId, attemptId) {
    const existing = await StudentAttemptQuestion.findByAttemptId(attemptId, tenantId);
    if (existing.length) {
      return existing.map(row => Number(row.question_id));
    }

    const directQuestionIds = await this.getDirectQuestionIds(examId, tenantId);
    const bankConfigs = await ExamQuestionBank.findByExamId(examId, tenantId);

    const combinedSet = new Set(directQuestionIds.map(Number));

    for (const config of bankConfigs) {
      const [candidates] = await pool.execute(
        `SELECT question_id
         FROM Questions
         WHERE tenant_id = ? AND question_bank_id = ?`,
        [tenantId, config.bank_id]
      );

      const candidateIds = shuffleArray(candidates.map(row => Number(row.question_id)));
      const requiredCount = Math.max(0, Number(config.questions_to_pick || 0));
      const selected = candidateIds.slice(0, requiredCount);

      selected.forEach(id => combinedSet.add(id));
    }

    const shuffledQuestionIds = shuffleArray(Array.from(combinedSet));
    await StudentAttemptQuestion.createPaper(tenantId, attemptId, examId, shuffledQuestionIds);

    return shuffledQuestionIds;
  }

  /**
   * Remove question from exam
   */
  static async delete(examId, questionId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM ExamQuestions WHERE exam_id = ? AND question_id = ? AND tenant_id = ?',
      [examId, questionId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Remove all questions from exam
   */
  static async deleteByExamId(examId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM ExamQuestions WHERE exam_id = ? AND tenant_id = ?',
      [examId, tenantId]
    );
    return result.affectedRows;
  }

  /**
   * Check if question exists in exam
   */
  static async exists(examId, questionId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM ExamQuestions WHERE exam_id = ? AND question_id = ? AND tenant_id = ?',
      [examId, questionId, tenantId]
    );
    return rows[0].count > 0;
  }

  /**
   * Get question count for exam
   */
  static async getQuestionCount(examId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM ExamQuestions WHERE exam_id = ? AND tenant_id = ?',
      [examId, tenantId]
    );
    return rows[0].count;
  }

  static async getEffectiveQuestionCount(examId, tenantId) {
    const directCount = await this.getQuestionCount(examId, tenantId);
    const bankConfigs = await ExamQuestionBank.findByExamId(examId, tenantId);

    let bankQuestionCount = 0;
    for (const config of bankConfigs) {
      const available = Number(config.available_questions || 0);
      const requested = Number(config.questions_to_pick || 0);
      bankQuestionCount += Math.min(available, requested);
    }

    return Number(directCount || 0) + bankQuestionCount;
  }
}

module.exports = ExamQuestion;
