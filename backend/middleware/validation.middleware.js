const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler
 * Returns formatted validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (value) => {
  if (typeof value === 'string') {
    return value
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .substring(0, 10000); // Limit length
  }
  return value;
};

/**
 * Authentication Validators
 */
const authValidators = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2-255 characters')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces')
      .customSanitizer(sanitizeInput),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail()
      .isLength({ max: 255 }).withMessage('Email too long'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
    
    body('role')
      .optional()
      .isIn(['admin', 'tenant_admin', 'teacher', 'student']).withMessage('Role must be admin, tenant_admin, teacher, or student'),
    
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
  ],
  
  changePassword: [
    body('oldPassword')
      .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
    
    handleValidationErrors
  ]
};

/**
 * Exam Validators
 */
const examValidators = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3-255 characters')
      .customSanitizer(sanitizeInput),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Description too long')
      .customSanitizer(sanitizeInput),
    
    body('duration_minutes')
      .notEmpty().withMessage('Duration is required')
      .isInt({ min: 1, max: 1440 }).withMessage('Duration must be between 1-1440 minutes'),
    
    body('total_marks')
      .notEmpty().withMessage('Total marks is required')
      .isInt({ min: 1, max: 10000 }).withMessage('Total marks must be between 1-10000'),
    
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid exam ID'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3-255 characters')
      .customSanitizer(sanitizeInput),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Description too long')
      .customSanitizer(sanitizeInput),
    
    body('duration_minutes')
      .optional()
      .isInt({ min: 1, max: 1440 }).withMessage('Duration must be between 1-1440 minutes'),
    
    body('total_marks')
      .optional()
      .isInt({ min: 1, max: 10000 }).withMessage('Total marks must be between 1-10000'),
    
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    
    handleValidationErrors
  ],
  
  addQuestions: [
    param('examId')
      .isInt({ min: 1 }).withMessage('Invalid exam ID'),
    
    body('question_ids')
      .isArray({ min: 1 }).withMessage('question_ids must be a non-empty array')
      .custom((value) => {
        if (!value.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('All question IDs must be positive integers');
        }
        return true;
      }),
    
    handleValidationErrors
  ]
};

/**
 * Question Validators
 */
const questionValidators = {
  create: [
    body('question_text')
      .trim()
      .notEmpty().withMessage('Question text is required')
      .isLength({ min: 5, max: 5000 }).withMessage('Question text must be between 5-5000 characters')
      .customSanitizer(sanitizeInput),
    
    body('question_type')
      .notEmpty().withMessage('Question type is required')
      .isIn(['MCQ', 'NUMERIC', 'DESCRIPTIVE']).withMessage('Invalid question type'),
    
    body('marks')
      .notEmpty().withMessage('Marks is required')
      .isInt({ min: 1, max: 100 }).withMessage('Marks must be between 1-100'),
    
    body('negative_marks')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Negative marks must be between 0-100'),

    body('question_bank_id')
      .optional({ nullable: true })
      .isInt({ min: 1 }).withMessage('question_bank_id must be a positive integer'),
    
    // MCQ specific validations
    body('options')
      .if(body('question_type').equals('MCQ'))
      .isArray({ min: 2, max: 10 }).withMessage('MCQ must have 2-10 options'),
    
    body('options.*')
      .if(body('question_type').equals('MCQ'))
      .trim()
      .notEmpty().withMessage('Option cannot be empty')
      .isLength({ max: 1000 }).withMessage('Option text too long')
      .customSanitizer(sanitizeInput),
    
    body('correct_option_index')
      .if(body('question_type').equals('MCQ'))
      .notEmpty().withMessage('Correct option index is required for MCQ')
      .isInt({ min: 0 }).withMessage('Invalid correct option index'),
    
    // Numeric specific validations
    body('correct_numeric_answer')
      .if(body('question_type').equals('NUMERIC'))
      .notEmpty().withMessage('Correct numeric answer is required')
      .isFloat().withMessage('Answer must be a number'),
    
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid question ID'),
    
    body('question_text')
      .optional()
      .trim()
      .isLength({ min: 5, max: 5000 }).withMessage('Question text must be between 5-5000 characters')
      .customSanitizer(sanitizeInput),
    
    body('marks')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Marks must be between 1-100'),
    
    body('negative_marks')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Negative marks must be between 0-100'),
    
    handleValidationErrors
  ]
};

/**
 * Attempt Validators
 */
const attemptValidators = {
  startExam: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid exam ID'),
    
    handleValidationErrors
  ],
  
  saveAnswer: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid exam ID'),
    
    body('attempt_id')
      .notEmpty().withMessage('Attempt ID is required')
      .isInt({ min: 1 }).withMessage('Invalid attempt ID'),
    
    body('question_id')
      .notEmpty().withMessage('Question ID is required')
      .isInt({ min: 1 }).withMessage('Invalid question ID'),
    
    body('selected_option_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Invalid option ID'),
    
    body('numeric_answer')
      .optional()
      .isFloat().withMessage('Numeric answer must be a number'),
    
    body('descriptive_answer')
      .optional()
      .trim()
      .isLength({ max: 10000 }).withMessage('Answer too long')
      .customSanitizer(sanitizeInput),
    
    handleValidationErrors
  ],
  
  submitExam: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid exam ID'),
    
    body('attempt_id')
      .notEmpty().withMessage('Attempt ID is required')
      .isInt({ min: 1 }).withMessage('Invalid attempt ID'),
    
    handleValidationErrors
  ],

  gradeAnswer: [
    body('student_answer_id')
      .notEmpty().withMessage('Student answer ID is required')
      .isInt({ min: 1 }).withMessage('Invalid student answer ID'),

    body('marks_awarded')
      .notEmpty().withMessage('Marks awarded is required')
      .isFloat({ min: 0 }).withMessage('Marks must be a non-negative number'),

    handleValidationErrors
  ]
};

/**
 * Common ID validator
 */
const idValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID'),
  
  handleValidationErrors
];

module.exports = {
  authValidators,
  examValidators,
  questionValidators,
  attemptValidators,
  idValidator,
  handleValidationErrors
};
