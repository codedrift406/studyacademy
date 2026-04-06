import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, CheckCircle2, Plus, Trash2, BookOpen, PenTool } from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToastContext } from '../components/ToastProvider';
import { authFetch } from '../lib/api';
import styles from './TeacherCourseCreate.module.css';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface NewLesson {
  title: string;
  content: string;
}

export const TeacherCourseCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [user, setUser] = useState<User | null>(null);
  const { showToast } = useToastContext();
  
  // Tabs: 'ai' or 'manual'
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  
  // AI Generator state
  const [topic, setTopic] = useState('');
  const [templateKey, setTemplateKey] = useState<'bootcamp' | 'academic' | 'corporate' | 'exam'>('bootcamp');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [language, setLanguage] = useState<'en' | 'ru' | 'kk'>('en');
  const [targetAudience, setTargetAudience] = useState('');
  const [courseGoal, setCourseGoal] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Manual Creator state
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualLanguage, setManualLanguage] = useState<'en' | 'ru' | 'kk'>('en');
  const [manualAudience, setManualAudience] = useState('');
  const [manualGoals, setManualGoals] = useState('');
  const [manualWeeks, setManualWeeks] = useState(4);
  const [manualLessons, setManualLessons] = useState<NewLesson[]>([{ title: '', content: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  // Success state
  const [isDone, setIsDone] = useState(false);
  const [generatedCourseId, setGeneratedCourseId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    const loadCourse = async () => {
      const res = await authFetch(`/api/courses/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const course = data.course;
      setCreationMode(course.aiGenerated ? 'ai' : 'manual');
      setManualTitle(course.title || '');
      setManualDescription(course.description || '');
      setManualLanguage((course.language || 'en') as 'en' | 'ru' | 'kk');
      setManualAudience(course.targetAudience || '');
      setManualWeeks(course.estimatedWeeks || 4);
      try {
        const goals = course.learningGoals ? JSON.parse(course.learningGoals) : [];
        setManualGoals(Array.isArray(goals) ? goals.join('\n') : '');
      } catch {
        setManualGoals('');
      }
      setManualLessons(
        Array.isArray(course.lessons) && course.lessons.length
          ? course.lessons.map((lesson: NewLesson) => ({ title: lesson.title, content: lesson.content || '' }))
          : [{ title: '', content: '' }]
      );
      setTopic(course.title || '');
      setTargetAudience(course.targetAudience || '');
      setCourseGoal(course.description || '');
      setDurationWeeks(course.estimatedWeeks || 4);
      setLanguage((course.language || 'en') as 'en' | 'ru' | 'kk');
    };
    loadCourse().catch((error) => console.error(error));
  }, [id]);

  const handleGenerate = async () => {
    if (!topic || !user) {
      showToast({ description: 'Enter a course topic to generate a structure.', variant: 'warning' });
      return;
    }
    setIsGenerating(true);
    const controller = new AbortController();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/generate-from-template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, templateKey, level, language, targetAudience, courseGoal, durationWeeks }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast({ description: `AI generation failed: ${errorText || 'Please try again.'}`, variant: 'error' });
        return;
      }

      const data = await response.json();
      if (data.course && data.course.id) {
        setGeneratedCourseId(data.course.id);
      }
      showToast({ description: 'Course structure generated successfully.', variant: 'success' });
      setIsDone(true);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error(err);
        showToast({ description: 'AI generation failed. Please try again.', variant: 'error' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualTitle || !user) {
      showToast({ description: 'Please provide a title to save the course.', variant: 'warning' });
      return;
    }
    setIsSaving(true);
    
    try {
      const response = await authFetch(isEditMode ? `/api/courses/${id}` : '/api/courses', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: manualTitle,
          description: manualDescription,
          language: manualLanguage,
          targetAudience: manualAudience,
          estimatedWeeks: manualWeeks,
          learningGoals: manualGoals.split('\n').map((item) => item.trim()).filter(Boolean),
          lessons: manualLessons.filter(l => l.title.trim() !== '')
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast({ description: `Save failed: ${errorText || 'Please try again.'}`, variant: 'error' });
        return;
      }

      const data = await response.json();
      if (data.course && data.course.id) {
        setGeneratedCourseId(data.course.id);
      }
      showToast({ description: isEditMode ? 'Course updated successfully.' : 'Course created successfully.', variant: 'success' });
      setIsDone(true);
    } catch (err) {
      console.error(err);
      showToast({ description: 'Unable to save the course. Please try again.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const addLesson = () => {
    setManualLessons([...manualLessons, { title: '', content: '' }]);
  };

  const updateLesson = (index: number, field: keyof NewLesson, value: string) => {
    const next = [...manualLessons];
    next[index][field] = value;
    setManualLessons(next);
  };

  const removeLesson = (index: number) => {
    if (manualLessons.length <= 1) return;
    setManualLessons(manualLessons.filter((_, i) => i !== index));
  };

  if (!user) return null;

  if (isDone) {
    return (
      <div className={styles.container}>
        <Card className={styles.successCard}>
          <CardBody className={styles.successContent}>
            <CheckCircle2 size={64} className={styles.successIcon} />
            <h2 className={styles.successTitle}>{isEditMode ? 'Course Updated!' : 'Course Created!'}</h2>
            <p className={styles.successText}>
              Your course "{creationMode === 'ai' ? topic : manualTitle}" is now live and ready for students.
            </p>
            <div className={styles.successActions}>
              <Button onClick={() => generatedCourseId ? navigate(`/course/${generatedCourseId}`) : navigate('/teacher/dashboard')}>
                View Course
              </Button>
              <Button variant="secondary" onClick={() => { setIsDone(false); setTopic(''); setManualTitle(''); setManualLessons([{ title: '', content: '' }]); }}>
                Create Another
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Create New Course</h1>
          <p className={styles.headerText}>{isEditMode ? 'Update your existing course and lessons.' : 'Choose a creation method below to get started.'}</p>
        </div>
      </header>

      {/* Tabs Switcher */}
      <div className={styles.tabSwitcher}>
        <button 
          className={`${styles.tabBtn} ${creationMode === 'ai' ? styles.activeTab : ''}`}
          onClick={() => setCreationMode('ai')}
        >
          <Sparkles size={20} /> AI Wizard
        </button>
        <button 
          className={`${styles.tabBtn} ${creationMode === 'manual' ? styles.activeTab : ''}`}
          onClick={() => setCreationMode('manual')}
        >
          <PenTool size={20} /> Classic Creator
        </button>
      </div>

      <div className="animate-fade-in">
        {creationMode === 'ai' ? (
          <div className={styles.glowBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className={styles.iconCircle}><Sparkles size={20} /></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Build with AI</h3>
            </div>
            
            <textarea 
              className="glass-input textarea-expand"
              style={{ width: '100%', minHeight: '120px', padding: '1.25rem', marginBottom: '1.5rem', borderRadius: '16px' }}
              placeholder="E.g. Advanced Artificial Intelligence in Modern Education..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />

            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Suggestions:</span>
              <div className={styles.tags}>
                <span className={styles.tag} onClick={() => setTopic('Modern Web Architecture')}>Web Arch</span>
                <span className={styles.tag} onClick={() => setTopic('Practical Cybersecurity for Small Business')}>Cybersecurity</span>
                <span className={styles.tag} onClick={() => setTopic('Foundations of UX/UI Design')}>UI/UX Design</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1rem' }}>
              <label>
                <div style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Template</div>
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as 'bootcamp' | 'academic' | 'corporate' | 'exam')}
                  className={styles.textarea}
                  style={{ minHeight: 44, height: 44, padding: '0 0.8rem' }}
                >
                  <option value="bootcamp">Bootcamp</option>
                  <option value="academic">Academic</option>
                  <option value="corporate">Corporate</option>
                  <option value="exam">Exam Prep</option>
                </select>
              </label>

              <label>
                <div style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Level</div>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                  className={styles.textarea}
                  style={{ minHeight: 44, height: 44, padding: '0 0.8rem' }}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label>
                <div style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Language</div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'ru' | 'kk')}
                  className={styles.textarea}
                  style={{ minHeight: 44, height: 44, padding: '0 0.8rem' }}
                >
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="kk">Kazakh</option>
                </select>
              </label>

              <Input
                label="Target Audience"
                placeholder="E.g. first-year university students"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />

              <Input
                label="Course Goal"
                placeholder="E.g. prepare students to design AI-assisted lessons"
                value={courseGoal}
                onChange={(e) => setCourseGoal(e.target.value)}
              />

              <label>
                <div style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Duration (weeks)</div>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value) || 4)}
                  className={styles.textarea}
                  style={{ minHeight: 44, height: 44, padding: '0 0.8rem' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.8rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Structure</div>
                <strong>{templateKey}</strong>
              </div>
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.8rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audience</div>
                <strong>{targetAudience || 'General learners'}</strong>
              </div>
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.8rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Duration</div>
                <strong>{durationWeeks} weeks</strong>
              </div>
            </div>

            <Button 
              size="lg" 
              fullWidth 
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              icon={isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
            >
              {isGenerating ? 'Generating Curriculum...' : 'Generate Course Structure'}
            </Button>
          </div>
        ) : (
          <div className={styles.glowBox}>
            <div className={styles.manualForm}>
              <div className={styles.inputGroup}>
                <Input 
                  label="Course Title"
                  placeholder="E.g. Complete JavaScript Mastery"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Course Description</label>
                <textarea 
                  className={styles.textarea}
                  style={{ height: '100px', minHeight: '100px' }}
                  placeholder="Describe your course goals and target audience..."
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Language</label>
                <select
                  value={manualLanguage}
                  onChange={(e) => setManualLanguage(e.target.value as 'en' | 'ru' | 'kk')}
                  className="glass-input"
                  style={{ minHeight: '52px', width: '100%', padding: '0 1rem' }}
                >
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="kk">Kazakh</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <Input
                  label="Target Audience"
                  placeholder="E.g. drone operators, agronomy students"
                  value={manualAudience}
                  onChange={(e) => setManualAudience(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <Input
                  label="Estimated Weeks"
                  type="number"
                  value={String(manualWeeks)}
                  onChange={(e) => setManualWeeks(Number(e.target.value) || 4)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Learning Goals</label>
                <textarea
                  className="glass-input"
                  style={{ height: '120px', minHeight: '120px', width: '100%', padding: '1rem' }}
                  placeholder="One goal per line"
                  value={manualGoals}
                  onChange={(e) => setManualGoals(e.target.value)}
                />
              </div>

              <div className={styles.lessonsSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Lessons Structure</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{manualLessons.length} lessons added</span>
                </div>

                {manualLessons.map((lesson, idx) => (
                  <div key={idx} className={styles.lessonEntry}>
                    <div className={styles.lessonHeader}>
                      <span className={styles.lessonIndex}>#{idx + 1}</span>
                      <button className={styles.removeBtn} onClick={() => removeLesson(idx)} disabled={manualLessons.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <input 
                      className={styles.lessonInput}
                      placeholder="Lesson Title (e.g. Introduction to Variables)"
                      value={lesson.title}
                      onChange={(e) => updateLesson(idx, 'title', e.target.value)}
                    />
                    <textarea 
                      className={styles.lessonTextarea}
                      placeholder="Lesson content or description..."
                      value={lesson.content}
                      onChange={(e) => updateLesson(idx, 'content', e.target.value)}
                    />
                  </div>
                ))}

                <button className={styles.addLessonBtn} onClick={addLesson}>
                  <Plus size={18} /> Add New Lesson
                </button>
              </div>

              <div className={styles.formActions}>
                <Button 
                  size="lg" 
                  fullWidth 
                  onClick={handleManualSave}
                  disabled={isSaving || !manualTitle.trim()}
                  icon={isSaving ? <Loader2 className="animate-spin" /> : <BookOpen size={18} />}
                >
                  {isSaving ? (isEditMode ? 'Updating Course...' : 'Creating Course...') : (isEditMode ? 'Update Course' : 'Create Course Now')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

