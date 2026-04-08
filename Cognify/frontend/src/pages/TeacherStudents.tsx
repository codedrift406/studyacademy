import { useEffect, useMemo, useState } from 'react';
import { 
  Save, 
  Search as SearchIcon, 
  Users, 
  BookOpen, 
  Filter,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/Skeleton';
import { usePreferences } from '../context/PreferencesContext';
import styles from './TeacherDashboard.module.css';

interface UserData {
  id: string;
}

interface CourseOption {
  id: string;
  title: string;
}

interface GradeCourseData {
  course: {
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string }>;
  };
  students: Array<{
    student: { id: string; name: string | null; email: string };
    averageScore: number | null;
    risk: boolean;
    grades: Array<{ lessonId: string; lessonTitle: string; score: number | null }>;
  }>;
}

interface TeacherOverview {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  completionRate: number;
  averageScore: number | null;
  riskCount: number;
  riskStudents: Array<{
    studentName: string;
    courseTitle: string;
    averageScore: number | null;
    recommendation?: string;
  }>;
  weakTopics?: Array<{
    lessonTitle: string;
    count: number;
  }>;
}

export const TeacherStudents = () => {
  const { t } = usePreferences();
  const [token] = useState(localStorage.getItem('token') || '');
  const [teacherId, setTeacherId] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [gradeData, setGradeData] = useState<GradeCourseData | null>(null);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    const user = JSON.parse(raw) as UserData;
    setTeacherId(user.id);
  }, []);

  useEffect(() => {
    if (!teacherId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [coursesRes, overviewRes] = await Promise.all([
          fetch(`/api/courses?teacherId=${teacherId}&limit=100`),
          fetch(`/api/teacher/overview/${teacherId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const coursesData = await coursesRes.json();
        const overviewData = await overviewRes.json();
        const items = (coursesData.courses || []) as Array<{ id: string; title: string }>;
        setCourses(items.map((item) => ({ id: item.id, title: item.title })));
        setOverview(overviewData);
        if (items.length && !selectedCourseId) {
          setSelectedCourseId(items[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load().catch((error) => console.error(error));
  }, [teacherId, token, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    fetch(`/api/grades/course/${selectedCourseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setGradeData(data))
      .catch((error) => console.error(error));
  }, [selectedCourseId, token]);

  const filteredStudents = useMemo(() => {
    if (!gradeData) return [];
    if (!searchQuery.trim()) return gradeData.students;
    const low = searchQuery.toLowerCase();
    return gradeData.students.filter(s => 
      (s.student.name || '').toLowerCase().includes(low) || 
      s.student.email.toLowerCase().includes(low)
    );
  }, [gradeData, searchQuery]);

  const saveScore = async (studentId: string, lessonId: string) => {
    const key = `${studentId}:${lessonId}`;
    const rawValue = draftScores[key];
    if (!rawValue) return;
    const numeric = Number(rawValue);
    if (Number.isNaN(numeric)) return;

    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        lessonId,
        score: numeric,
      }),
    });
    if (res.ok) {
      const refresh = await fetch(`/api/grades/course/${selectedCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshed = await refresh.json();
      setGradeData(refreshed);
      setDraftScores(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.4rem', marginBottom: '0.2rem' }}>
            {t('teacher.students.gradingTitle', 'Student Grading')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Отслеживайте учебный прогресс и управляйте успеваемостью.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<Filter size={18} />}>Расширенные фильтры</Button>
          <Button variant="primary" icon={<CheckCircle2 size={18} />}>Экспорт отчёта</Button>
        </div>
      </div>

      {/* Top Metrics Grid - 3 Harmonious Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Select & Search (Direct Controls) */}
        <Card className="glass-panel" style={{ height: '100%' }}>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  <BookOpen size={14} /> {t('teacher.students.selectCourse', 'Selected Course')}
                </label>
                <select
                  className="glass-input"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{ height: '42px', fontSize: '0.9rem' }}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  <SearchIcon size={14} /> Быстрый поиск
                </label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Имя студента или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '42px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Risk Monitor (Insight Profile) */}
        <Card className={`${styles.riskCardContainer} glass-panel`} style={{ padding: '0.1rem', height: '100%', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <CardBody>
            <div className={styles.riskHeader}>
              <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <AlertCircle size={16} /> {t('teacher.riskGroup', 'Risk Group')}
              </h3>
              <span className={styles.riskBadge}>Внимание</span>
            </div>
            <div className={styles.riskList} style={{ marginTop: '0.75rem' }}>
              {isLoading ? (
                <Skeleton width="100%" height="4rem" />
              ) : !overview?.riskStudents?.length ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>Отлично! Студентов в зоне риска нет.</p>
              ) : (
                overview.riskStudents.slice(0, 2).map((item, index) => (
                  <div key={index} className={styles.riskItemCard} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                    <div className={styles.riskUser}>
                      <div className={styles.riskAvatar} style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                        {item.studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.riskInfo}>
                        <div className={styles.riskName} style={{ fontSize: '0.85rem' }}>{item.studentName}</div>
                      </div>
                    </div>
                    <div className={styles.riskScoreBadge} style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>
                      {item.averageScore ?? 0}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Assistance & Snapshot (AI Support) */}
        <Card className="glass-panel" style={{ background: 'rgba(249, 115, 22, 0.02)', height: '100%' }}>
          <CardBody>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} /> Сводка по курсу
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
               <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Средний балл</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{overview?.averageScore ?? 0}%</div>
               </div>
               <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Завершение</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{overview?.completionRate ?? 0}%</div>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
               <Activity size={12} color="var(--primary)" />
               <span>{overview?.totalEnrollments || 0} активных записей.</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content Area - Full Width Table */}
      <Card className="glass-panel" style={{ width: '100%' }}>
        <CardBody style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                <Activity size={48} color="var(--primary)" />
              </motion.div>
              <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>Синхронизация учебных данных...</p>
            </div>
          ) : !gradeData || !filteredStudents.length ? (
            <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
              <Users size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--text-primary)' }}>Данные студентов недоступны</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Убедитесь, что студенты записаны на выбранный курс.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '650px' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                      Профиль студента
                    </th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                      Средний балл
                    </th>
                    {gradeData.course.lessons.map((lesson) => (
                      <th key={lesson.id} style={{ textAlign: 'left', padding: '1.25rem 1rem', minWidth: 160, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                        {lesson.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredStudents.map((row, idx) => (
                      <motion.tr 
                        key={row.student.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        style={{ borderBottom: '1px solid var(--border-glass)' }}
                        whileHover={{ background: 'rgba(255,255,255,0.015)' }}
                      >
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div className={styles.riskAvatar} style={{ 
                                background: row.risk ? 'linear-gradient(135deg, #f43f5e, #fb7185)' : 'linear-gradient(135deg, #f97316, #fb923c)',
                                width: 34, height: 34, borderRadius: '10px', fontSize: '0.85rem'
                            }}>
                              {(row.student.name || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{row.student.name || 'Anonymous'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '6px', 
                            display: 'inline-block',
                            background: row.risk ? 'rgba(244, 63, 94, 0.12)' : 'rgba(251, 146, 60, 0.12)',
                            color: row.risk ? '#f43f5e' : '#fb923c',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            {row.averageScore ?? 0}%
                          </div>
                        </td>
                        {row.grades.map((grade) => {
                          const key = `${row.student.id}:${grade.lessonId}`;
                          const isDraft = draftScores[key] !== undefined;
                          return (
                            <td key={grade.lessonId} style={{ padding: '1.25rem 1rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={draftScores[key] ?? (grade.score ?? '')}
                                  onChange={(e) =>
                                    setDraftScores((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  className="glass-input"
                                  placeholder="—"
                                  style={{
                                    width: 65,
                                    height: '34px',
                                    padding: '0.25rem',
                                    fontSize: '0.9rem',
                                    borderColor: isDraft ? 'var(--primary)' : 'var(--border-glass)',
                                    textAlign: 'center'
                                  }}
                                />
                                {isDraft && (
                                  <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    onClick={() => saveScore(row.student.id, grade.lessonId)}
                                    style={{ 
                                      background: 'var(--primary)', 
                                      border: 'none', 
                                      borderRadius: '8px', 
                                      width: 34, 
                                      height: 34, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      color: 'white',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                                    }}
                                  >
                                    <Save size={16} />
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};
