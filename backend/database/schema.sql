
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

DROP TABLE IF EXISTS `AnswerKeys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AnswerKeys` (
  `answer_key_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `question_id` int NOT NULL,
  `correct_option_id` int DEFAULT NULL,
  `correct_numeric_answer` decimal(10,4) DEFAULT NULL,
  `correct_text_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`answer_key_id`),
  UNIQUE KEY `unique_question` (`question_id`),
  KEY `correct_option_id` (`correct_option_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_answerkeys_tenant_id` (`tenant_id`),
  CONSTRAINT `AnswerKeys_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `Questions` (`question_id`) ON DELETE CASCADE,
  CONSTRAINT `AnswerKeys_ibfk_2` FOREIGN KEY (`correct_option_id`) REFERENCES `QuestionOptions` (`option_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ExamQuestionBanks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExamQuestionBanks` (
  `exam_question_bank_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `bank_id` int NOT NULL,
  `questions_to_pick` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`exam_question_bank_id`),
  UNIQUE KEY `unique_exam_bank` (`tenant_id`,`exam_id`,`bank_id`),
  KEY `idx_eqb_exam` (`exam_id`),
  KEY `idx_eqb_bank` (`bank_id`),
  CONSTRAINT `ExamQuestionBanks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `ExamQuestionBanks_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `ExamQuestionBanks_ibfk_3` FOREIGN KEY (`bank_id`) REFERENCES `QuestionBanks` (`bank_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ExamQuestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExamQuestions` (
  `exam_question_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `exam_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_order` int NOT NULL,
  PRIMARY KEY (`exam_question_id`),
  UNIQUE KEY `unique_exam_question` (`exam_id`,`question_id`),
  KEY `idx_exam_id` (`exam_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_examquestions_tenant_id` (`tenant_id`),
  CONSTRAINT `ExamQuestions_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `ExamQuestions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `Questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ExamSections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExamSections` (
  `section_id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `section_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_order` int NOT NULL DEFAULT '1',
  `section_instructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`section_id`),
  KEY `idx_exam_id` (`exam_id`),
  CONSTRAINT `ExamSections_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Exams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Exams` (
  `exam_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `duration_minutes` int NOT NULL,
  `total_marks` int NOT NULL,
  `created_by` int NOT NULL,
  `status` enum('draft','published','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`exam_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `Exams_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Invitations` (
  `invitation_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_role` enum('student','teacher','admin','tenant_admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `status` enum('pending','accepted','rejected','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `invited_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT ((now() + interval 30 day)),
  `used_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`invitation_id`),
  UNIQUE KEY `unique_pending_invite` (`tenant_id`,`email`,`status`),
  KEY `invited_by` (`invited_by`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `Invitations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `Invitations_ibfk_2` FOREIGN KEY (`invited_by`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `QuestionBanks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QuestionBanks` (
  `bank_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bank_id`),
  UNIQUE KEY `unique_tenant_user_bank_name` (`tenant_id`,`created_by`,`name`),
  KEY `created_by` (`created_by`),
  KEY `idx_bank_tenant` (`tenant_id`),
  CONSTRAINT `QuestionBanks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `QuestionBanks_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `QuestionOptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QuestionOptions` (
  `option_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `question_id` int NOT NULL,
  `option_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_order` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`option_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_questionoptions_tenant_id` (`tenant_id`),
  CONSTRAINT `QuestionOptions_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `Questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `question_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('MCQ','NUMERIC','DESCRIPTIVE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `marks` int NOT NULL,
  `created_by` int NOT NULL DEFAULT '1',
  `negative_marks` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `question_bank_id` int DEFAULT NULL,
  PRIMARY KEY (`question_id`),
  KEY `idx_question_type` (`question_type`),
  KEY `created_by` (`created_by`),
  KEY `fk_questions_tenant` (`tenant_id`),
  KEY `fk_questions_bank` (`question_bank_id`),
  CONSTRAINT `fk_questions_bank` FOREIGN KEY (`question_bank_id`) REFERENCES `QuestionBanks` (`bank_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_questions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `Questions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `Users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `RefreshTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefreshTokens` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `refresh_token` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_revoked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `refresh_token` (`refresh_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_refresh_token` (`refresh_token`(64)),
  CONSTRAINT `RefreshTokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `StudentAnswers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StudentAnswers` (
  `student_answer_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `attempt_id` int NOT NULL,
  `question_id` int NOT NULL,
  `selected_option_id` int DEFAULT NULL,
  `numeric_answer` decimal(10,4) DEFAULT NULL,
  `descriptive_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `marks_awarded` decimal(5,2) DEFAULT '0.00',
  `is_correct` tinyint(1) DEFAULT NULL,
  `answered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_answer_id`),
  UNIQUE KEY `unique_attempt_question` (`attempt_id`,`question_id`),
  KEY `selected_option_id` (`selected_option_id`),
  KEY `idx_attempt_id` (`attempt_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_studentanswers_tenant_id` (`tenant_id`),
  CONSTRAINT `StudentAnswers_ibfk_1` FOREIGN KEY (`attempt_id`) REFERENCES `StudentExamAttempts` (`attempt_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentAnswers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `Questions` (`question_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentAnswers_ibfk_3` FOREIGN KEY (`selected_option_id`) REFERENCES `QuestionOptions` (`option_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `StudentAttemptQuestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StudentAttemptQuestions` (
  `attempt_question_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `attempt_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_order` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attempt_question_id`),
  UNIQUE KEY `unique_attempt_question` (`attempt_id`,`question_id`),
  UNIQUE KEY `unique_attempt_order` (`attempt_id`,`question_order`),
  KEY `tenant_id` (`tenant_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_saq_attempt` (`attempt_id`),
  KEY `idx_saq_exam` (`exam_id`),
  CONSTRAINT `StudentAttemptQuestions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentAttemptQuestions_ibfk_2` FOREIGN KEY (`attempt_id`) REFERENCES `StudentExamAttempts` (`attempt_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentAttemptQuestions_ibfk_3` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentAttemptQuestions_ibfk_4` FOREIGN KEY (`question_id`) REFERENCES `Questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `StudentExamAssignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StudentExamAssignments` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `student_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `unique_exam_student_tenant` (`tenant_id`,`exam_id`,`student_id`),
  KEY `idx_assignment_tenant` (`tenant_id`),
  KEY `idx_assignment_exam` (`exam_id`),
  KEY `idx_assignment_student` (`student_id`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `StudentExamAssignments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentExamAssignments_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentExamAssignments_ibfk_3` FOREIGN KEY (`student_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentExamAssignments_ibfk_4` FOREIGN KEY (`assigned_by`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `StudentExamAttempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StudentExamAttempts` (
  `attempt_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `exam_id` int NOT NULL,
  `student_id` int NOT NULL,
  `start_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `total_score` decimal(10,2) DEFAULT '0.00',
  `status` enum('in_progress','submitted','evaluated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  PRIMARY KEY (`attempt_id`),
  UNIQUE KEY `unique_attempt_student` (`tenant_id`,`exam_id`,`student_id`),
  KEY `idx_exam_id` (`exam_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_studentexamattempts_tenant_id` (`tenant_id`),
  CONSTRAINT `StudentExamAttempts_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `Exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `StudentExamAttempts_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `SystemLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SystemLogs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `log_level` enum('info','warn','error','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `event_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `exam_id` int DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `request_method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_body` json DEFAULT NULL,
  `response_status` int DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `details` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_log_level` (`log_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tenants` (
  `tenant_id` int NOT NULL AUTO_INCREMENT,
  `subdomain` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `subdomain` (`subdomain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `UnauthorizedLogins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UnauthorizedLogins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_google_id` (`google_id`),
  KEY `idx_email` (`email`),
  KEY `idx_attempted_at` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','tenant_admin','teacher','student') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_google_id` (`google_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `Users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

