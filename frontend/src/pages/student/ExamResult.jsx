import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CircleSlash2, XCircle } from 'lucide-react';
import { attemptAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ExamResult.css';

function ExamResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError('');

      const [detailsResponse, reportResponse] = await Promise.all([
        attemptAPI.getAttemptDetails(attemptId),
        attemptAPI.getReport(attemptId)
      ]);

      setResult(detailsResponse);
      setReport(reportResponse);
    } catch (err) {
      console.error('Error fetching result:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to load result');
      setError(errorMessage);
    } finally {
      setLoading(false);
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

  const calculatePercentage = () => {
    if (!result || result.total_score === null || result.total_score === undefined) return 0;
    return ((result.total_score / result.total_marks) * 100).toFixed(2);
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', class: 'grade-excellent' };
    if (percentage >= 80) return { grade: 'A', class: 'grade-excellent' };
    if (percentage >= 70) return { grade: 'B+', class: 'grade-good' };
    if (percentage >= 60) return { grade: 'B', class: 'grade-good' };
    if (percentage >= 50) return { grade: 'C', class: 'grade-average' };
    if (percentage >= 40) return { grade: 'D', class: 'grade-poor' };
    return { grade: 'F', class: 'grade-fail' };
  };

  const getQuestionStatusIcon = (question) => {
    if (question.marks_awarded === null || question.marks_awarded === undefined) {
      return { icon: <Clock3 size={16} />, text: 'Pending Evaluation', class: 'status-pending' };
    }
    if (question.marks_awarded === question.marks) {
      return { icon: <CheckCircle2 size={16} />, text: 'Correct', class: 'status-correct' };
    }
    if (question.marks_awarded > 0) {
      return { icon: <AlertCircle size={16} />, text: 'Partially Correct', class: 'status-partial' };
    }
    return { icon: <XCircle size={16} />, text: 'Incorrect', class: 'status-incorrect' };
  };

  const getDashboardPath = () => {
    if (user?.role === 'teacher') return '/teacher';
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'tenant_admin') return '/tenant-admin/users';
    return '/student';
  };

  const dashboardPath = getDashboardPath();

  if (loading) {
    return (
      <div className="result-loading">
        <div className="loading-spinner"></div>
        <p>Loading result...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-error">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate(dashboardPath)}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-error">
        <p>Result not found</p>
        <button className="btn btn-primary" onClick={() => navigate(dashboardPath)}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const percentage = calculatePercentage();
  const gradeInfo = getGrade(percentage);
  const isPending = result.total_score === null || result.total_score === undefined || (report && report.pending_evaluation > 0);

  return (
    <div className="exam-result">
      <div className="result-container">
        {/* Result Header */}
        <div className="result-header">
          <h1>Exam Result</h1>
          <Link to={dashboardPath} className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        {/* Result Card */}
        <div className="result-card">
          <div className="result-title">
            <h2>{result.exam_title}</h2>
            <span className="badge badge-success">Submitted</span>
          </div>

          <div className="result-info">
            <div className="info-item">
              <span className="info-label">Submitted At:</span>
              <span className="info-value">{result.end_time ? formatDateTime(result.end_time) : '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{result.duration_minutes} minutes</span>
            </div>
          </div>

          {isPending ? (
            <div className="pending-evaluation">
              <div className="pending-icon"><Clock3 size={28} /></div>
              <h3>Evaluation Pending</h3>
              <p>Your exam is being evaluated. Results will be available soon.</p>
            </div>
          ) : (
            <>
              {/* Score Display */}
              <div className="score-display">
                <div className="score-circle">
                  <div className="score-value">{percentage}%</div>
                  <div className="score-label">Score</div>
                </div>

                <div className="score-details">
                  <div className="score-item">
                    <div className="score-number">{result.total_score}</div>
                    <div className="score-text">Marks Obtained</div>
                  </div>
                  <div className="score-divider">/</div>
                  <div className="score-item">
                    <div className="score-number">{result.total_marks}</div>
                    <div className="score-text">Total Marks</div>
                  </div>
                </div>

                <div className={`grade-badge ${gradeInfo.class}`}>
                  Grade: {gradeInfo.grade}
                </div>
              </div>

              {/* Statistics */}
              {report && (
                <div className="result-stats">
                  <div className="stat-box stat-correct">
                    <div className="stat-icon"><CheckCircle2 size={18} /></div>
                    <div className="stat-value">{report.correct_answers || 0}</div>
                    <div className="stat-label">Correct</div>
                  </div>
                  <div className="stat-box stat-incorrect">
                    <div className="stat-icon"><XCircle size={18} /></div>
                    <div className="stat-value">{report.incorrect_answers || 0}</div>
                    <div className="stat-label">Incorrect</div>
                  </div>
                  <div className="stat-box stat-pending">
                    <div className="stat-icon"><Clock3 size={18} /></div>
                    <div className="stat-value">{report.pending_evaluation || 0}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-box stat-unanswered">
                    <div className="stat-icon"><CircleSlash2 size={18} /></div>
                    <div className="stat-value">{report.unanswered || 0}</div>
                    <div className="stat-label">Unanswered</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Question-wise Breakdown */}
        {report?.questions && report.questions.length > 0 && (
          <div className="breakdown-section">
            <h2>Question-wise Breakdown</h2>

            <div className="questions-breakdown">
              {report.questions.map((question, index) => {
                const status = getQuestionStatusIcon(question);

                return (
                  <div key={question.question_id} className={`breakdown-card ${status.class}`}>
                    <div className="breakdown-header">
                      <div className="breakdown-title">
                        <span className="question-number">Q{index + 1}</span>
                        <span className={`badge badge-${question.question_type === 'MCQ' ? 'primary' :
                            question.question_type === 'NUMERIC' ? 'success' : 'info'
                          }`}>
                          {question.question_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="breakdown-status">
                        <span className="status-icon">{status.icon}</span>
                        <span className="status-text">{status.text}</span>
                      </div>
                    </div>

                    <div className="breakdown-question">
                      {question.question_text}
                    </div>

                    <div className="breakdown-answers">
                      <div className="answer-row">
                        <strong>Your Answer:</strong>
                        <span className={question.student_answer ? '' : 'text-muted'}>
                          {question.question_type === 'MCQ'
                            ? (question.student_answer?.selected_option_text || 'Not answered')
                            : (question.student_answer?.descriptive_answer || question.student_answer?.numeric_answer || 'Not answered')}
                        </span>
                      </div>

                      {(question.question_type === 'MCQ' || question.question_type === 'NUMERIC') && (
                        <div className="answer-row correct-answer">
                          <strong>Status:</strong>
                          <span>
                            {question.is_correct === null
                              ? 'Pending Manual Evaluation'
                              : question.is_correct
                                ? 'Correct'
                                : 'Incorrect'}
                          </span>
                        </div>
                      )}

                      {question.question_type === 'NUMERIC' && question.correct_numeric_answer !== null && (
                        <div className="answer-row correct-answer">
                          <strong>Correct Answer:</strong>
                          <span>{question.correct_numeric_answer}</span>
                        </div>
                      )}

                      {question.question_type === 'MCQ' && question.options?.find(o => o.is_correct) && (
                        <div className="answer-row correct-answer">
                          <strong>Correct Answer:</strong>
                          <span>{question.options.find(o => o.is_correct)?.option_text}</span>
                        </div>
                      )}
                    </div>

                    <div className="breakdown-marks">
                      <span className="marks-obtained">
                        {question.marks_awarded !== null && question.marks_awarded !== undefined ? question.marks_awarded : '-'}
                      </span>
                      <span className="marks-separator">/</span>
                      <span className="marks-total">{question.marks}</span>
                      <span className="marks-label">marks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamResult;
