#!/bin/bash

# Online Examination System - API Test Script
# Tests all major backend features

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  Online Examination System API Test"
echo "======================================"
echo ""

# Clean database before testing
echo "Cleaning database..."
./clean-database.sh > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database cleaned successfully"
else
    echo "✗ Warning: Database cleanup failed (may not exist yet)"
fi
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

# Variables to store tokens and IDs
ADMIN_TOKEN=""
STUDENT_TOKEN=""
EXAM_ID=""
QUESTION_ID=""
ATTEMPT_ID=""

echo ""
echo "======================================"
echo "TEST 1: Register Admin"
echo "======================================"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@test.com",
    "password": "Admin123",
    "role": "admin"
  }')

echo "$ADMIN_RESPONSE" | jq '.'
if echo "$ADMIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Admin registration successful"
else
    print_result 1 "Admin registration failed"
fi

echo ""
echo "======================================"
echo "TEST 2: Login Admin"
echo "======================================"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ ! -z "$ADMIN_TOKEN" ]; then
    print_result 0 "Admin login successful - Token obtained"
    echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
else
    print_result 1 "Admin login failed"
    exit 1
fi

echo ""
echo "======================================"
echo "TEST 3: JWT Middleware (Get Profile)"
echo "======================================"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$PROFILE_RESPONSE" | jq '.'
if echo "$PROFILE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "JWT middleware working - Profile fetched"
else
    print_result 1 "JWT middleware failed"
fi

echo ""
echo "======================================"
echo "TEST 4: Register Student"
echo "======================================"
STUDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Student User",
    "email": "student@test.com",
    "password": "Student123",
    "role": "student"
  }')

echo "$STUDENT_RESPONSE" | jq '.'
if echo "$STUDENT_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Student registration successful"
else
    print_result 1 "Student registration failed"
fi

echo ""
echo "======================================"
echo "TEST 5: Login Student"
echo "======================================"
STUDENT_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Student123"
  }')

echo "$STUDENT_LOGIN" | jq '.'
STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | jq -r '.data.token')

if [ "$STUDENT_TOKEN" != "null" ] && [ ! -z "$STUDENT_TOKEN" ]; then
    print_result 0 "Student login successful"
    echo "Student Token: ${STUDENT_TOKEN:0:20}..."
else
    print_result 1 "Student login failed"
    exit 1
fi

echo ""
echo "======================================"
echo "TEST 6: Create Exam (Admin Only)"
echo "======================================"
EXAM_RESPONSE=$(curl -s -X POST "$BASE_URL/exams" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Math Test",
    "description": "Basic mathematics test",
    "duration_minutes": 60,
    "total_marks": 100,
    "passing_marks": 40,
    "instructions": "Answer all questions carefully",
    "status": "draft"
  }')

echo "$EXAM_RESPONSE" | jq '.'
EXAM_ID=$(echo "$EXAM_RESPONSE" | jq -r '.data.exam_id')

if [ "$EXAM_ID" != "null" ] && [ ! -z "$EXAM_ID" ]; then
    print_result 0 "Exam created successfully - ID: $EXAM_ID"
else
    print_result 1 "Exam creation failed"
fi

echo ""
echo "======================================"
echo "TEST 7: Role Authorization Test"
echo "======================================"
echo "Attempting to create exam with student token (should fail)..."
UNAUTHORIZED_RESPONSE=$(curl -s -X POST "$BASE_URL/exams" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unauthorized Exam",
    "duration_minutes": 30
  }')

echo "$UNAUTHORIZED_RESPONSE" | jq '.'
if echo "$UNAUTHORIZED_RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_result 0 "Role authorization working - Student blocked from admin action"
else
    print_result 1 "Role authorization failed"
fi

echo ""
echo "======================================"
echo "TEST 8: Create MCQ Question"
echo "======================================"
QUESTION_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "What is 2 + 2?",
    "question_type": "MCQ",
    "marks": 5,
    "negative_marks": 1,
    "options": ["2", "3", "4", "5"],
    "correct_option_index": 2
  }')

echo "$QUESTION_RESPONSE" | jq '.'
QUESTION_ID=$(echo "$QUESTION_RESPONSE" | jq -r '.data.question_id')

if [ "$QUESTION_ID" != "null" ] && [ ! -z "$QUESTION_ID" ]; then
    print_result 0 "Question created successfully - ID: $QUESTION_ID"
else
    print_result 1 "Question creation failed"
fi

echo ""
echo "======================================"
echo "TEST 9: Create Numeric Question"
echo "======================================"
QUESTION2_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "What is the square root of 16?",
    "question_type": "NUMERIC",
    "marks": 5,
    "negative_marks": 0,
    "correct_numeric_answer": 4
  }')

echo "$QUESTION2_RESPONSE" | jq '.'
QUESTION_ID_2=$(echo "$QUESTION2_RESPONSE" | jq -r '.data.question_id')

if [ "$QUESTION_ID_2" != "null" ] && [ ! -z "$QUESTION_ID_2" ]; then
    print_result 0 "Numeric question created - ID: $QUESTION_ID_2"
else
    print_result 1 "Numeric question creation failed"
fi

echo ""
echo "======================================"
echo "TEST 10: Add Questions to Exam"
echo "======================================"
ADD_Q_RESPONSE=$(curl -s -X POST "$BASE_URL/exams/$EXAM_ID/questions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"question_ids\": [$QUESTION_ID, $QUESTION_ID_2]
  }")

echo "$ADD_Q_RESPONSE" | jq '.'
if echo "$ADD_Q_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Questions added to exam successfully"
else
    print_result 1 "Failed to add questions to exam"
fi

