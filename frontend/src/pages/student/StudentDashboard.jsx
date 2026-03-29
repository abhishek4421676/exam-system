import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock3, FileQuestion, Target } from 'lucide-react';
import { examAPI, attemptAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './StudentDashboard.css';

function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);

    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [examsResponse, attemptsResponse] = await Promise.all([
        examAPI.getPublished(),
        attemptAPI.getMyAttempts()
      ]);

      setExams(examsResponse);
      setAttempts(attemptsResponse);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to load dashboard data');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam) => {
    if (!exam.start_time || !exam.end_time) {
      return {
        text: exam.status === 'published' ? 'Active' : 'Completed',
        class: exam.status === 'published' ? 'badge-success' : 'badge-secondary',
        canAttempt: exam.status === 'published'
      };
    }

    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    if (now < startTime) {
      return {
        text: 'Upcoming',
        class: 'badge-warning',
        canAttempt: false
      };
    } else if (now >= startTime && now <= endTime) {
      return {
        text: 'Active',
        class: 'badge-success',
        canAttempt: true
      };
    } else {
      return {
        text: 'Completed',
        class: 'badge-danger',
        canAttempt: false
      };
    }
  };

  const hasAttempted = (examId) => {
    return attempts.some(attempt => Number(attempt.exam_id) === Number(examId));
  };

  const getAttemptForExam = (examId) => {
    return attempts.find(attempt => Number(attempt.exam_id) === Number(examId));
  };

  const isAttemptTimeExpired = (attempt) => {
    if (!attempt || attempt.status !== 'in_progress' || !attempt.start_time) {
      return false;
    }

    const durationMinutes = Number(attempt.duration_minutes ?? attempt.duration ?? 0);
    if (!durationMinutes || Number.isNaN(durationMinutes)) {
      return false;
    }

    const startTimeMs = new Date(attempt.start_time).getTime();
    if (Number.isNaN(startTimeMs)) {
      return false;
    }

    return Date.now() >= (startTimeMs + durationMinutes * 60 * 1000);
  };

  const handleStartExam = async (examId) => {
    try {
      // Check if there's an active attempt
      const activeAttempt = await attemptAPI.getActiveAttempt(examId);
      
      if (activeAttempt) {
        // Resume existing attempt
        navigate(`/exam/${examId}`);
      } else {
        // Start new attempt
        await attemptAPI.startExam(examId);
        navigate(`/exam/${examId}`);
      }
    } catch (err) {
      console.error('Error starting exam:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to start exam');
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

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const categorizeExams = () => {
    const now = new Date();
    const active = [];
    const upcoming = [];
    const completed = [];

    exams.forEach(exam => {
      if (!exam.start_time || !exam.end_time) {
        if (exam.status === 'published') {
          active.push(exam);
        } else {
          completed.push(exam);
        }
        return;
      }

      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);
      
      if (now >= startTime && now <= endTime) {
        active.push(exam);
      } else if (now < startTime) {
        upcoming.push(exam);
      } else {
        completed.push(exam);
      }
    });

    return { active, upcoming, completed };
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const { active, upcoming, completed } = categorizeExams();

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1>Welcome, {user?.name}!</h1>
          <p className="subtitle">Your examination portal</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Active Exams</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-label">Upcoming Exams</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{attempts.length}</div>
          <div className="stat-label">Completed Attempts</div>
        </div>
      </div>

      {/* Active Exams */}
      {active.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title"><Clock3 size={18} /> Active Exams</h2>
          <div className="exams-grid">
            {active.map(exam => {
              const attempt = getAttemptForExam(exam.exam_id);
              const status = getExamStatus(exam);
              const canResume = attempt && attempt.status === 'in_progress' && !isAttemptTimeExpired(attempt);
              
              return (
                <div key={exam.exam_id} className="exam-card active-exam">
                  <div className="exam-card-header">
                    <h3>{exam.title}</h3>
                    <span className={`badge ${status.class}`}>{status.text}</span>
                  </div>
                  
                  {exam.description && (
                    <p className="exam-description">{exam.description}</p>
                  )}

                  <div className="exam-details">
                    <div className="detail-item">
                      <span className="detail-icon"><Clock3 size={16} /></span>
                      <span>Duration: {formatDuration(exam.duration_minutes ?? exam.duration)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon"><FileQuestion size={16} /></span>
                      <span>Questions: {exam.question_count || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon"><Target size={16} /></span>
                      <span>Total Marks: {exam.total_marks}</span>
                    </div>
                    {exam.end_time && (
                      <div className="detail-item">
                        <span className="detail-icon"><CalendarClock size={16} /></span>
                        <span>Ends: {formatDateTime(exam.end_time)}</span>
                      </div>
                    )}
                  </div>

                  {attempt ? (
                    <div className="exam-card-footer">
                      {canResume ? (
                        <button
                          className="btn btn-primary btn-block"
                          onClick={() => navigate(`/exam/${exam.exam_id}`)}
                        >
                          Resume Exam
                        </button>
                      ) : (
                        <>
                          <span className="attempted-badge">
                            <CheckCircle2 size={14} /> {attempt.status === 'in_progress' ? 'Time Up' : 'Submitted'}
                          </span>
                          <Link
                            to={`/result/${attempt.attempt_id}`}
                            className="btn btn-secondary"
                          >
                            View Result
                          </Link>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="exam-card-footer">
                      <button
                        className="btn btn-success btn-block"
                        onClick={() => handleStartExam(exam.exam_id)}
                      >
                        Start Exam
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Exams */}
      {upcoming.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title"><CalendarClock size={18} /> Upcoming Exams</h2>
          <div className="exams-grid">
            {upcoming.map(exam => {
              const status = getExamStatus(exam);
              
              return (
                <div key={exam.exam_id} className="exam-card">
                  <div className="exam-card-header">
                    <h3>{exam.title}</h3>
                    <span className={`badge ${status.class}`}>{status.text}</span>
                  </div>
                  
                  {exam.description && (
                    <p className="exam-description">{exam.description}</p>
                  )}

                  <div className="exam-details">
                    <div className="detail-item">
                      <span className="detail-icon"><Clock3 size={16} /></span>
                      <span>Duration: {formatDuration(exam.duration_minutes ?? exam.duration)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon"><FileQuestion size={16} /></span>
                      <span>Questions: {exam.question_count || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon"><Target size={16} /></span>
                      <span>Total Marks: {exam.total_marks}</span>
                    </div>
                    {exam.start_time && (
                      <div className="detail-item">
                        <span className="detail-icon"><CalendarClock size={16} /></span>
                        <span>Starts: {formatDateTime(exam.start_time)}</span>
                      </div>
                    )}
                  </div>

                  <div className="exam-card-footer">
                    <button className="btn btn-secondary btn-block" disabled>
                      Not Started Yet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Exams */}
      {completed.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title"><CheckCircle2 size={18} /> Completed Exams</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(exam => {
                  const attempt = getAttemptForExam(exam.exam_id);
                  
                  return (
                    <tr key={exam.exam_id}>
                      <td>{exam.title}</td>
                      <td>{exam.end_time ? formatDateTime(exam.end_time) : '-'}</td>
                      <td>
                        {attempt ? (
                          attempt.total_score !== null && attempt.total_score !== undefined ? (
                            <strong>{attempt.total_score} / {attempt.total_marks ?? exam.total_marks}</strong>
                          ) : (
                            <span className="badge badge-warning">Pending</span>
                          )
                        ) : (
                          <span className="badge badge-secondary">Not Attempted</span>
                        )}
                      </td>
                      <td>
                        {attempt ? (
                          attempt.status !== 'in_progress' ? (
                            <span className="badge badge-success">Submitted</span>
                          ) : (
                            <span className="badge badge-danger">Incomplete</span>
                          )
                        ) : (
                          <span className="badge badge-secondary">-</span>
                        )}
                      </td>
                      <td>
                        {attempt && attempt.status !== 'in_progress' ? (
                          <Link
                            to={`/result/${attempt.attempt_id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            View Result
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <div className="empty-state">
          <h3>No Exams Available</h3>
          <p>There are no published exams assigned to you right now. Please check back later.</p>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
