import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { examAPI, attemptAPI } from '../../services/api';
import './ExamInterface.css';

function ExamInterface() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const autoSaveTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  useEffect(() => {
    initializeExam();
    return () => {
      // Cleanup timers
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [examId]);

  const initializeExam = async () => {
    try {
      setLoading(true);
      setError('');

      // Get exam details
      const examResponse = await examAPI.getById(examId);
      const examData = examResponse;
      setExam(examData);

      // Check for active attempt or start new one
      let attemptData;
      try {
        const activeResponse = await attemptAPI.getActiveAttempt(examId);
        attemptData = activeResponse;
        
        if (!attemptData) {
          // Start new attempt
          const startResponse = await attemptAPI.startExam(examId);
          attemptData = startResponse;
        }
      } catch (err) {
        // If no active attempt, start new one
        const startResponse = await attemptAPI.startExam(examId);
        attemptData = startResponse;
      }

      setAttempt(attemptData);

      // Get questions (with one retry if active attempt is missing)
      let questionsResponse;
      try {
        questionsResponse = await attemptAPI.getQuestions(examId);
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : (err?.message || '');
        if (errorMessage.toLowerCase().includes('no active attempt found')) {
          const startedAttempt = await attemptAPI.startExam(examId);
          setAttempt(startedAttempt);
          questionsResponse = await attemptAPI.getQuestions(examId);
        } else {
          throw err;
        }
      }
      const questionsData = Array.isArray(questionsResponse)
        ? questionsResponse
        : (questionsResponse.questions || []);
      setQuestions(questionsData);

      // Initialize answers from saved responses
      const savedAnswers = {};
      questionsData.forEach(q => {
        if (q.saved_answer) {
          savedAnswers[q.question_id] = q.saved_answer;
        }
      });
      setAnswers(savedAnswers);

      // Calculate time remaining
      if (questionsResponse.remaining_minutes !== undefined) {
        setTimeRemaining(Math.max(0, Number(questionsResponse.remaining_minutes) * 60));
      } else {
        const startTime = new Date(attemptData.start_time);
        const durationMs = (examData.duration_minutes ?? examData.duration ?? 0) * 60 * 1000;
        const endTime = new Date(startTime.getTime() + durationMs);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);
      }

      // Start countdown
      startCountdown();

    } catch (err) {
      console.error('Error initializing exam:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to load exam');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const buildAnswerPayload = (questionId, answer) => {
    const payload = {
      attempt_id: Number(attempt.attempt_id),
      question_id: Number(questionId)
    };

    if (typeof answer === 'object' && answer !== null) {
      if (answer.selected_option_id) {
        payload.selected_option_id = Number(answer.selected_option_id);
      }
      if (answer.numeric_answer) {
        payload.numeric_answer = Number(answer.numeric_answer);
      }
      if (answer.descriptive_answer) {
        payload.descriptive_answer = answer.descriptive_answer;
      }
    } else if (typeof answer === 'number') {
      payload.numeric_answer = Number(answer);
    } else if (typeof answer === 'string' && answer !== '') {
      payload.numeric_answer = Number(answer);
    } else if (typeof answer === 'string') {
      payload.descriptive_answer = answer;
    }

    return payload;
  };

  const persistAnswer = async (questionId, answer) => {
    const payload = buildAnswerPayload(questionId, answer);
    await attemptAPI.saveAnswer(examId, payload);
  };

  const autoSaveAnswer = useCallback(async (questionId, answer) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await persistAnswer(questionId, answer);
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [attempt]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    autoSaveAnswer(questionId, answer);
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const toggleMarkForReview = (questionId) => {
    setReviewMarks(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        const confirm = window.confirm(
          `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
        );
        if (!confirm) return;
      } else {
        const confirm = window.confirm('Are you sure you want to submit your exam?');
        if (!confirm) return;
      }
    }

    try {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      setSaving(true);
      const answerEntries = Object.entries(answers);
      for (const [questionId, answer] of answerEntries) {
        await persistAnswer(Number(questionId), answer);
      }

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      await attemptAPI.submitExam(examId, attempt.attempt_id);
      navigate(`/result/${attempt.attempt_id}`);
    } catch (err) {
      console.error('Error submitting exam:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to submit exam');
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getQuestionStatus = (question) => {
    const questionId = question.question_id;
    if (reviewMarks[questionId]) {
      return 'reviewed';
    }
    if (answers[questionId]) {
      return 'answered';
    }
    return 'not-answered';
  };

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-error">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/student')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!exam || !attempt || questions.length === 0) {
    return (
      <div className="exam-error">
        <p>No questions available for this exam.</p>
        <button className="btn btn-primary" onClick={() => navigate('/student')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const reviewedCount = Object.values(reviewMarks).filter(Boolean).length;
  const progressPercent = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const isCurrentMarkedForReview = !!reviewMarks[currentQuestion.question_id];

  return (
    <div className="exam-interface">
      {/* Exam Header */}
      <div className="exam-header">
        <div className="exam-info">
          <h1>{exam.title}</h1>
          <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        
        <div className="exam-timer">
          <div className={`timer ${timeRemaining < 300 ? 'timer-warning' : ''}`}>
            <span className="timer-icon"><Clock3 size={16} /></span>
            <span className="timer-value">{formatTime(timeRemaining)}</span>
          </div>
          {saving && <span className="save-indicator">Saving...</span>}
        </div>
      </div>

      <div className="exam-content">
        {/* Question Panel */}
        <div className="question-panel">
          <div className="question-card">
            <div className="exam-progress">
              <div className="progress-meta">
                <span>Attempt Progress</span>
                <strong>{answeredCount}/{questions.length} Answered</strong>
              </div>
              <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="question-header">
              <span className={`badge badge-${
                currentQuestion.question_type === 'MCQ' ? 'primary' : 
                currentQuestion.question_type === 'NUMERIC' ? 'success' : 'info'
              }`}>
                {currentQuestion.question_type.toUpperCase()}
              </span>
              <span className="question-marks">{currentQuestion.marks} marks</span>
            </div>

            <div className="question-text">
              {currentQuestion.question_text}
            </div>

            <div className="answer-section">
              {currentQuestion.question_type === 'MCQ' && (
                <div className="mcq-options">
                  {currentQuestion.options?.map((option, index) => (
                    <label key={index} className="mcq-option">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.question_id}`}
                        value={option.option_id}
                        checked={answers[currentQuestion.question_id]?.selected_option_id === option.option_id}
                        onChange={() =>
                          handleAnswerChange(currentQuestion.question_id, {
                            selected_option_id: option.option_id
                          })
                        }
                      />
                      <span className="option-label">{String.fromCharCode(65 + index)}.</span>
                      <span className="option-text">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'NUMERIC' && (
                <div className="numeric-answer">
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Enter your numeric answer"
                    value={answers[currentQuestion.question_id]?.numeric_answer ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.question_id, {
                        numeric_answer: e.target.value
                      })
                    }
                  />
                </div>
              )}

              {currentQuestion.question_type === 'DESCRIPTIVE' && (
                <div className="descriptive-answer">
                  <textarea
                    className="form-textarea"
                    rows="8"
                    placeholder="Write your answer here..."
                    value={answers[currentQuestion.question_id]?.descriptive_answer ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.question_id, {
                        descriptive_answer: e.target.value
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="question-navigation">
              <button
                className="btn btn-secondary"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                ← Previous
              </button>

              <button
                className={`btn ${isCurrentMarkedForReview ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => toggleMarkForReview(currentQuestion.question_id)}
              >
                {isCurrentMarkedForReview ? 'Unmark Review' : 'Mark for Review'}
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button className="btn btn-success" onClick={() => handleSubmit(false)}>
                  Submit Exam
                </button>
              ) : (
                <button className="btn btn-primary" onClick={goToNextQuestion}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette */}
        <div className="question-palette">
          <div className="palette-header">
            <h3>Question Palette</h3>
            <p>Jump to any question instantly</p>
            <div className="palette-legend">
              <div className="legend-item">
                <span className="palette-indicator answered"></span>
                <span>Answered</span>
              </div>
              <div className="legend-item">
                <span className="palette-indicator reviewed"></span>
                <span>Marked for Review</span>
              </div>
              <div className="legend-item">
                <span className="palette-indicator not-answered"></span>
                <span>Not Answered</span>
              </div>
            </div>
          </div>

          <div className="palette-grid">
            {questions.map((question, index) => {
              const status = getQuestionStatus(question);
              const isCurrent = index === currentQuestionIndex;
              
              return (
                <button
                  key={question.question_id}
                  className={`palette-button ${status} ${isCurrent ? 'current' : ''}`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-footer">
            <div className="answer-summary">
              <div className="summary-item">
                <strong>{answeredCount}</strong>
                <span>Answered</span>
              </div>
              <div className="summary-item">
                <strong>{unansweredCount}</strong>
                <span>Not Answered</span>
              </div>
              <div className="summary-item">
                <strong>{reviewedCount}</strong>
                <span>Review</span>
              </div>
            </div>
            
            <button className="btn btn-danger btn-block" onClick={() => handleSubmit(false)}>
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamInterface;
