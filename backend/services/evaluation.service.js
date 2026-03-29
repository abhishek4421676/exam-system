const StudentAnswer = require('../models/StudentAnswer');
const StudentExamAttempt = require('../models/StudentExamAttempt');
const StudentAttemptQuestion = require('../models/StudentAttemptQuestion');
const Question = require('../models/Question');
const QuestionOption = require('../models/QuestionOption');
const Exam = require('../models/Exam');
const logger = require('../config/logger');

class EvaluationService {
  /**
   * Evaluate exam attempt
   */
  static async evaluateAttempt(attemptId, tenantId) {
    // Get attempt
    const attempt = await StudentExamAttempt.findById(attemptId, tenantId);
    if (!attempt) {
      logger.warn('Attempt not found for evaluation', { attempt_id: attemptId });
      const error = new Error('Attempt not found');
      error.statusCode = 404;
      throw error;
    }

    if (attempt.status !== 'submitted') {
      logger.warn('Attempt to evaluate non-submitted exam', { attempt_id: attemptId, status: attempt.status });
      const error = new Error('Exam must be submitted before evaluation');
      error.statusCode = 400;
      throw error;
    }

    logger.info('Starting evaluation', { attempt_id: attemptId });

    // Drive evaluation from the student's actual submitted answers.
    // This correctly handles both direct-question exams and bank-based exams
    // where questions are stored in StudentAttemptQuestions, not ExamQuestions.
    const submittedAnswers = await StudentAnswer.getAnswersWithKeys(attemptId, tenantId);

    let totalScore = 0;
    const evaluatedAnswers = [];

    for (const answer of submittedAnswers) {
      const positiveMarks = Number(answer.marks || 0);
      const negativeMarks = Number(answer.negative_marks || 0);

      let marksAwarded = 0;
      let isCorrect = false;

      if (answer.question_type === 'MCQ') {
        const selectedOptionId = answer.selected_option_id !== null && answer.selected_option_id !== undefined
          ? Number(answer.selected_option_id)
          : null;
        const correctOptionId = answer.correct_option_id !== null && answer.correct_option_id !== undefined
          ? Number(answer.correct_option_id)
          : null;

        if (selectedOptionId !== null && correctOptionId !== null) {
          if (selectedOptionId === correctOptionId) {
            marksAwarded = positiveMarks;
            isCorrect = true;
          } else {
            marksAwarded = -negativeMarks;
            isCorrect = false;
          }
        }
      } else if (answer.question_type === 'NUMERIC') {
        const numericAnswer = answer.numeric_answer !== null && answer.numeric_answer !== undefined
          ? Number(answer.numeric_answer)
          : null;
        const correctNumericAnswer = answer.correct_numeric_answer !== null && answer.correct_numeric_answer !== undefined
          ? Number(answer.correct_numeric_answer)
          : null;

        if (numericAnswer !== null && correctNumericAnswer !== null) {
          const difference = Math.abs(numericAnswer - correctNumericAnswer);
          if (difference < 0.01) {
            marksAwarded = positiveMarks;
            isCorrect = true;
          } else {
            marksAwarded = -negativeMarks;
            isCorrect = false;
          }
        }
      } else if (answer.question_type === 'DESCRIPTIVE') {
        // Skip — descriptive answers are graded manually by teacher.
        // Preserve whatever marks have already been awarded (don't overwrite to 0).
        totalScore += Number(answer.marks_awarded || 0);
        continue;
      }

      totalScore += marksAwarded;

      evaluatedAnswers.push({
        student_answer_id: answer.student_answer_id,
        question_id: answer.question_id,
        marks_awarded: marksAwarded,
        is_correct: isCorrect
      });
    }

    // Update marks for MCQ/Numeric answers
    await StudentAnswer.bulkUpdateMarks(evaluatedAnswers, tenantId);

    // Update total score in attempt
    await StudentExamAttempt.updateScore(attemptId, totalScore, tenantId);

    logger.info('Evaluation completed', {
      attempt_id: attemptId,
      total_score: totalScore,
      total_answers: submittedAnswers.length
    });

    return {
      attempt_id: attemptId,
      total_score: totalScore,
      total_questions: submittedAnswers.length,
      evaluated_answers: evaluatedAnswers
    };
  }


