#!/bin/bash

# Database Cleanup Script
# Cleans all data from the exam_system database

echo "======================================"
echo "  Database Cleanup"
echo "======================================"
echo ""
echo "This will delete ALL data from the database!"
echo ""

# Load database credentials from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# MySQL connection details
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-exam_system}
DB_HOST=${DB_HOST:-localhost}

echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo ""

# Clean the database
echo "Cleaning database..."

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << EOF
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE StudentAnswers;
TRUNCATE TABLE StudentExamAttempts;
TRUNCATE TABLE ExamQuestions;
TRUNCATE TABLE AnswerKeys;
TRUNCATE TABLE QuestionOptions;
TRUNCATE TABLE Questions;
TRUNCATE TABLE Exams;
TRUNCATE TABLE Users;
TRUNCATE TABLE ExamSections;
TRUNCATE TABLE RefreshTokens;
TRUNCATE TABLE SystemLogs;

SET FOREIGN_KEY_CHECKS = 1;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database cleaned successfully!"
    echo ""
    echo "All tables are now empty and ready for testing."
else
    echo ""
    echo "✗ Database cleanup failed!"
    echo "Please check your database credentials in .env file"
    exit 1
fi
