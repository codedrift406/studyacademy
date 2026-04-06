import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { authFetch } from '../lib/api';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import styles from './QuizTaker.module.css';

interface Answer {
  id: string;
  text: string;
}

interface Question {
  id: string;
  content: string;
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

interface QuizTakerProps {
  lessonId: string;
  studentId: string;
  onComplete?: (score: number) => void;
}

export const QuizTaker: React.FC<QuizTakerProps> = ({ lessonId, studentId, onComplete }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const res = await authFetch(`/api/quizzes/lesson/${lessonId}`);
        const data = await res.json();
        if (data.quizzes) setQuizzes(data.quizzes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, [lessonId]);

  useEffect(() => {
    if (activeQuiz && timeLeft !== null && timeLeft > 0 && !result) {
      const timer = setInterval(() => setTimeLeft(prev => (prev ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && !result && !submitting) {
      handleSubmit(); // Auto submit
    }
  }, [timeLeft, activeQuiz, result]);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
    setTimeLeft(quiz.questions.length * 60); // 1 minute per question
  };

  const handleSelect = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/quizzes/${activeQuiz.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, answers })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (onComplete) onComplete(data.score);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading tests...</div>;
  }

  if (quizzes.length === 0) {
    // Hide component if no quizzes
    return null;
  }

  if (!activeQuiz) {
    return (
      <div className={styles.quizList}>
        <h3>Available Tests</h3>
        <div className={styles.list}>
          {quizzes.map(quiz => (
            <div key={quiz.id} className={styles.quizCard}>
              <h4>{quiz.title}</h4>
              <p>{quiz.questions.length} questions</p>
              <Button onClick={() => startQuiz(quiz)}>Start Test</Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className={styles.resultCard}>
        <div className={styles.resultIcon}>
          {result.passed ? <CheckCircle size={60} color="var(--success)" /> : <XCircle size={60} color="var(--danger)" />}
        </div>
        <h3>Test Completed: {activeQuiz.title}</h3>
        <div className={styles.scoreDisplay}>Score: {Math.round(result.score)}%</div>
        <div className={styles.status}>{result.passed ? 'Passed!' : 'Needs improvement'}</div>
        <Button onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
      </div>
    );
  }

  return (
    <div className={styles.takingContainer}>
      <div className={styles.header}>
        <h3>{activeQuiz.title}</h3>
        {timeLeft !== null && (
          <div className={`${styles.timer} ${timeLeft < 60 ? styles.timerWarning : ''}`}>
            <Clock size={16} /> 
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      <div className={styles.questionList}>
        {activeQuiz.questions.map((q, idx) => (
          <div key={q.id} className={styles.questionBlock}>
            <div className={styles.questionContent}>
              <span className={styles.questionNumber}>{idx + 1}.</span> {q.content}
            </div>
            <div className={styles.answers}>
              {q.answers.map(a => (
                <label key={a.id} className={`${styles.answerOption} ${answers[q.id] === a.id ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name={q.id}
                    value={a.id}
                    checked={answers[q.id] === a.id}
                    onChange={() => handleSelect(q.id, a.id)}
                  />
                  {a.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : 'Submit Answers'}
        </Button>
      </div>
    </div>
  );
};
