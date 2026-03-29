import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamInterface from './pages/student/ExamInterface';
import ExamResult from './pages/student/ExamResult';
import ManageExams from './pages/admin/ManageExams';
import ManageQuestions from './pages/admin/ManageQuestions';
import InviteUsers from './pages/admin/InviteUsers';
import EvaluateDescriptive from './pages/teacher/EvaluateDescriptive';
import AcceptInvitation from './pages/AcceptInvitation';
import TenantSettings from './pages/tenantAdmin/Settings';
import ExamAssignments from './pages/tenantAdmin/ExamAssignments';
import './App.css';

// Layout Component with Navbar
const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const getDefaultRouteForRole = (role) => {
  if (role === 'teacher') return '/teacher';
  if (role === 'admin') return '/admin';
  if (role === 'tenant_admin') return '/tenant-admin/users';
  return '/student';
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <InviteUsers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams"
            element={
              <Navigate to="/admin" replace />
            }
          />
          <Route
            path="/admin/questions"
            element={
              <Navigate to="/admin" replace />
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Layout>
                  <ManageExams />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/questions"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Layout>
                  <ManageQuestions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/evaluation"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Layout>
                  <EvaluateDescriptive />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tenant Admin Routes */}
          <Route
            path="/tenant-admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
                <Layout>
                  <InviteUsers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant-admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
                <Layout>
                  <TenantSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant-admin/exam-assignments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
                <Layout>
                  <ExamAssignments />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId"
            element={
              <ProtectedRoute>
                <ExamInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:attemptId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExamResult />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Public Invitation Route */}
          <Route
            path="/accept-invite/:invitationId"
            element={<AcceptInvitation />}
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

