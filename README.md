# 🎓 Online Examination System

A **production-ready, enterprise-grade backend and frontend system** for conducting online examinations built with Node.js, Express.js, MySQL, React, and Vite.

## 🌟 Key Features

1. **User Management & Authentication**
   - JWT-based authentication
   - Google OAuth integration
   - Role-based access control (Admin/Teacher/Student)
   - Multi-tenant architecture with strict data isolation

2. **Exam Management**
   - Create, update, delete, and publish exams
   - Configure duration, total marks, and active time windows

3. **Question Bank**
   - Three question types: MCQ, Numeric, Descriptive
   - Support for negative marking and configurable options
   - Bulk question uploading via UI

4. **Student Exam Flow**
   - Browse published exams and Active/Upcoming/Completed dashboards
   - Start exam with strict timer enforcement
   - Auto-save answers while in progress
   - Submit exam and view detailed results

5. **Evaluation Engine**
   - **Automatic evaluation** for MCQ and Numeric questions (with ±0.01 tolerance)
   - **Manual grading** support for Descriptive answers via Teacher Dashboard
   - Detailed analytics: Average, highest/lowest scores, and pass rates

---

## 🔐 Default Demo Credentials

The following demo users have been pre-seeded in the database for testing:

- **Admin Account**
  - Email: `admin@default-college.com`
  - Password: `Admin@1234`

- **Teacher Account**
  - Email: `teacher@default-college.com`
  - Password: `Teacher@1234`

- **Student Account** (Alice)
  - Email: `alice@default-college.com`
  - Password: `Student@1234`

---

## 🚀 Setup Guide

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)

### 1. Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE exam_system;
exit;

# Import the schema
mysql -u root -p exam_system < backend/database/schema.sql
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env
nano .env # Configure DB_USER, DB_PASSWORD, JWT_SECRET, and GOOGLE_CLIENT_ID

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create environment file
echo "VITE_GOOGLE_CLIENT_ID=your_google_client_id_here" > .env

# Start frontend application
npm run dev
```

---

## 🏗️ Architecture & Database

The system follows a strict **layered architecture** (`Routes -> Middleware -> Controllers -> Services -> Models -> MySQL Database`) to ensure maintainability and separation of concerns.

### Database Schema (8 Core Tables)
1. **Users**: User accounts (Admin/Teacher/Student) with Google OAuth linking.
2. **Exams**: Exam definitions and configurations.
3. **Questions**: Central question bank.
4. **QuestionOptions**: MCQ specific options.
5. **AnswerKeys**: Correct answers for auto-evaluation.
6. **ExamQuestions**: Exam to Question mapping.
7. **StudentExamAttempts**: Exam attempts and total scores.
8. **StudentAnswers**: Individual student responses and awarded marks.

---

## 🛡️ Security Implementation

- **Password Security**: bcrypt hashing with configurable salt rounds.
- **Authentication**: JWT tokens with expiration securely passed in Authorization headers.
- **Google OAuth Integration**: Verifies tokens server-side securely. Links based on unique `google_id`.
- **Authorization**: Role-based middleware ensures Students cannot access Admin/Teacher routes.
- **Multi-Tenant Isolation**: Database queries strictly filter by `tenant_id`. Users cannot see other organizations' data.
- **SQL Injection Prevention**: Parameterized queries using `mysql2/promise`.
- **Rate Limiting & Headers**: Express-rate-limit and Helmet middleware for DDOS and XSS protection.

---

## 📡 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/google` - Login/Signup with Google OAuth token

### Exams (Admin/Teacher)
- `POST /api/exams` - Create exam
- `GET /api/exams` - Get all exams
- `POST /api/exams/:id/publish` - Publish exam
- `GET /api/exams/:id/analytics` - View exam performance

### Questions (Admin/Teacher)
- `POST /api/questions` - Create question
- `POST /api/questions/bulk` - Bulk import questions
- `GET /api/questions` - List available question banks

### Student Flow
- `POST /api/exams/:id/start` - Start exam
- `GET /api/exams/:id/questions` - Get exam questions (without answers)
- `POST /api/exams/:id/save-answer` - Auto-save answer
- `POST /api/exams/:id/submit` - Submit and evaluate exam
- `GET /api/attempts/:id/report` - View full evaluation report