  /**
   * Manually grade descriptive answer
   */
  static async gradeDescriptiveAnswer(studentAnswerId, marksAwarded, tenantId, teacherId = null) {
    // Get answer by ID
    const answer = await StudentAnswer.findById(studentAnswerId, tenantId);

    if (!answer) {
      logger.warn('Answer not found for grading', { student_answer_id: studentAnswerId });
      const error = new Error('Answer not found');
      error.statusCode = 404;
      throw error;
    }

    const attempt = await StudentExamAttempt.findById(answer.attempt_id, tenantId);
    if (!attempt) {
      const error = new Error('Attempt not found');
      error.statusCode = 404;
      throw error;
    }

    if (teacherId) {
      const ownsExam = await Exam.verifyOwnership(attempt.exam_id, tenantId, teacherId);
      if (!ownsExam) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
    }

    // Validate marks awarded doesn't exceed question's positive marks
    const question = await Question.findById(answer.question_id, tenantId);
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      throw error;
    }
    const maxMarks = Number(question.marks || 0);

    if (marksAwarded < 0 || marksAwarded > maxMarks) {
      const error = new Error(`Marks must be between 0 and ${maxMarks}`);
      error.statusCode = 400;
      throw error;
    }

    logger.info('Manually grading descriptive answer', {
      student_answer_id: studentAnswerId,
      marks_awarded: marksAwarded
    });

    // Update marks - for descriptive, it's always marked as correct/incorrect based on whether marks > 0
    const isCorrect = marksAwarded > 0 ? true : false;
    await StudentAnswer.updateMarks(studentAnswerId, marksAwarded, isCorrect, tenantId);

    // Recalculate total score for the attempt
    const answers = await StudentAnswer.findByAttemptId(answer.attempt_id, tenantId);
    const totalScore = answers.reduce((sum, ans) => sum + Number(ans.marks_awarded || 0), 0);

    // Update total score
    await StudentExamAttempt.updateScore(answer.attempt_id, totalScore, tenantId);

    logger.info('Descriptive answer graded successfully', {
      student_answer_id: studentAnswerId,
      attempt_id: answer.attempt_id,
      new_total_score: totalScore
    });

