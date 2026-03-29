const fs = require('fs');
const readline = require('readline');

/**
 * Parse CSV file for bulk question upload
 * Expected CSV format:
 * question_text,question_type,marks,negative_marks,option1,option2,option3,option4,correct_answer
 * 
 * @param {String} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of parsed questions
 */
const parseQuestionsCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const questions = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let isFirstLine = true;

    rl.on('line', (line) => {
      if (isFirstLine) {
        isFirstLine = false;
        return; // Skip header
      }

      const parts = line.split(',');
      if (parts.length < 4) return;

      const question = {
        question_text: parts[0]?.trim(),
        question_type: parts[1]?.trim().toUpperCase(),
        marks: parseInt(parts[2]?.trim()) || 0,
        negative_marks: parseFloat(parts[3]?.trim()) || 0,
        options: [],
        correct_answer: null
      };

      // Parse options for MCQ
      if (question.question_type === 'MCQ') {
        for (let i = 4; i < parts.length - 1; i++) {
          if (parts[i]?.trim()) {
            question.options.push(parts[i].trim());
          }
        }
        question.correct_answer = parts[parts.length - 1]?.trim();
      } else if (question.question_type === 'NUMERIC') {
        question.correct_answer = parseFloat(parts[4]?.trim());
      }

      questions.push(question);
    });

    rl.on('close', () => {
      resolve(questions);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Validate CSV data
 * @param {Array} questions - Array of question objects
 * @returns {Object} Validation result with errors
 */
const validateQuestionsData = (questions) => {
  const errors = [];
  const validTypes = ['MCQ', 'NUMERIC', 'DESCRIPTIVE'];

  questions.forEach((question, index) => {
    if (!question.question_text) {
      errors.push(`Row ${index + 2}: Missing question text`);
    }
    if (!validTypes.includes(question.question_type)) {
      errors.push(`Row ${index + 2}: Invalid question type`);
    }
    if (question.marks <= 0) {
      errors.push(`Row ${index + 2}: Marks must be positive`);
    }
    if (question.question_type === 'MCQ' && question.options.length < 2) {
      errors.push(`Row ${index + 2}: MCQ must have at least 2 options`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  parseQuestionsCSV,
  validateQuestionsData
};
