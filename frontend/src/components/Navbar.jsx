import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  CircleUserRound,
  LogOut,
  Users,
  ShieldCheck,
  ClipboardList,
  FileQuestion,
  Moon,
  Sun,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar() {
  const { user, logout, isTeacher, isTenantAdmin, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homePath = isAdmin ? '/admin' : (isTenantAdmin ? '/tenant-admin/users' : (isTeacher ? '/teacher' : '/student'));

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={homePath} className="navbar-brand">
          <BookOpen size={18} />
          Exam System
        </Link>

        <div className="navbar-menu">
          {isAdmin || isTenantAdmin ? (
            <>
              <Link to={isAdmin ? '/admin' : '/tenant-admin/users'} className="nav-link"><Users size={16} />User Management</Link>
              <Link to="/tenant-admin/exam-assignments" className="nav-link"><UserCheck size={16} />Exam Access</Link>
              <Link to="/tenant-admin/settings" className="nav-link"><ShieldCheck size={16} />Settings</Link>
            </>
          ) : isTeacher ? (
            <>
              <Link to="/teacher" className="nav-link"><LayoutDashboard size={16} />Dashboard</Link>
              <Link to="/teacher/exams" className="nav-link"><ClipboardList size={16} />Exam Creator</Link>
              <Link to="/teacher/questions" className="nav-link"><FileQuestion size={16} />Question Bank</Link>
              <Link to="/teacher/evaluation" className="nav-link"><ShieldCheck size={16} />Manual Evaluation</Link>
            </>
          ) : (
            <>
              <Link to="/student" className="nav-link"><LayoutDashboard size={16} />Dashboard</Link>
            </>
          )}

          <div className="navbar-user">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="user-name">{user?.name}</span>
            <span className="user-role badge badge-primary"><CircleUserRound size={12} />{user?.role}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
