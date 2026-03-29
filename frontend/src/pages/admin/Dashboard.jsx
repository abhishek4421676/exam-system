import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, ClipboardList, FileQuestion, Target } from 'lucide-react';
import { examAPI, questionAPI } from '../../services/api';
import './Dashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    publishedExams: 0,
    totalQuestions: 0,
    activeExams: 0
  });
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [exams, questions] = await Promise.all([
        examAPI.getAll(),
        questionAPI.getAll()
      ]);

      // Calculate stats
      const publishedExams = exams.filter(exam => exam.status === 'published');
      const now = new Date();
      const activeExams = publishedExams.filter(exam => {
        if (!exam.start_time || !exam.end_time) {
          return true;
        }
        const startTime = new Date(exam.start_time);
        const endTime = new Date(exam.end_time);
        return now >= startTime && now <= endTime;
      });

      setStats({
        totalExams: exams.length,
        publishedExams: publishedExams.length,
        totalQuestions: questions.length,
        activeExams: activeExams.length
      });

      // Get 5 most recent exams
      const sortedExams = [...exams].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentExams(sortedExams.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // API interceptor rejects with error data or message string
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to load dashboard data');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateExam = async (examId) => {
    try {
      await examAPI.update(examId, { status: 'archived' });
      await fetchDashboardData();
    } catch (err) {
      console.error('Error deactivating exam:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to deactivate exam');
      setError(errorMessage);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1>Teacher Dashboard</h1>
          <p className="subtitle">Manage your exams and questions</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-primary">
              <ClipboardList size={18} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalExams}</div>
              <div className="stat-label">Total Exams</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-success">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.publishedExams}</div>
              <div className="stat-label">Published Exams</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-info">
              <Target size={18} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeExams}</div>
              <div className="stat-label">Active Exams</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-warning">
              <FileQuestion size={18} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalQuestions}</div>
              <div className="stat-label">Total Questions</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Recent Exams</h2>
          <div className="section-header-actions">
            <Link to="/teacher/exams" className="btn btn-primary">View All Exams</Link>
          </div>
        </div>

        {recentExams.length === 0 ? (
          <div className="empty-state">
            <p>No exams created yet</p>
            <Link to="/teacher/exams" className="btn btn-primary">Create Your First Exam</Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map(exam => {
                  const now = new Date();
                  let status = 'Upcoming';
                  let statusClass = 'badge-warning';

                  if (exam.status !== 'published') {
                    status = exam.status === 'archived' ? 'Archived' : 'Draft';
                    statusClass = exam.status === 'archived' ? 'badge-danger' : 'badge-secondary';
                  } else if (!exam.start_time || !exam.end_time) {
                    status = 'Published';
                    statusClass = 'badge-success';
                  } else if (now < new Date(exam.start_time)) {
                    status = 'Scheduled';
                    statusClass = 'badge-info';
                  } else if (now >= new Date(exam.start_time) && now <= new Date(exam.end_time)) {
                    status = 'Active';
                    statusClass = 'badge-success';
                  } else {
                    status = 'Completed';
                    statusClass = 'badge-dark';
                  }

                  return (
                    <tr key={exam.exam_id}>
                      <td>{exam.title}</td>
                      <td>{exam.duration_minutes ?? exam.duration} min</td>
                      <td>{exam.start_time ? formatDateTime(exam.start_time) : '-'}</td>
                      <td>{exam.end_time ? formatDateTime(exam.end_time) : '-'}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>{status}</span>
                      </td>
                      <td>{exam.question_count || 0}</td>
                      <td>
                        {exam.status === 'published' ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeactivateExam(exam.exam_id)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="action-grid">
          <Link to="/teacher/exams" className="action-card">
            <span className="action-icon"><ClipboardList size={18} /></span>
            <h3>Create New Exam</h3>
            <p>Set up a new examination</p>
          </Link>

          <Link to="/teacher/questions" className="action-card">
            <span className="action-icon"><FileQuestion size={18} /></span>
            <h3>Add Questions</h3>
            <p>Build your question bank</p>
          </Link>

          <Link to="/teacher/exams" className="action-card">
            <span className="action-icon"><BarChart3 size={18} /></span>
            <h3>View Reports</h3>
            <p>Analyze exam results</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
