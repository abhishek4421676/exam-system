import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data.data || response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (token) => api.post('/auth/google', { token }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const examAPI = {
  create: (data) => api.post('/exams', data),
  getAll: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  publish: (id) => api.put(`/exams/${id}/publish`),
  getQuestionBanks: (id) => api.get(`/exams/${id}/question-banks`),
  setQuestionBanks: (id, bankConfigs) => api.put(`/exams/${id}/question-banks`, { bank_configs: bankConfigs }),
  addQuestions: (examId, questionIds) => api.post(`/exams/${examId}/questions`, { question_ids: questionIds }),
  removeQuestion: (examId, questionId) => api.delete(`/exams/${examId}/questions/${questionId}`),
  getPublished: () => api.get('/exams/published'),
};

export const questionAPI = {
  create: (data) => api.post('/questions', data),
  getAll: () => api.get('/questions'),
  getBanks: () => api.get('/questions/banks'),
  createBank: (data) => api.post('/questions/banks', data),
  getById: (id) => api.get(`/questions/${id}`),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
  bulkCreate: (questions) => api.post('/questions/bulk', { questions }),
};

export const attemptAPI = {
  startExam: (examId) => api.post(`/exams/${examId}/start`),
  getQuestions: (examId) => api.get(`/exams/${examId}/questions`),
  saveAnswer: (examId, data) => api.post(`/exams/${examId}/save-answer`, data),
  submitExam: (examId, attemptId) => api.post(`/exams/${examId}/submit`, { attempt_id: attemptId }),
  getActiveAttempt: (examId) => api.get(`/exams/${examId}/active-attempt`),
  getExamAttempts: (examId) => api.get(`/exams/${examId}/attempts`),
  getMyAttempts: () => api.get('/student/attempts'),
  getAttemptDetails: (attemptId) => api.get(`/attempts/${attemptId}`),
  getReport: (attemptId) => api.get(`/attempts/${attemptId}/report`),
  getPendingDescriptiveAnswers: (examId) =>
    api.get('/teacher/pending-descriptive', { params: examId ? { exam_id: examId } : undefined }),
  gradeDescriptiveAnswer: (data) => api.post('/teacher/grade-answer', data),
};

export const evaluationAPI = {
  evaluate: (attemptId) => api.post(`/attempts/${attemptId}/evaluate`),
};

export const tenantAPI = {
  getSettings: () => api.get('/tenant/settings'),
  updateSettings: (data) => api.put('/tenant/settings', data),
  listUsers: (role) => api.get('/tenant/users', { params: role ? { role } : undefined }),
  inviteUser: (data) => api.post('/tenant/users/invite', data),
  removeUser: (userId) => api.delete(`/tenant/users/${userId}`),
  listExamsForAssignment: () => api.get('/tenant/exam-assignments/exams'),
  getStudentsForExam: (examId) => api.get(`/tenant/exam-assignments/exams/${examId}/students`),
  assignStudentsToExam: (examId, studentIds) =>
    api.put(`/tenant/exam-assignments/exams/${examId}/students`, { student_ids: studentIds }),
};

export default api;