    return {
      success: true,
      total_score: totalScore
    };
  }

  /**
   * Get evaluation report for attempt
   */
  static async getEvaluationReport(attemptId, tenantId) {
    // Get attempt details
    const attempt = await StudentExamAttempt.findById(attemptId, tenantId);
    if (!attempt) {
      logger.warn('Attempt not found for report', { attempt_id: attemptId });
      const error = new Error('Attempt not found');
      error.statusCode = 404;
      throw error;
    }

    // Use submitted answers as the question source.
    // This correctly shows all answered questions for both direct-question and bank-based exams.
    const submittedAnswers = await StudentAnswer.getAnswersWithKeys(attemptId, tenantId);
    const answersMap = new Map();
    submittedAnswers.forEach(ans => {
      answersMap.set(ans.question_id, ans);
    });

    // Compute "unanswered" as: questions in the attempt paper - questions that have a StudentAnswers row.
    // (StudentAnswer.getAnswersWithKeys only returns questions that were answered.)
    const attemptQuestions = await StudentAttemptQuestion.findByAttemptId(attemptId, tenantId);
    const totalQuestions = attemptQuestions.length;
    const answeredQuestionIds = new Set(submittedAnswers.map(ans => ans.question_id));
    const unanswered = Math.max(0, totalQuestions - answeredQuestionIds.size);

    // Get answer options for each MCQ answer
    const questionDetailsMap = new Map();
    for (const ans of submittedAnswers) {
      if (ans.question_type === 'MCQ') {
        const options = await QuestionOption.findByQuestionId(ans.question_id, tenantId);
        questionDetailsMap.set(ans.question_id, { options });
      }
    }

    // Build detailed questions report from submitted answers
    const questionsReport = submittedAnswers.map(answer => {
      const questionDetails = questionDetailsMap.get(answer.question_id);
      const options = questionDetails?.options || [];

      const baseQuestion = {
        question_id: answer.question_id,
        question_text: answer.question_text,
        question_type: answer.question_type,
        marks: answer.marks,
        negative_marks: answer.negative_marks,
        marks_awarded: answer.marks_awarded !== null && answer.marks_awarded !== undefined ? Number(answer.marks_awarded) : null,
        is_correct: answer.is_correct
      };

      // Add type-specific details
      if (answer.question_type === 'MCQ') {
        return {
          ...baseQuestion,
          options: options.map(opt => ({
            option_id: opt.option_id,
            option_text: opt.option_text,
            is_correct: opt.is_correct ? true : false
          })),
          student_answer: {
            selected_option_id: answer.selected_option_id,
            selected_option_text: options.find(o => o.option_id === answer.selected_option_id)?.option_text || 'Not answered'
          }
        };
      } else if (answer.question_type === 'NUMERIC') {
        return {
          ...baseQuestion,
          correct_numeric_answer: answer.correct_numeric_answer || null,
          student_answer: { numeric_answer: answer.numeric_answer }
        };
      } else if (answer.question_type === 'DESCRIPTIVE') {
        return {
          ...baseQuestion,
          status: answer.is_correct === null ? 'pending_manual_grading' : 'evaluated',
          student_answer: { descriptive_answer: answer.descriptive_answer }
        };
      }

      return baseQuestion;
    });

    // Calculate percentage using the exam's total_marks field
    const totalMarks = Number(attempt.total_marks || 0);
    const percentage = totalMarks > 0 ? ((attempt.total_score / totalMarks) * 100).toFixed(2) : 0;

    // Calculate statistics from submitted answers
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let pendingEvaluation = 0;

    submittedAnswers.forEach(answer => {
      if (answer.is_correct === null) {
        pendingEvaluation++;
      } else if (answer.is_correct === true || answer.is_correct === 1) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }
    });

    const report = {
      attempt_id: attemptId,
      exam_id: attempt.exam_id,
      student_id: attempt.student_id,
      student_name: attempt.student_name,
      exam_title: attempt.exam_title,
      total_score: attempt.total_score,
      total_marks: totalMarks,
      percentage: parseFloat(percentage),
      status: attempt.status,
      start_time: attempt.start_time,
      end_time: attempt.end_time,
      duration_minutes: attempt.duration_minutes,
      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      pending_evaluation: pendingEvaluation,
      unanswered: unanswered,
      questions: questionsReport
    };

    return report;
  }

  /**
   * Auto-evaluate all submitted exams
   */
  static async autoEvaluateSubmittedExams(examId, tenantId) {
    logger.info('Auto-evaluating submitted exams', { exam_id: examId });
    const attempts = await StudentExamAttempt.findByExamId(examId, tenantId);
    const results = [];

    for (const attempt of attempts) {
      if (attempt.status === 'submitted') {
        try {
          const result = await this.evaluateAttempt(attempt.attempt_id, tenantId);
          results.push(result);
        } catch (error) {
          logger.error('Failed to evaluate attempt', {
            attempt_id: attempt.attempt_id,
            error: error.message
          });
          results.push({
            attempt_id: attempt.attempt_id,
            error: error.message
          });
        }
      }
    }

    logger.info('Auto-evaluation completed', {
      exam_id: examId,
      total_evaluated: results.length
    });
    return results;
  }

  /**
   * Get pending descriptive answers for teacher
   */
  static async getPendingDescriptiveAnswers(teacherId, tenantId, examId = null) {
    const pool = require('../config/connection');

    let query = `
        SELECT 
          sa.student_answer_id,
          sa.attempt_id,
          sa.question_id,
          sa.descriptive_answer,
          q.question_text,
          q.marks,
          sea.student_id,
          u.name as student_name,
          e.exam_id,
          e.title as exam_title,
          sea.start_time,
          sea.end_time
        FROM StudentAnswers sa
        JOIN StudentExamAttempts sea ON sa.attempt_id = sea.attempt_id
        JOIN Questions q ON sa.question_id = q.question_id
        JOIN Exams e ON sea.exam_id = e.exam_id
        JOIN Users u ON sea.student_id = u.user_id
        WHERE q.question_type = 'DESCRIPTIVE' 
          AND sa.is_correct IS NULL
          AND sea.status IN ('submitted', 'evaluated')
          AND e.created_by = ?
          AND sa.tenant_id = ?
      `;

    const params = [teacherId, tenantId];

    if (examId) {
      query += ` AND e.exam_id = ?`;
      params.push(examId);
    }

    query += ` ORDER BY sa.attempt_id, q.question_id`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = EvaluationService;
