import { useState, useEffect } from 'react';
import { CheckCircle2, Filter, Loader2, MessageSquareText, PencilLine } from 'lucide-react';
import { attemptAPI } from '../../services/api';
import './EvaluateDescriptive.css';

function EvaluateDescriptive() {
  const [pendingAnswers, setPendingAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filteredAnswers, setFilteredAnswers] = useState([]);
  const [selectedExam, setSelectedExam] = useState('all');
  const [grading, setGrading] = useState(null);
  const [marksInput, setMarksInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingAnswers();
  }, []);

  useEffect(() => {
    if (selectedExam === 'all') {
      setFilteredAnswers(pendingAnswers);
    } else {
      setFilteredAnswers(pendingAnswers.filter(a => a.exam_id === parseInt(selectedExam)));
    }
  }, [selectedExam, pendingAnswers]);

  const fetchPendingAnswers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await attemptAPI.getPendingDescriptiveAnswers();
      setPendingAnswers(data || []);
    } catch (err) {
      console.error('Error fetching pending answers:', err);
      setError(err?.message || 'Failed to load pending answers');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeClick = (answer) => {
    setGrading(answer);
    setMarksInput('');
    setSuccess('');
  };

  const handleSubmitGrade = async () => {
    if (!marksInput || marksInput === '') {
      setError('Please enter marks');
      return;
    }

    const marks = parseFloat(marksInput);
    if (marks < 0 || marks > grading.marks) {
      setError(`Marks must be between 0 and ${grading.marks}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await attemptAPI.gradeDescriptiveAnswer({
        student_answer_id: grading.student_answer_id,
        marks_awarded: marks
      });

      setSuccess('Answer graded successfully!');
      setPendingAnswers(pendingAnswers.filter(a => a.student_answer_id !== grading.student_answer_id));
      setGrading(null);
      setMarksInput('');
    } catch (err) {
      console.error('Error grading answer:', err);
      setError(err?.message || 'Failed to grade answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setGrading(null);
    setMarksInput('');
    setError('');
  };

  const getExamList = () => {
    const exams = {};
    pendingAnswers.forEach(answer => {
      exams[answer.exam_id] = answer.exam_title;
    });
    return Object.entries(exams);
  };

  if (loading) {
    return (
      <div className="evaluate-descriptive">
        <div className="loading-spinner"></div>
        <p>Loading pending answers...</p>
      </div>
    );
  }

  return (
    <div className="evaluate-descriptive">
      <div className="evaluate-header">
        <h1><MessageSquareText size={22} /> Evaluate Descriptive Answers</h1>
        <div className="header-stats">
          <span className="stat-badge">{filteredAnswers.length} Pending</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {pendingAnswers.length === 0 ? (
        <div className="empty-state">
          <p>No pending descriptive answers to evaluate</p>
        </div>
      ) : (
        <>
          <div className="filter-section">
            <label htmlFor="exam-filter"><Filter size={15} /> Filter by Exam:</label>
            <select
              id="exam-filter"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="form-select"
            >
              <option value="all">All Exams</option>
              {getExamList().map(([examId, title]) => (
                <option key={examId} value={examId}>{title}</option>
              ))}
            </select>
          </div>

          {filteredAnswers.length === 0 ? (
            <div className="empty-state">
              <p>No pending answers for this exam</p>
            </div>
          ) : (
            <div className="answers-list">
              {filteredAnswers.map((answer) => (
                <div key={answer.student_answer_id} className="answer-card">
                  <div className="answer-header">
                    <div className="exam-info">
                      <h3>{answer.exam_title}</h3>
                      <span className="student-name">by {answer.student_name}</span>
                    </div>
                    <span className="marks-badge">{answer.marks} marks</span>
                  </div>

                  <div className="question-section">
                    <h4>Question:</h4>
                    <p className="question-text">{answer.question_text}</p>
                  </div>

                  <div className="answer-section">
                    <h4>Student's Answer:</h4>
                    <div className="student-answer">
                      {answer.descriptive_answer}
                    </div>
                  </div>

                  <div className="attempt-info">
                    <small>
                      Submitted: {new Date(answer.end_time).toLocaleString()}
                    </small>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleGradeClick(answer)}
                    disabled={grading && grading.student_answer_id !== answer.student_answer_id}
                  >
                    {grading?.student_answer_id === answer.student_answer_id ? <><Loader2 size={14} className="spin" /> Grading...</> : <><PencilLine size={14} /> Grade Answer</>}
                  </button>

                  {grading?.student_answer_id === answer.student_answer_id && (
                    <div className="grading-form">
                      <div className="form-group">
                        <label htmlFor={`marks-${answer.student_answer_id}`}>
                          Marks Awarded (out of {grading.marks}):
                        </label>
                        <input
                          id={`marks-${answer.student_answer_id}`}
                          type="number"
                          min="0"
                          max={grading.marks}
                          step="0.5"
                          value={marksInput}
                          onChange={(e) => setMarksInput(e.target.value)}
                          placeholder="Enter marks"
                          className="form-input"
                          disabled={submitting}
                        />
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn btn-success"
                          onClick={handleSubmitGrade}
                          disabled={submitting || !marksInput}
                        >
                          {submitting ? <><Loader2 size={14} className="spin" /> Saving...</> : <><CheckCircle2 size={14} /> Submit Grade</>}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancel}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EvaluateDescriptive;
