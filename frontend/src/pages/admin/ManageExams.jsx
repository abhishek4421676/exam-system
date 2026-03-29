import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Database, Pencil, Plus, Rocket, Trash2, UserCheck } from 'lucide-react';
import { examAPI, questionAPI, attemptAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ManageExams.css';

function ManageExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [allBanks, setAllBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBankConfigModal, setShowBankConfigModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [examAttempts, setExamAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examBankConfigs, setExamBankConfigs] = useState([]);
  const [bankConfigLoading, setBankConfigLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: '',
    total_marks: ''
  });

  useEffect(() => {
    fetchExams();
    fetchQuestions();
    fetchAllBanks();
  }, []);

  useEffect(() => {
    if (!showResultsModal || !selectedExam?.exam_id) return;

    const intervalId = setInterval(() => {
      fetchExamAttempts(selectedExam.exam_id);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [showResultsModal, selectedExam?.exam_id]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examAPI.getAll();
      setExams(response);
      setError('');
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to load exams'));
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getAll();
      setQuestions(response);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const fetchAllBanks = async () => {
    try {
      const response = await questionAPI.getBanks();
      setAllBanks(response || []);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        duration_minutes: Number(formData.duration_minutes),
        total_marks: Number(formData.total_marks)
      };
      if (selectedExam) {
        await examAPI.update(selectedExam.exam_id, payload);
      } else {
        await examAPI.create(payload);
      }
      fetchExams();
      closeModal();
    } catch (err) {
      console.error('Error saving exam:', err);
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to save exam'));
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examAPI.delete(examId);
      fetchExams();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to delete exam'));
    }
  };

  const handlePublish = async (examId) => {
    try {
      await examAPI.publish(examId);
      fetchExams();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to publish exam'));
    }
  };

  const handleDeactivate = async (examId) => {
    try {
      await examAPI.update(examId, { status: 'archived' });
      fetchExams();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to deactivate exam'));
    }
  };

  const handleAddQuestions = async (examId, questionIds) => {
    try {
      await examAPI.addQuestions(examId, questionIds);
      fetchExams();
      setShowQuestionModal(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to add questions'));
    }
  };

  const handleViewResults = async (exam) => {
    try {
      setSelectedExam(exam);
      setShowResultsModal(true);
      await fetchExamAttempts(exam.exam_id, true);
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to load exam results'));
      setShowResultsModal(false);
    }
  };

  const fetchExamAttempts = async (examId, showLoader = false) => {
    try {
      if (showLoader) setLoadingAttempts(true);
      const response = await attemptAPI.getExamAttempts(examId);
      setExamAttempts(response?.attempts || []);
    } finally {
      if (showLoader) setLoadingAttempts(false);
    }
  };

  /* ── Bank Config handlers ── */
  const openBankConfigModal = async (exam) => {
    setSelectedExam(exam);
    setShowBankConfigModal(true);
    setBankConfigLoading(true);
    try {
      const configs = await examAPI.getQuestionBanks(exam.exam_id);
      setExamBankConfigs(Array.isArray(configs) ? configs : []);
    } catch (err) {
      console.error('Error loading bank configs:', err);
      setExamBankConfigs([]);
    } finally {
      setBankConfigLoading(false);
    }
  };

  const handleSaveBankConfigs = async (configs) => {
    try {
      await examAPI.setQuestionBanks(selectedExam.exam_id, configs);
      setShowBankConfigModal(false);
      fetchExams(); // refresh question_count
    } catch (err) {
      throw err;
    }
  };

  const openModal = (exam = null) => {
    if (exam) {
      setSelectedExam(exam);
      setFormData({
        title: exam.title,
        description: exam.description || '',
        duration_minutes: exam.duration_minutes ?? exam.duration ?? '',
        total_marks: exam.total_marks
      });
    } else {
      setSelectedExam(null);
      setFormData({ title: '', description: '', duration_minutes: '', total_marks: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelectedExam(null); };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getExamStatus = (exam) => {
    if (exam.status === 'archived') return { text: 'Archived', class: 'badge-danger' };
    if (exam.status === 'published') return { text: 'Published', class: 'badge-success' };
    return { text: 'Draft', class: 'badge-secondary' };
  };

  if (loading) return <div className="loading">Loading exams...</div>;

  return (
    <div className="manage-exams">
      <div className="page-header">
        <div className="page-header-content">
          <h1>Manage Exams</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={14} /> Create New Exam
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams created yet</p>
          <button className="btn btn-primary" onClick={() => openModal()}>Create Your First Exam</button>
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
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => {
                const status = getExamStatus(exam);
                return (
                  <tr key={exam.exam_id}>
                    <td>
                      <div className="exam-title">{exam.title}</div>
                      {exam.description && <div className="exam-description">{exam.description}</div>}
                    </td>
                    <td>{exam.duration_minutes ?? exam.duration} min</td>
                    <td>{exam.created_at ? formatDateTime(exam.created_at) : '-'}</td>
                    <td>{exam.updated_at ? formatDateTime(exam.updated_at) : '-'}</td>
                    <td><span className={`badge ${status.class}`}>{status.text}</span></td>
                    <td>{exam.question_count || 0}</td>
                    <td>{exam.assigned_student_count || 0}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openModal(exam)} title="Edit Exam">
                          <Pencil size={15} />
                        </button>

                        {/* Configure Question Banks */}
                        <button
                          className="btn-icon btn-icon-banks"
                          onClick={() => openBankConfigModal(exam)}
                          title="Configure Question Banks (random selection)"
                        >
                          <Database size={15} />
                        </button>

                        {/* Add individual questions */}
                        <button
                          className="btn-icon"
                          onClick={() => { setSelectedExam(exam); setShowQuestionModal(true); }}
                          title="Add Individual Questions"
                        >
                          <Plus size={15} />
                        </button>

                        {exam.status !== 'published' && (
                          <button
                            className="btn btn-success publish-btn"
                            onClick={() => handlePublish(exam.exam_id)}
                            title={
                              (exam.question_count || 0) === 0
                                ? 'Add at least one question or bank before publishing'
                                : 'Publish exam'
                            }
                            disabled={(exam.question_count || 0) === 0}
                          >
                            <Rocket size={14} /> Publish
                          </button>
                        )}

                        {exam.status === 'published' && (
                          <button
                            className="btn btn-danger publish-btn"
                            onClick={() => handleDeactivate(exam.exam_id)}
                            title="Deactivate exam"
                          >
                            Deactivate
                          </button>
                        )}

                        <button className="btn-icon" onClick={() => handleViewResults(exam)} title="View Results">
                          <BarChart3 size={15} />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(exam.exam_id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Exam Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-textarea" rows="3" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes) *</label>
                    <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} className="form-input" min="1" required />
                  </div>
                  <div className="form-group">
                    <label>Total Marks *</label>
                    <input type="number" name="total_marks" value={formData.total_marks} onChange={handleInputChange} className="form-input" min="1" required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <UserCheck size={14} /> {selectedExam ? 'Update' : 'Create'} Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Question Banks Modal */}
      {showBankConfigModal && selectedExam && (
        <BankConfigModal
          exam={selectedExam}
          allBanks={allBanks}
          initialConfigs={examBankConfigs}
          loading={bankConfigLoading}
          onSave={handleSaveBankConfigs}
          onClose={() => setShowBankConfigModal(false)}
        />
      )}

      {/* Add Individual Questions Modal */}
      {showQuestionModal && selectedExam && (
        <div className="modal-overlay" onClick={() => setShowQuestionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Questions to: {selectedExam.title}</h2>
              <button className="modal-close" onClick={() => setShowQuestionModal(false)}>×</button>
            </div>
            <QuestionSelector
              questions={questions}
              onSubmit={(questionIds) => handleAddQuestions(selectedExam.exam_id, questionIds)}
              onCancel={() => setShowQuestionModal(false)}
            />
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedExam && (
        <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
          <div className="modal-content results-modal" onClick={(e) => e.stopPropagation()}>
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
                              <strong>{attempt.total_score} / {attempt.total_marks ?? attempt.exam_total_marks ?? selectedExam.total_marks ?? '-'}</strong>
                            ) : (
                              <span className="badge badge-warning">Pending</span>
                            )}
                          </td>
                          <td>
                            <a className="btn btn-secondary btn-sm" href={`/result/${attempt.attempt_id}`}>View Result</a>
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

/* ─────────────────────────────────────────────
   BANK CONFIG MODAL
───────────────────────────────────────────── */
function BankConfigModal({ exam, allBanks, initialConfigs, loading, onSave, onClose }) {
  const [configs, setConfigs] = useState([]);
  const [newBankId, setNewBankId] = useState('');
  const [newPickCount, setNewPickCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync when parent finishes loading
  useEffect(() => {
    setConfigs(initialConfigs.map(c => ({
      bank_id: Number(c.bank_id),
      bank_name: c.bank_name,
      questions_to_pick: Number(c.questions_to_pick),
      available_questions: Number(c.available_questions || 0)
    })));
  }, [initialConfigs]);

  const usedBankIds = new Set(configs.map(c => c.bank_id));
  const availableBanksToAdd = allBanks.filter(b => !usedBankIds.has(b.bank_id));

  const handleAdd = () => {
    const bankId = Number(newBankId);
    const pickCount = Number(newPickCount);
    if (!bankId) { setError('Please select a question bank.'); return; }
    if (!pickCount || pickCount < 1) { setError('Enter a valid number of questions to pick (≥ 1).'); return; }

    const bank = allBanks.find(b => b.bank_id === bankId);
    if (!bank) return;

    const available = Number(bank.question_count || 0);
    if (pickCount > available) {
      setError(`That bank only has ${available} question(s). You cannot pick more than available.`);
      return;
    }

    setError('');
    setConfigs(prev => [...prev, {
      bank_id: bankId,
      bank_name: bank.name,
      questions_to_pick: pickCount,
      available_questions: available
    }]);
    setNewBankId('');
    setNewPickCount('');
  };

  const handleRemove = (bankId) => {
    setConfigs(prev => prev.filter(c => c.bank_id !== bankId));
  };

  const handlePickCountChange = (bankId, val) => {
    setConfigs(prev => prev.map(c =>
      c.bank_id === bankId ? { ...c, questions_to_pick: Number(val) || 1 } : c
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(configs.map(c => ({ bank_id: c.bank_id, questions_to_pick: c.questions_to_pick })));
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to save bank configuration'));
    } finally {
      setSaving(false);
    }
  };

  const totalPicked = configs.reduce((sum, c) => sum + (c.questions_to_pick || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bank-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2><Database size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Configure Question Banks</h2>
            <p className="bank-config-subtitle">"{exam.title}" — Exam will randomly pick questions from each configured bank</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="bank-config-loading">Loading bank configuration…</p>
          ) : (
            <>
              {/* Current bank configs */}
              {configs.length === 0 ? (
                <div className="bank-config-empty">
                  <Database size={36} strokeWidth={1} />
                  <p>No question banks configured yet.</p>
                  <p className="bank-config-empty-hint">Add a bank below to enable random question selection.</p>
                </div>
              ) : (
                <div className="bank-config-table-wrap">
                  <table className="bank-config-table">
                    <thead>
                      <tr>
                        <th>Question Bank</th>
                        <th>Available</th>
                        <th>Questions to Pick</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map(config => (
                        <tr key={config.bank_id}>
                          <td className="bank-config-name">{config.bank_name}</td>
                          <td className="bank-config-available">
                            <span className="badge badge-secondary">{config.available_questions} Qs</span>
                          </td>
                          <td className="bank-config-pick">
                            <input
                              type="number"
                              className="form-input bank-pick-input"
                              value={config.questions_to_pick}
                              min="1"
                              max={config.available_questions}
                              onChange={(e) => handlePickCountChange(config.bank_id, e.target.value)}
                            />
                            <span className="bank-pick-label">/ {config.available_questions}</span>
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemove(config.bank_id)}
                              type="button"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2" className="bank-config-total-label">Total questions per student:</td>
                        <td colSpan="2" className="bank-config-total-value">
                          <strong>{totalPicked}</strong> questions
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Add new bank row */}
              {availableBanksToAdd.length > 0 && (
                <div className="bank-config-add-row">
                  <div className="bank-config-add-label">Add a bank:</div>
                  <div className="bank-config-add-fields">
                    <select
                      className="form-select bank-config-select"
                      value={newBankId}
                      onChange={(e) => { setNewBankId(e.target.value); setError(''); }}
                    >
                      <option value="">— Select question bank —</option>
                      {availableBanksToAdd.map(b => (
                        <option key={b.bank_id} value={b.bank_id}>
                          {b.name} ({b.question_count || 0} questions)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="form-input bank-pick-input"
                      placeholder="# to pick"
                      value={newPickCount}
                      min="1"
                      onChange={(e) => { setNewPickCount(e.target.value); setError(''); }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAdd}>
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {availableBanksToAdd.length === 0 && allBanks.length > 0 && configs.length > 0 && (
                <p className="bank-config-all-added">All available question banks have been added.</p>
              )}

              {allBanks.length === 0 && (
                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                  No question banks found. Go to <strong>Question Manager</strong> to create banks and add questions.
                </div>
              )}

              {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>{error}</div>}

              {/* Explanation */}
              <div className="bank-config-info">
                <strong>How it works:</strong> When a student starts this exam, the system randomly picks the specified number of questions from each bank. Every student gets a unique, randomized set.
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save Bank Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUESTION SELECTOR (individual questions)
───────────────────────────────────────────── */
function QuestionSelector({ questions, onSubmit, onCancel }) {
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filter, setFilter] = useState('all');

  const toggleQuestion = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const filteredQuestions = filter === 'all'
    ? questions
    : questions.filter(q => q.question_type === filter);

  return (
    <div className="question-selector">
      <div className="filter-bar">
        <label>Filter by type:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-select">
          <option value="all">All Types</option>
          <option value="MCQ">Multiple Choice</option>
          <option value="NUMERIC">Numeric</option>
          <option value="DESCRIPTIVE">Descriptive</option>
        </select>
        <span className="selected-count">{selectedQuestions.length} selected</span>
      </div>

      <div className="question-list">
        {filteredQuestions.length === 0 ? (
          <p className="no-questions">No questions available</p>
        ) : (
          filteredQuestions.map(question => (
            <div key={question.question_id} className="question-item">
              <input
                type="checkbox"
                checked={selectedQuestions.includes(question.question_id)}
                onChange={() => toggleQuestion(question.question_id)}
              />
              <div className="question-content">
                <div className="question-text">{question.question_text}</div>
                <div className="question-meta">
                  <span className={`badge badge-${question.question_type === 'MCQ' ? 'primary' : question.question_type === 'NUMERIC' ? 'success' : 'info'}`}>
                    {question.question_type.toUpperCase()}
                  </span>
                  <span className="question-marks">{question.marks} marks</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSubmit(selectedQuestions)}
          disabled={selectedQuestions.length === 0}
        >
          Add {selectedQuestions.length} Question(s)
        </button>
      </div>
    </div>
  );
}

export default ManageExams;
