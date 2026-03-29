const pool = require('../config/connection');
const logger = require('../config/logger');

const ensureColumn = async (table, column, definition) => {
  const [rows] = await pool.execute(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
  if (rows.length === 0) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    logger.info('Migration: added column', { table, column });
  }
};

const runMigrations = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS QuestionBanks (
      bank_id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE,
      UNIQUE KEY unique_tenant_user_bank_name (tenant_id, created_by, name),
      INDEX idx_bank_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureColumn('Questions', 'created_by', 'INT NULL');
  await ensureColumn('Questions', 'question_bank_id', 'INT NULL');

  // Fix: migrate old unique key (tenant_id, name) → (tenant_id, created_by, name)
  // so each teacher can independently name their own banks.
  try {
    const [idxRows] = await pool.execute(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'QuestionBanks'
         AND INDEX_NAME = 'unique_tenant_bank_name'
       LIMIT 1`
    );
    if (idxRows.length > 0) {
      await pool.execute('ALTER TABLE QuestionBanks DROP INDEX unique_tenant_bank_name');
      await pool.execute('ALTER TABLE QuestionBanks ADD UNIQUE KEY unique_tenant_user_bank_name (tenant_id, created_by, name)');
      logger.info('Migration: updated QuestionBanks unique key to (tenant_id, created_by, name)');
    }
  } catch (err) {
    logger.warn('Migration: QuestionBanks unique key migration skipped', { error: err.message });
  }

  const [questionBankFk] = await pool.execute(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Questions'
       AND COLUMN_NAME = 'question_bank_id'
       AND REFERENCED_TABLE_NAME = 'QuestionBanks'
     LIMIT 1`
  );

  if (questionBankFk.length === 0) {
    try {
      await pool.execute('ALTER TABLE Questions ADD CONSTRAINT fk_questions_bank FOREIGN KEY (question_bank_id) REFERENCES QuestionBanks(bank_id) ON DELETE SET NULL');
      logger.info('Migration: added foreign key fk_questions_bank');
    } catch (error) {
      logger.warn('Migration: could not add fk_questions_bank (may already exist)', { error: error.message });
    }
  }

  // Fix: Clean up any duplicate student attempts caused by race conditions 
  // and add a unique constraint to prevent it in the future.
  try {
    const [idxRows] = await pool.execute(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'StudentExamAttempts'
         AND INDEX_NAME = 'unique_attempt_student'
       LIMIT 1`
    );
    if (idxRows.length === 0) {
      // First delete in_progress duplicates, keeping the evaluated/submitted ones
      await pool.execute(`
        DELETE s1 FROM StudentExamAttempts s1
        JOIN StudentExamAttempts s2 
          ON s1.tenant_id = s2.tenant_id 
          AND s1.exam_id = s2.exam_id 
          AND s1.student_id = s2.student_id
          AND ( (s1.status = 'in_progress' AND s2.status != 'in_progress') OR (s1.status = s2.status AND s1.attempt_id < s2.attempt_id) )
      `);
      // Then add the unique constraint
      await pool.execute('ALTER TABLE StudentExamAttempts ADD UNIQUE KEY unique_attempt_student (tenant_id, exam_id, student_id)');
      logger.info('Migration: removed duplicate attempts and added unique_attempt_student constraint');
    }
  } catch (err) {
    logger.warn('Migration: StudentExamAttempts unique key migration skipped', { error: err.message });
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ExamQuestionBanks (
      exam_question_bank_id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      exam_id INT NOT NULL,
      bank_id INT NOT NULL,
      questions_to_pick INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
      FOREIGN KEY (bank_id) REFERENCES QuestionBanks(bank_id) ON DELETE CASCADE,
      UNIQUE KEY unique_exam_bank (tenant_id, exam_id, bank_id),
      INDEX idx_eqb_exam (exam_id),
      INDEX idx_eqb_bank (bank_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS StudentAttemptQuestions (
      attempt_question_id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      attempt_id INT NOT NULL,
      exam_id INT NOT NULL,
      question_id INT NOT NULL,
      question_order INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
      FOREIGN KEY (attempt_id) REFERENCES StudentExamAttempts(attempt_id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
      UNIQUE KEY unique_attempt_question (attempt_id, question_id),
      UNIQUE KEY unique_attempt_order (attempt_id, question_order),
      INDEX idx_saq_attempt (attempt_id),
      INDEX idx_saq_exam (exam_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  logger.info('✅ Database migrations complete');
};

module.exports = {
  runMigrations
};