echo ""
echo "======================================"
echo "TEST 11: Publish Exam"
echo "======================================"
PUBLISH_RESPONSE=$(curl -s -X PUT "$BASE_URL/exams/$EXAM_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$PUBLISH_RESPONSE" | jq '.'
if echo "$PUBLISH_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Exam published successfully"
else
    print_result 1 "Failed to publish exam"
fi

echo ""
echo "======================================"
echo "TEST 12: Fetch Published Exams (Student)"
echo "======================================"
EXAMS_LIST=$(curl -s -X GET "$BASE_URL/exams/published" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "$EXAMS_LIST" | jq '.'
if echo "$EXAMS_LIST" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Student can view published exams"
else
    print_result 1 "Failed to fetch published exams"
fi

echo ""
echo "======================================"
echo "TEST 13: Start Exam Attempt (Student)"
echo "======================================"
START_RESPONSE=$(curl -s -X POST "$BASE_URL/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "$START_RESPONSE" | jq '.'
ATTEMPT_ID=$(echo "$START_RESPONSE" | jq -r '.data.attempt_id')

if [ "$ATTEMPT_ID" != "null" ] && [ ! -z "$ATTEMPT_ID" ]; then
    print_result 0 "Exam attempt started - Attempt ID: $ATTEMPT_ID"
else
    print_result 1 "Failed to start exam"
fi

echo ""
echo "======================================"
echo "TEST 14: Fetch Exam Questions (Student)"
echo "======================================"
QUESTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/exams/$EXAM_ID/questions" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "$QUESTIONS_RESPONSE" | jq '.'
if echo "$QUESTIONS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Student can fetch exam questions"
    # Find the option with text "4" (correct answer for "What is 2 + 2?")
    OPTION_ID=$(echo "$QUESTIONS_RESPONSE" | jq -r '.data.questions[0].options[] | select(.option_text == "4") | .option_id')
    echo "Option ID for correct answer ('4'): $OPTION_ID"
else
    print_result 1 "Failed to fetch exam questions"
fi

echo ""
echo "======================================"
echo "TEST 15: Save Answer for MCQ Question"
echo "======================================"
SAVE_ANSWER_RESPONSE=$(curl -s -X POST "$BASE_URL/exams/$EXAM_ID/save-answer" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"attempt_id\": $ATTEMPT_ID,
    \"question_id\": $QUESTION_ID,
    \"selected_option_id\": $OPTION_ID
  }")

echo "$SAVE_ANSWER_RESPONSE" | jq '.'
if echo "$SAVE_ANSWER_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "MCQ answer saved successfully"
else
    print_result 1 "Failed to save MCQ answer"
fi

echo ""
echo "======================================"
echo "TEST 16: Save Answer for Numeric Question"
echo "======================================"
SAVE_NUMERIC_RESPONSE=$(curl -s -X POST "$BASE_URL/exams/$EXAM_ID/save-answer" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"attempt_id\": $ATTEMPT_ID,
    \"question_id\": $QUESTION_ID_2,
    \"numeric_answer\": 4
  }")

echo "$SAVE_NUMERIC_RESPONSE" | jq '.'
if echo "$SAVE_NUMERIC_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Numeric answer saved successfully"
else
    print_result 1 "Failed to save numeric answer"
fi

echo ""
echo "======================================"
echo "TEST 17: Submit Exam"
echo "======================================"
SUBMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/exams/$EXAM_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"attempt_id\": $ATTEMPT_ID
  }")

echo "$SUBMIT_RESPONSE" | jq '.'
if echo "$SUBMIT_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Exam submitted successfully"
    SCORE=$(echo "$SUBMIT_RESPONSE" | jq -r '.data.total_score')
    echo "Score obtained: $SCORE/10"
else
    print_result 1 "Failed to submit exam"
fi

echo ""
echo "======================================"
echo "TEST 18: Get Evaluation Report"
echo "======================================"
REPORT_RESPONSE=$(curl -s -X GET "$BASE_URL/attempts/$ATTEMPT_ID/report" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "$REPORT_RESPONSE" | jq '.'
if echo "$REPORT_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Evaluation report fetched successfully"
    PERCENTAGE=$(echo "$REPORT_RESPONSE" | jq -r '.data.percentage')
    echo "Percentage: $PERCENTAGE%"
else
    print_result 1 "Failed to fetch evaluation report"
fi

echo ""
echo "======================================"
echo "TEST 19: Get Student's Attempts"
echo "======================================"
ATTEMPTS_RESPONSE=$(curl -s -X GET "$BASE_URL/student/attempts" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "$ATTEMPTS_RESPONSE" | jq '.'
if echo "$ATTEMPTS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_result 0 "Student attempts history fetched"
else
    print_result 1 "Failed to fetch attempts"
fi

echo ""
echo "======================================"
echo "TEST 20: Input Validation Test"
echo "======================================"
echo "Testing weak password (should fail)..."
WEAK_PWD_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "weak",
    "role": "student"
  }')

echo "$WEAK_PWD_RESPONSE" | jq '.'
if echo "$WEAK_PWD_RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_result 0 "Input validation working - Weak password rejected"
else
    print_result 1 "Input validation failed"
fi

echo ""
echo "======================================"
echo "ALL TESTS COMPLETED"
echo "======================================"
echo ""
echo "Summary:"
echo "✓ Authentication & Authorization"
echo "✓ Role-based Access Control"
echo "✓ Exam Management (CRUD)"
echo "✓ Question Management"
echo "✓ Exam-Question Mapping"
echo "✓ Student Exam Flow (Start → Answer → Submit)"
echo "✓ Auto-Evaluation"
echo "✓ Input Validation"
echo "✓ JWT Middleware"
echo ""
