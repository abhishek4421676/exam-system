import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, FolderPlus, Pencil, Plus, Trash2,
  BookOpen, Upload, ChevronRight, X, FileText,
  Hash, AlignLeft, FolderOpen, ArrowLeft
} from 'lucide-react';
import { questionAPI } from '../../services/api';
import './ManageQuestions.css';

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
function ManageQuestions() {
  // Tab: 'banks' | 'questions'
  const [activeTab, setActiveTab] = useState('banks');
  // When a bank is selected we drill into it
  const [activeBankId, setActiveBankId] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [filter, setFilter] = useState('all');

  const [formData, setFormData] = useState(defaultQuestionForm());
  const [bankForm, setBankForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [qs, bs] = await Promise.all([questionAPI.getAll(), questionAPI.getBanks()]);
      setQuestions(qs || []);
      setBanks(bs || []);
      setError('');
    } catch (err) {
      setError(getMsg(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  // ── Question CRUD ──────────────────────────────

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    try {
      const payload = buildQuestionPayload(formData);
      if (selectedQuestion) {
        await questionAPI.update(selectedQuestion.question_id, payload);
      } else {
        await questionAPI.create(payload);
      }
      await fetchAll();
      closeQuestionModal();
    } catch (err) {
      setError(getMsg(err, 'Failed to save question'));
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await questionAPI.delete(questionId);
      await fetchAll();
    } catch (err) {
      setError(getMsg(err, 'Failed to delete question'));
    }
  };

  const openQuestionModal = (question = null, bankId = null) => {
    if (question) {
      setSelectedQuestion(question);
      setFormData(questionToForm(question));
    } else {
      setSelectedQuestion(null);
      setFormData({ ...defaultQuestionForm(), question_bank_id: bankId ? String(bankId) : '' });
    }
    setShowQuestionModal(true);
  };

  const closeQuestionModal = () => {
    setShowQuestionModal(false);
    setSelectedQuestion(null);
  };

  // ── Bank CRUD ──────────────────────────────────

  const handleCreateBank = async (e) => {
    e.preventDefault();
    try {
      const bank = await questionAPI.createBank(bankForm);
      await fetchAll();
      setBankForm({ name: '', description: '' });
      setShowBankModal(false);
      // Drill into newly created bank
      setActiveBankId(bank.bank_id);
      setActiveTab('banks');
    } catch (err) {
      setError(getMsg(err, 'Failed to create question bank'));
    }
  };

  // ── Derived ────────────────────────────────────

  const activeBank = banks.find(b => b.bank_id === activeBankId) || null;

  const bankQuestions = activeBankId
    ? questions.filter(q => Number(q.question_bank_id) === Number(activeBankId))
    : [];

  const allFilteredQuestions = filter === 'all'
    ? questions
    : questions.filter(q => q.question_type === filter.toUpperCase());

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="manage-questions">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Question Manager</h1>
          <p className="page-subtitle">Organise your questions into banks or browse all questions.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowBankModal(true)}>
            <FolderPlus size={14} /> New Bank
          </button>
          <button
            className="btn btn-primary"
            onClick={() => openQuestionModal(null, activeBankId)}
          >
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Tabs ── */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'banks' ? 'active' : ''}`}
          onClick={() => { setActiveTab('banks'); setActiveBankId(null); }}
        >
          <FolderOpen size={15} /> Question Banks
          <span className="tab-chip">{banks.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('questions'); setActiveBankId(null); }}
        >
          <BookOpen size={15} /> All Questions
          <span className="tab-chip">{questions.length}</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          BANKS TAB
      ═══════════════════════════════════════════ */}
      {activeTab === 'banks' && !activeBankId && (
        <BanksView
          banks={banks}
          onSelectBank={(id) => setActiveBankId(id)}
          onNewBank={() => setShowBankModal(true)}
        />
      )}

      {/* ── Bank Detail (drill-down) ── */}
      {activeTab === 'banks' && activeBankId && (
        <BankDetail
          bank={activeBank}
          questions={bankQuestions}
          banks={banks}
          onBack={() => setActiveBankId(null)}
          onAddQuestion={() => openQuestionModal(null, activeBankId)}
          onEditQuestion={(q) => openQuestionModal(q)}
          onDeleteQuestion={handleDeleteQuestion}
          onOpenCsv={() => setShowCsvModal(true)}
          onRefresh={fetchAll}
        />
      )}

      {/* ═══════════════════════════════════════════
          ALL QUESTIONS TAB
      ═══════════════════════════════════════════ */}
      {activeTab === 'questions' && (
        <AllQuestionsView
          questions={allFilteredQuestions}
          filter={filter}
          setFilter={setFilter}
          banks={banks}
          onAdd={() => openQuestionModal()}
          onEdit={(q) => openQuestionModal(q)}
          onDelete={handleDeleteQuestion}
          totalCount={questions.length}
        />
      )}

      {/* ═══════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════ */}

      {/* Question Modal */}
      {showQuestionModal && (
        <QuestionModal
          formData={formData}
          setFormData={setFormData}
          banks={banks}
          selectedQuestion={selectedQuestion}
          onSubmit={handleSubmitQuestion}
          onClose={closeQuestionModal}
        />
      )}

      {/* Create Bank Modal */}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Question Bank</h2>
              <button className="modal-close" onClick={() => setShowBankModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBank}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Bank Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankForm.name}
                    onChange={e => setBankForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Chapter 5 – Thermodynamics"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    value={bankForm.description}
                    onChange={e => setBankForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description…"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBankModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <FolderPlus size={14} /> Create Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <CsvUploadModal
          bankId={activeBankId}
          banks={banks}
          onClose={() => setShowCsvModal(false)}
          onDone={fetchAll}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BANKS GRID VIEW
───────────────────────────────────────────── */
function BanksView({ banks, onSelectBank, onNewBank }) {
  if (banks.length === 0) {
    return (
      <div className="empty-state">
        <FolderOpen size={48} strokeWidth={1} />
        <p>No question banks yet</p>
        <button className="btn btn-primary" onClick={onNewBank}>
          <FolderPlus size={14} /> Create Your First Bank
        </button>
      </div>
    );
  }

  return (
    <div className="banks-grid">
      {banks.map(bank => (
        <div key={bank.bank_id} className="bank-card" onClick={() => onSelectBank(bank.bank_id)}>
          <div className="bank-card-icon"><FolderOpen size={28} /></div>
          <div className="bank-card-body">
            <div className="bank-card-name">{bank.name}</div>
            {bank.description && <div className="bank-card-desc">{bank.description}</div>}
            <div className="bank-card-meta">
              <span className="bank-q-count">{bank.question_count || 0} questions</span>
            </div>
          </div>
          <ChevronRight size={18} className="bank-card-arrow" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BANK DETAIL
───────────────────────────────────────────── */
function BankDetail({ bank, questions, banks, onBack, onAddQuestion, onEditQuestion, onDeleteQuestion, onOpenCsv }) {
  if (!bank) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb-row">
        <button className="btn-link" onClick={onBack}>
          <ArrowLeft size={14} /> Question Banks
        </button>
        <ChevronRight size={14} className="bc-sep" />
        <span>{bank.name}</span>
      </div>

      <div className="bank-detail-header">
        <div>
          <h2 className="bank-detail-name">{bank.name}</h2>
          {bank.description && <p className="bank-detail-desc">{bank.description}</p>}
          <span className="badge badge-secondary">{questions.length} questions</span>
        </div>
        <div className="bank-detail-actions">
          <button className="btn btn-secondary" onClick={onOpenCsv}>
            <Upload size={14} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={onAddQuestion}>
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} strokeWidth={1} />
          <p>No questions in this bank yet</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={onAddQuestion}>
              <Plus size={14} /> Add Manually
            </button>
            <button className="btn btn-secondary" onClick={onOpenCsv}>
              <Upload size={14} /> Import CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="questions-grid">
          {questions.map(q => (
            <QuestionCard
              key={q.question_id}
              question={q}
              onEdit={onEditQuestion}
              onDelete={onDeleteQuestion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ALL QUESTIONS VIEW
───────────────────────────────────────────── */
function AllQuestionsView({ questions, filter, setFilter, banks, onAdd, onEdit, onDelete, totalCount }) {
  return (
    <div>
      <div className="filter-section">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="form-select">
            <option value="all">All Types ({totalCount})</option>
            <option value="mcq">MCQ</option>
            <option value="numeric">Numeric</option>
            <option value="descriptive">Descriptive</option>
          </select>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} strokeWidth={1} />
          <p>No questions found</p>
          <button className="btn btn-primary" onClick={onAdd}>Add First Question</button>
        </div>
      ) : (
        <div className="questions-grid">
          {questions.map(q => (
            <QuestionCard key={q.question_id} question={q} banks={banks} onEdit={onEdit} onDelete={onDelete} showBank />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUESTION CARD
───────────────────────────────────────────── */
function QuestionCard({ question, banks = [], onEdit, onDelete, showBank = false }) {
  const typeIcon =
    question.question_type === 'MCQ' ? <Hash size={12} /> :
      question.question_type === 'NUMERIC' ? <Hash size={12} /> :
        <AlignLeft size={12} />;

  const badgeClass =
    question.question_type === 'MCQ' ? 'badge-primary' :
      question.question_type === 'NUMERIC' ? 'badge-success' : 'badge-info';

  const bank = showBank && banks.find(b => b.bank_id === Number(question.question_bank_id));

  return (
    <div className="question-card">
      <div className="question-card-header">
        <span className={`badge ${badgeClass}`}>{typeIcon} {question.question_type}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {bank && <span className="bank-tag"><FolderOpen size={11} /> {bank.name}</span>}
          <span className="question-marks">{question.marks} pts</span>
        </div>
      </div>

      <div className="question-card-body">
        <p className="question-text">{question.question_text}</p>

        {question.question_type === 'MCQ' && question.options && (
          <div className="question-options">
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                className={`option-item ${idx === question.correct_option_index ? 'correct-option' : ''}`}
              >
                <span className="option-label">{String.fromCharCode(65 + idx)}</span>
                <span>{opt}</span>
                {idx === question.correct_option_index && <CheckCircle2 size={13} className="check-icon" />}
              </div>
            ))}
          </div>
        )}

        {question.question_type === 'NUMERIC' && question.correct_numeric_answer !== undefined && (
          <div className="answer-preview">
            <strong>Answer:</strong> {question.correct_numeric_answer}
          </div>
        )}

        {question.question_type === 'DESCRIPTIVE' && (
          <div className="descriptive-note">Manual evaluation required</div>
        )}
      </div>

      <div className="question-card-footer">
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(question)}>
          <Pencil size={13} /> Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(question.question_id)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUESTION MODAL (create / edit)
───────────────────────────────────────────── */
function QuestionModal({ formData, setFormData, banks, selectedQuestion, onSubmit, onClose }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'question_type') {
      setFormData({
        ...defaultQuestionForm(),
        question_bank_id: formData.question_bank_id,
        question_type: value,
        options: value === 'MCQ' ? ['', '', '', ''] : [],
      });
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const handleOptionChange = (idx, val) => {
    const opts = [...formData.options];
    opts[idx] = val;
    setFormData(p => ({ ...p, options: opts }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{selectedQuestion ? 'Edit Question' : 'Add Question'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">

            <div className="form-row">
              <div className="form-group">
                <label>Type *</label>
                <select name="question_type" value={formData.question_type} onChange={handleChange} className="form-select" required>
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="NUMERIC">Numeric</option>
                  <option value="DESCRIPTIVE">Descriptive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Marks *</label>
                <input type="number" name="marks" value={formData.marks} onChange={handleChange} className="form-input" min="1" required />
              </div>
            </div>

            <div className="form-group">
              <label>Question Bank</label>
              <select name="question_bank_id" value={formData.question_bank_id} onChange={handleChange} className="form-select">
                <option value="">— No bank —</option>
                {banks.map(b => (
                  <option key={b.bank_id} value={b.bank_id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Question Text *</label>
              <textarea name="question_text" value={formData.question_text} onChange={handleChange} className="form-textarea" rows="4" required />
            </div>

            {formData.question_type === 'MCQ' && (
              <>
                <div className="form-group">
                  <label>Options *</label>
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="option-input-group">
                      <span className="option-number">{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        className="form-input"
                        placeholder={`Option ${idx + 1}`}
                        required
                      />
                      {formData.options.length > 2 && (
                        <button type="button" className="btn-remove-option" onClick={() =>
                          setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))
                        }><X size={13} /></button>
                      )}
                    </div>
                  ))}
                  {formData.options.length < 6 && (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}
                      onClick={() => setFormData(p => ({ ...p, options: [...p.options, ''] }))}>
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Correct Answer *</label>
                  <select name="correct_answer" value={formData.correct_answer} onChange={handleChange} className="form-select" required>
                    <option value="">Select correct answer</option>
                    {formData.options.map((opt, idx) => opt.trim() && (
                      <option key={idx} value={opt}>{String.fromCharCode(65 + idx)}. {opt}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {formData.question_type === 'NUMERIC' && (
              <div className="form-group">
                <label>Correct Answer *</label>
                <input type="number" name="correct_answer" value={formData.correct_answer} onChange={handleChange} className="form-input" step="any" required />
              </div>
            )}

            {formData.question_type === 'DESCRIPTIVE' && (
              <div className="alert alert-info">Descriptive answers are evaluated manually by the teacher.</div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {selectedQuestion ? 'Update Question' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CSV UPLOAD MODAL
───────────────────────────────────────────── */
function CsvUploadModal({ bankId, banks, onClose, onDone }) {
  const [selectedBankId, setSelectedBankId] = useState(bankId ? String(bankId) : '');
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const CSV_TEMPLATE =
    'question_type,question_text,marks,option_a,option_b,option_c,option_d,correct_answer\n' +
    'MCQ,What is 2+2?,1,2,4,3,5,4\n' +
    'NUMERIC,What is the value of pi to 2 decimal places?,2,,,,, 3.14\n' +
    'DESCRIPTIVE,Explain Newton\'s second law.,5,,,,, \n';

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCsv(text).slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    const rows = parseCsv(csvText);
    if (!rows.length) { setError('No valid rows found in CSV'); return; }
    setUploading(true);
    setError('');
    try {
      const questions = rows.map(r => csvRowToQuestion(r, selectedBankId));
      const res = await questionAPI.bulkCreate(questions);
      setResult(res);
      await onDone();
    } catch (err) {
      setError(getMsg(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_bank_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Upload size={16} /> Import Questions via CSV</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {result ? (
            <div>
              <div className="alert alert-success">
                ✅ {result.created_count} questions imported successfully.
                {result.error_count > 0 && ` ${result.error_count} failed.`}
              </div>
              {result.errors?.length > 0 && (
                <div className="csv-errors">
                  {result.errors.map((e, i) => (
                    <div key={i} className="csv-error-row">Row {e.index + 2}: {e.error}</div>
                  ))}
                </div>
              )}
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Target Question Bank</label>
                <select className="form-select" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                  <option value="">— No bank (standalone) —</option>
                  {banks.map(b => <option key={b.bank_id} value={b.bank_id}>{b.name}</option>)}
                </select>
              </div>

              <div className="csv-template-note">
                <FileText size={14} />
                <span>
                  CSV columns: <code>question_type</code>, <code>question_text</code>, <code>marks</code>,
                  <code>option_a</code>–<code>option_d</code>, <code>correct_answer</code>
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
                  Download Template
                </button>
              </div>

              <div
                className="csv-drop-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) { fileRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: [f] } }); }
                }}
              >
                <Upload size={28} strokeWidth={1.5} />
                <p>{file ? file.name : 'Click or drag & drop a .csv file here'}</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              {preview.length > 0 && (
                <div className="csv-preview">
                  <p className="csv-preview-label">Preview (first 5 rows):</p>
                  <div className="csv-preview-table-wrap">
                    <table className="csv-preview-table">
                      <thead>
                        <tr>
                          <th>Type</th><th>Question</th><th>Marks</th><th>Answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i}>
                            <td><span className="badge badge-secondary">{r.question_type || '?'}</span></td>
                            <td>{r.question_text?.slice(0, 60)}{r.question_text?.length > 60 ? '…' : ''}</td>
                            <td>{r.marks}</td>
                            <td>{r.correct_answer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && <div className="alert alert-danger">{error}</div>}
            </>
          )}
        </div>

        {!result && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!csvText || uploading}
            >
              {uploading ? 'Uploading…' : `Import ${parseCsv(csvText).length} Questions`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function defaultQuestionForm() {
  return {
    question_text: '',
    question_type: 'MCQ',
    marks: '',
    question_bank_id: '',
    options: ['', '', '', ''],
    correct_answer: '',
  };
}

function questionToForm(q) {
  let correct_answer = '';
  if (q.question_type === 'MCQ' && q.options && q.correct_option_index !== undefined) {
    correct_answer = q.options[q.correct_option_index] || '';
  } else if (q.question_type === 'NUMERIC') {
    correct_answer = q.correct_numeric_answer !== undefined ? String(q.correct_numeric_answer) : '';
  }
  return {
    question_text: q.question_text,
    question_type: q.question_type,
    marks: q.marks,
    question_bank_id: q.question_bank_id ? String(q.question_bank_id) : '',
    options: q.options || ['', '', '', ''],
    correct_answer,
  };
}

function buildQuestionPayload(formData) {
  const payload = {
    question_text: formData.question_text,
    question_type: formData.question_type,
    marks: parseInt(formData.marks),
    question_bank_id: formData.question_bank_id ? Number(formData.question_bank_id) : undefined,
  };
  if (formData.question_type === 'MCQ') {
    const filtered = formData.options.filter(o => o.trim() !== '');
    payload.options = filtered;
    const idx = filtered.indexOf(formData.correct_answer);
    payload.correct_option_index = idx >= 0 ? idx : 0;
  } else if (formData.question_type === 'NUMERIC') {
    payload.correct_numeric_answer = parseFloat(formData.correct_answer);
  }
  return payload;
}

function parseCsv(text) {
  if (!text?.trim()) return [];
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => r.question_type && r.question_text);
}

function csvRowToQuestion(row, bankId) {
  const type = (row.question_type || '').toUpperCase();
  const q = {
    question_type: type,
    question_text: row.question_text,
    marks: parseInt(row.marks) || 1,
    question_bank_id: bankId ? Number(bankId) : undefined,
  };
  if (type === 'MCQ') {
    const options = [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean);
    q.options = options;
    const ci = options.findIndex(o => o.trim().toLowerCase() === (row.correct_answer || '').trim().toLowerCase());
    q.correct_option_index = ci >= 0 ? ci : 0;
  } else if (type === 'NUMERIC') {
    q.correct_numeric_answer = parseFloat(row.correct_answer) || 0;
  }
  return q;
}

function getMsg(err, fallback) {
  return typeof err === 'string' ? err : (err?.message || fallback);
}

export default ManageQuestions;
