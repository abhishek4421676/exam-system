const Exam = require('../models/Exam');
const Question = require('../models/Question');
const logger = require('../config/logger');

/**
 * Authorization middleware to check ownership
 * Allows:
 * - Teacher: access only to resources they created
 * - Student: no access to creation/editing
 */

const checkExamOwnership = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (userRole !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can modify exams'
      });
    }

    // Teacher needs to own the exam
    const isOwner = await Exam.verifyOwnership(examId, req.tenant_id, userId);
    
    if (!isOwner) {
      logger.warn('Unauthorized exam access attempt', { 
        user_id: userId, 
        exam_id: examId, 
        role: userRole 
      });
      
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this exam'
      });
    }

    next();
  } catch (error) {
    logger.error('Authorization check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

const checkQuestionOwnership = async (req, res, next) => {
  try {
    const questionId = req.params.id || req.params.questionId;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (userRole !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can modify questions'
      });
    }

    // Teacher needs to own the question
    const isOwner = await Question.verifyOwnership(questionId, req.tenant_id, userId);
    
    if (!isOwner) {
      logger.warn('Unauthorized question access attempt', { 
        user_id: userId, 
        question_id: questionId, 
        role: userRole 
      });
      
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this question'
      });
    }

    next();
  } catch (error) {
    logger.error('Authorization check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

const checkCanCreateExam = (req, res, next) => {
  const userRole = req.user.role;
  
  if (userRole !== 'teacher') {
    logger.warn('Unauthorized exam creation attempt', { 
      user_id: req.user.user_id, 
      role: userRole 
    });
    
    return res.status(403).json({
      success: false,
      message: 'Only teachers can create exams'
    });
  }

  next();
};

const checkCanCreateQuestion = (req, res, next) => {
  const userRole = req.user.role;
  
  if (userRole !== 'teacher') {
    logger.warn('Unauthorized question creation attempt', { 
      user_id: req.user.user_id, 
      role: userRole 
    });
    
    return res.status(403).json({
      success: false,
      message: 'Only teachers can create questions'
    });
  }

  next();
};

const checkCanTakeExam = (req, res, next) => {
  const userRole = req.user.role;
  
  if (userRole !== 'student') {
    logger.warn('Unauthorized exam attempt', { 
      user_id: req.user.user_id, 
      role: userRole 
    });
    
    return res.status(403).json({
      success: false,
      message: 'Only students can take exams'
    });
  }

  next();
};

module.exports = {
  checkExamOwnership,
  checkQuestionOwnership,
  checkCanCreateExam,
  checkCanCreateQuestion,
  checkCanTakeExam
};
