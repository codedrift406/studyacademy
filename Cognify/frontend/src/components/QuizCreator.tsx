import React, { useState } from 'react';
import { Button } from './ui/Button';
import { authFetch } from '../lib/api';
import { Loader2, Plus, Trash } from 'lucide-react';
import { useToastContext } from '../components/ToastProvider';

interface QuizCreatorProps {
  lessonId: string;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ lessonId }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ content: '', answers: [{ text: '', isCorrect: true }] }]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToastContext();

  const handleAddQuestion = () => {
    setQuestions([...questions, { content: '', answers: [{ text: '', isCorrect: true }] }]);
  };

  const handleAddAnswer = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].answers.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (qIndex: number, val: string) => {
    const newQs = [...questions];
    newQs[qIndex].content = val;
    setQuestions(newQs);
  };

  const handleAnswerChange = (qIndex: number, aIndex: number, text: string) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex].text = text;
    setQuestions(newQs);
  };

  const handleSetCorrect = (qIndex: number, aIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].answers.forEach((a, i) => (a.isCorrect = i === aIndex));
    setQuestions(newQs);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    const newQs = [...questions];
    newQs.splice(qIndex, 1);
    setQuestions(newQs);
  };

  const submitQuiz = async () => {
    if (!title.trim() || questions.some(q => !q.content.trim())) {
      showToast({ description: 'Please fill all question fields', variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/quizzes/lesson/${lessonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questions })
      });
      if (res.ok) {
        showToast({ description: 'Quiz created successfully', variant: 'success' });
        setTitle('');
        setQuestions([{ content: '', answers: [{ text: '', isCorrect: true }] }]);
      } else {
        showToast({ description: 'Failed to create quiz', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      showToast({ description: 'Request failed', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-glass)', borderRadius: 16 }}>
      <h3 style={{ marginBottom: '1rem' }}>Create Quiz for Lesson</h3>
      <input
        type="text"
        placeholder="Quiz Title (e.g. End of Module Test)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }}
      />
      {questions.map((q, qIdx) => (
        <div key={qIdx} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong>Question {qIdx + 1}</strong>
            <button type="button" onClick={() => handleRemoveQuestion(qIdx)} style={{ color: 'var(--danger)' }}><Trash size={16} /></button>
          </div>
          <input
            type="text"
            placeholder="Type your question..."
            value={q.content}
            onChange={e => handleQuestionChange(qIdx, e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: 6, background: 'var(--bg-surface)', border: 'none', color: 'white' }}
          />
          <div style={{ paddingLeft: '1rem' }}>
            {q.answers.map((a, aIdx) => (
              <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="radio" checked={a.isCorrect} onChange={() => handleSetCorrect(qIdx, aIdx)} />
                <input
                  type="text"
                  placeholder="Answer option"
                  value={a.text}
                  onChange={e => handleAnswerChange(qIdx, aIdx, e.target.value)}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'white' }}
                />
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => handleAddAnswer(qIdx)} icon={<Plus size={14} />}>Add Option</Button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Button variant="secondary" onClick={handleAddQuestion} icon={<Plus size={16} />}>Ask Question</Button>
        <Button onClick={submitQuiz} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Publish Quiz'}</Button>
      </div>
    </div>
  );
};
