-- Database Cleanup Script
-- This script drops all tables and recreates the database schema

USE exam_system;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all tables
DROP TABLE IF EXISTS student_answers;
DROP TABLE IF EXISTS student_exam_attempts;
DROP TABLE IF EXISTS exam_questions;
DROP TABLE IF EXISTS answer_keys;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Recreate all tables from schema
SOURCE database/schema.sql;
