-- ===============================================
-- Online Examination System - Database Schema
-- ===============================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS exam_system;

-- Use the database
USE exam_system;

-- Disable foreign key checks to allow dropping tables
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS StudentAnswers;
DROP TABLE IF EXISTS StudentExamAttempts;
DROP TABLE IF EXISTS ExamQuestions;
DROP TABLE IF EXISTS AnswerKeys;
DROP TABLE IF EXISTS QuestionOptions;
DROP TABLE IF EXISTS Questions;
DROP TABLE IF EXISTS Exams;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Tenants;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ===============================================
-- Tenants Table
-- ===============================================
CREATE TABLE Tenants (
    tenant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(1024) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subdomain (subdomain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- Users Table
-- ===============================================
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('tenant_admin', 'teacher', 'student') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_email (tenant_id, email),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- Exams Table
-- ===============================================
CREATE TABLE Exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    total_marks INT NOT NULL,
    created_by INT NOT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- Questions Table
-- ===============================================
CREATE TABLE Questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('MCQ', 'NUMERIC', 'DESCRIPTIVE') NOT NULL,
    marks INT NOT NULL,
    negative_marks DECIMAL(5,2) DEFAULT 0.00,
    created_by INT NULL,
    question_bank_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_question_type (question_type),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- QuestionOptions Table (for MCQ questions)
-- ===============================================
CREATE TABLE QuestionOptions (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_order INT NOT NULL DEFAULT 1,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- AnswerKeys Table
-- ===============================================
CREATE TABLE AnswerKeys (
    answer_key_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    question_id INT NOT NULL,
    correct_option_id INT NULL,
    correct_numeric_answer DECIMAL(10,4) NULL,
    correct_text_answer TEXT NULL,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
    FOREIGN KEY (correct_option_id) REFERENCES QuestionOptions(option_id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_question_id (question_id),
    UNIQUE KEY unique_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- ExamQuestions Table (Many-to-Many mapping)
-- ===============================================
CREATE TABLE ExamQuestions (
    exam_question_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    question_id INT NOT NULL,
    question_order INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
    UNIQUE KEY unique_exam_question (exam_id, question_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- StudentExamAssignments Table (Exam access control)
-- ===============================================
CREATE TABLE StudentExamAssignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES Users(user_id) ON DELETE SET NULL,
    UNIQUE KEY unique_exam_student_tenant (tenant_id, exam_id, student_id),
    INDEX idx_assignment_tenant (tenant_id),
    INDEX idx_assignment_exam (exam_id),
    INDEX idx_assignment_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- StudentExamAttempts Table
-- ===============================================
CREATE TABLE StudentExamAttempts (
    attempt_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    total_score DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('in_progress', 'submitted', 'evaluated') NOT NULL DEFAULT 'in_progress',
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_attempt_student (tenant_id, exam_id, student_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- StudentAnswers Table
-- ===============================================
CREATE TABLE StudentAnswers (
    student_answer_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NULL,
    numeric_answer DECIMAL(10,4) NULL,
    descriptive_answer TEXT NULL,
    marks_awarded DECIMAL(5,2) DEFAULT 0.00,
    is_correct BOOLEAN NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES Tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (attempt_id) REFERENCES StudentExamAttempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES QuestionOptions(option_id) ON DELETE SET NULL,
    UNIQUE KEY unique_attempt_question (attempt_id, question_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- Insert Sample Tenant
-- ===============================================
INSERT INTO Tenants (name, subdomain, logo_url) VALUES
('Default College', 'default', NULL);

-- ===============================================
-- Insert Sample Users
-- Password placeholders should be replaced with real bcrypt hashes
-- ===============================================
INSERT INTO Users (tenant_id, name, email, password_hash, role) VALUES 
(1, 'Tenant Admin', 'admin@default-college.com', '$2b$10$YourHashedPasswordHere', 'tenant_admin'),
(1, 'Teacher User', 'teacher@default-college.com', '$2b$10$YourHashedPasswordHere', 'teacher'),
(1, 'John Doe', 'student@default-college.com', '$2b$10$YourHashedPasswordHere', 'student');
