import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckSquare, Save, UserPlus, X } from 'lucide-react';
import { tenantAPI, attemptAPI } from '../../services/api';
import './ExamAssignments.css';

function ExamAssignments() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedExam, setSelectedExam] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [examAttempts, setExamAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await tenantAPI.listExamsForAssignment();
      setExams(data || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const openAssignModal = async (exam) => {
    try {
      setSelectedExam(exam);
      setShowAssignModal(true);
      setError('');
      setSuccess('');
      const data = await tenantAPI.getStudentsForExam(exam.exam_id);
      const list = data?.students || [];
      setStudents(list);
      setAssignedIds(new Set(list.filter((student) => student.assigned).map((student) => student.user_id)));
    } catch (err) {
      setError(err?.message || 'Failed to load students for exam');
      setSelectedExam(null);
      setShowAssignModal(false);
    }
  };

  const closeModal = () => {
    setShowAssignModal(false);
    setSelectedExam(null);
    setStudents([]);
    setAssignedIds(new Set());
  };

  const toggleStudent = (studentId) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const assignedCount = useMemo(() => assignedIds.size, [assignedIds]);

  const handleSaveAssignments = async () => {
    if (!selectedExam) return;
    try {
      setSaving(true);
      await tenantAPI.assignStudentsToExam(selectedExam.exam_id, Array.from(assignedIds));
      setSuccess('Exam assignments updated successfully');
      closeModal();
      await loadExams();
    } catch (err) {
      setError(err?.message || 'Failed to update assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleViewResults = async (exam) => {
    try {
      setSelectedExam(exam);
      setShowResultsModal(true);
      setLoadingAttempts(true);
      const response = await attemptAPI.getExamAttempts(exam.exam_id);
      setExamAttempts(response?.attempts || []);
    } catch (err) {
      setError(err?.message || 'Failed to load exam results');
      setShowResultsModal(false);
    } finally {
      setLoadingAttempts(false);
    }
  };

  if (loading) return <div className="loading">Loading exam assignments...</div>;

  return (
    <div className="exam-assignments-page">
      <h1>Exam Access Control</h1>
      <p className="section-subtitle">
        Select which students are allowed to attempt each published exam.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Exam</th>
              <th>Status</th>
              <th>Questions</th>
              <th>Duration</th>
              <th>Total Marks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.exam_id}>
                <td>{exam.title}</td>
                <td>
                  <span className={`badge ${exam.status === 'published' ? 'badge-success' : 'badge-secondary'}`}>
                    {exam.status}
                  </span>
                </td>
                <td>{exam.question_count || 0}</td>
                <td>{exam.duration_minutes || '-'} min</td>
                <td>{exam.total_marks}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openAssignModal(exam)}
                      disabled={exam.status !== 'published'}
                      title={exam.status !== 'published' ? 'Only published exams can be assigned' : 'Manage assignments'}
                    >
                      <UserPlus size={14} /> Assign Students
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewResults(exam)}
                    >
                      <BarChart3 size={14} /> View Results
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAssignModal && selectedExam && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Students: {selectedExam.title}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <p className="assignment-caption">
                <CheckSquare size={14} /> Selected students can attempt this exam. ({assignedCount} selected)
              </p>
              <div className="question-list assignment-list">
                {students.length === 0 ? (
                  <div className="empty-state">No students found in this tenant.</div>
                ) : (
                  students.map((student) => (
                    <label key={student.user_id} className="question-item assignment-item">
                      <input
                        type="checkbox"
                        checked={assignedIds.has(student.user_id)}
                        onChange={() => toggleStudent(student.user_id)}
                      />
                      <div className="question-item-content">
                        <div className="question-item-text">{student.name}</div>
                        <div className="question-item-meta">{student.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}><X size={14} /> Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAssignments} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && selectedExam && (
        <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Results: {selectedExam.title}</h2>
              <button className="modal-close" onClick={() => setShowResultsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {loadingAttempts ? (
                <p>Loading results...</p>
              ) : examAttempts.length === 0 ? (
                <p>No attempts found for this exam yet.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examAttempts.map((attempt) => (
                        <tr key={attempt.attempt_id}>
                          <td>
                            <Link className="student-result-link" to={`/result/${attempt.attempt_id}`}>
                              {attempt.student_name}
                            </Link>
                          </td>
                          <td>{attempt.student_email}</td>
                          <td>{attempt.status}</td>
                          <td>
                            {attempt.total_score !== null && attempt.total_score !== undefined ? (
                              <strong>
                                {attempt.total_score} / {attempt.total_marks ?? attempt.exam_total_marks ?? selectedExam.total_marks ?? '-'}
                              </strong>
                            ) : (
                              <span className="badge badge-warning">Pending</span>
                            )}
                          </td>
                          <td>
                            <a className="btn btn-secondary btn-sm" href={`/result/${attempt.attempt_id}`}>
                              View Result
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamAssignments;
