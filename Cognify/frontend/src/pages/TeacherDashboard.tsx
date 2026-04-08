import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/Skeleton';
import { authFetch } from '../lib/api';
import { usePreferences } from '../context/PreferencesContext';
import styles from './TeacherDashboard.module.css';

interface User {
  id: string;
  name: string | null;
}

interface Course {
  id: string;
  title: string;
  _count?: {
    enrollments: number;
  };
}

interface Overview {
  totalCourses: number;
  aiCourseCount?: number;
  totalStudents: number;
  totalEnrollments: number;
  averageScore?: number | null;
  completionRate?: number;
  riskCount: number;
  riskStudents: Array<{
    studentName: string;
    courseTitle: string;
    averageScore: number | null;
  }>;
  weakTopics?: Array<{
    lessonTitle: string;
    count: number;
  }>;
}

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [courses, setCourses] = useState<Course[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dashboardMetrics = useMemo(
    () => [
      { label: 'Студенты', value: overview?.totalStudents || 0, suffix: '', color: 'var(--primary)' },
      { label: 'Записи', value: overview?.totalEnrollments || 0, suffix: '', color: 'var(--secondary)' },
      { label: 'Завершение', value: overview?.completionRate || 0, suffix: '%', color: 'var(--success)' },
      { label: 'Средний балл', value: overview?.averageScore || 0, suffix: '%', color: 'var(--warning)' },
    ],
    [overview]
  );



  useEffect(() => {
    const raw = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!raw || !token) {
      navigate('/auth');
      return;
    }
    const parsed = JSON.parse(raw) as User;
    setUser(parsed);

    Promise.all([
      authFetch(`/api/courses?teacherId=${parsed.id}&limit=20`),
      authFetch(`/api/teacher/overview/${parsed.id}`),
    ])
      .then(async ([coursesRes, overviewRes]) => {
        const coursesData = await coursesRes.json();
        const overviewData = await overviewRes.json();
        setCourses(coursesData.courses || []);
        setOverview(overviewData);
      })
      .catch((error) => console.error(error))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  if (!user) return null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>
            {t('teacher.welcome', 'Welcome back, {name}', { name: user.name || 'Teacher' })}
          </h1>
          <p className={styles.headerText}>{t('teacher.workspace', 'Your teaching workspace is ready.')}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={() => window.print()}>
            Экспорт PDF-отчёта
          </Button>
          <Button icon={<Sparkles size={18} />} onClick={() => navigate('/teacher/create')}>
            {t('teacher.createCourse', 'Create Course')}
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCardGlow} style={{ '--glow-color': 'rgba(249, 115, 22, 0.1)', '--glow-stroke': 'rgba(251, 146, 60, 0.4)' } as any}>
          <CardBody>
            <div className={styles.statLabel}><Users size={20} /> {t('teacher.totalStudents', 'Total Students')}</div>
            {isLoading ? <Skeleton width="60%" height="2rem" /> : <div className={styles.statValue}>{overview?.totalStudents || 0}</div>}
            <div className={styles.statChange}><TrendingUp size={14} /> {overview?.totalEnrollments || 0} записей</div>
          </CardBody>
        </Card>
        <Card className={styles.statCardGlow} style={{ '--glow-color': 'rgba(251, 146, 60, 0.1)', '--glow-stroke': 'rgba(255, 210, 138, 0.4)' } as any}>
          <CardBody>
            <div className={styles.statLabel}><BookOpen size={20} /> {t('teacher.activeCourses', 'Active Courses')}</div>
            {isLoading ? <Skeleton width="50%" height="2rem" /> : <div className={styles.statValue}>{overview?.totalCourses || courses.length}</div>}
            <div className={styles.statChange}>{overview?.aiCourseCount || 0} с участием ИИ</div>
          </CardBody>
        </Card>
        <Card className={styles.statCardGlow} style={{ '--glow-color': 'rgba(244, 63, 94, 0.1)', '--glow-stroke': 'rgba(244, 63, 94, 0.4)' } as any}>
          <CardBody>
            <div className={styles.statLabel}><Users size={20} style={{ color: '#f43f5e' }} /> {t('teacher.riskGroup', 'Risk Group')}</div>
            {isLoading ? <Skeleton width="40%" height="2rem" /> : <div className={styles.statValue} style={{ color: '#f43f5e' }}>{overview?.riskCount || 0}</div>}
            <div className={styles.statChange} style={{ color: '#f43f5e' }}>Требует внимания</div>
          </CardBody>
        </Card>
        <Card className={styles.statCardGlow} style={{ '--glow-color': 'rgba(251, 146, 60, 0.1)', '--glow-stroke': 'rgba(251, 146, 60, 0.4)' } as any}>
          <CardBody>
            <div className={styles.statLabel}><TrendingUp size={20} style={{ color: '#fb923c' }} /> {t('teacher.courseHealth', 'Course Health')}</div>
            {isLoading ? <Skeleton width="55%" height="2rem" /> : <div className={styles.statValue} style={{ color: '#fb923c' }}>{overview?.completionRate || 0}%</div>}
            <div className={styles.statChange} style={{ color: '#fb923c' }}>Средний балл: {overview?.averageScore ?? 0}%</div>
          </CardBody>
        </Card>
      </div>

      <div className={styles.analyticsTier}>
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h3 style={{ margin: 0 }}>Пульс аналитики</h3>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Метрики эффективности</div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} 
                />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPulse)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.quickHub}>
          <Card style={{ flex: 1 }}>
              <CardBody>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <BookOpen size={16} color="var(--primary)" /> Недавние курсы
                </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {courses.slice(0, 3).map(course => (
                  <div key={course.id} style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)', cursor: 'pointer' }} onClick={() => navigate(`/teacher/courses/${course.id}`)}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{course.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{course._count?.enrollments || 0} записались</div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" fullWidth style={{ marginTop: '1rem' }} onClick={() => navigate('/teacher/courses')}>
                 Все курсы
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

    <div className={styles.gridSection}>
        {/* Risk Monitor - Redesigned Profiles */}
        <Card interactive className={styles.riskCardContainer}>
          <CardBody>
            <div className={styles.riskHeader}>
              <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '1rem', fontWeight: 800 }}>Монитор риска</h3>
              <span className={styles.riskBadge}>Приоритет</span>
            </div>
            
            {isLoading ? (
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                <Skeleton width="100%" height="4rem" />
              </div>
            ) : !overview?.riskStudents?.length ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Все студенты показывают хороший результат.</p>
            ) : (
              <div className={styles.riskList} style={{ marginTop: '1rem' }}>
                {overview.riskStudents.slice(0, 3).map((item, index) => (
                  <div key={index} className={styles.riskItemCard} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                    <div className={styles.riskUser}>
                      <div className={styles.riskAvatar} style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                        {item.studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.riskInfo}>
                        <div className={styles.riskName} style={{ fontSize: '0.85rem' }}>{item.studentName}</div>
                      </div>
                    </div>
                    <div className={styles.riskScoreBadge}>
                      {item.averageScore ?? 0}%
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.cardFooterActions}>
              <Button size="sm" variant="secondary" fullWidth onClick={() => navigate('/teacher/students')}>
                Подробный анализ риска
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Curriculum Health - Visual Progress */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Состояние программы</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Самые сложные темы по результатам студентов.</p>
            
            <div className={styles.curriculumList}>
              {!overview?.weakTopics?.length ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Недостаточно данных для анализа тем.</p>
              ) : (
                overview.weakTopics.slice(0, 4).map((topic) => {
                  const riskPercentage = Math.min((topic.count / (overview?.totalStudents || 1)) * 100, 100);
                  return (
                    <div key={topic.lessonTitle} className={styles.curriculumItem}>
                      <div className={styles.curriculumMeta}>
                        <span>{topic.lessonTitle}</span>
                        <span style={{ color: '#f59e0b' }}>{topic.count} ошибок</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${riskPercentage}%`, background: 'var(--warning)' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        {/* System Snapshot */}
        <Card>
          <CardBody>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 800 }}>Снимок автоматизации</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(251, 146, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Система ИИ-оценивания</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Работает и синхронизируется</div>
                  </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(251, 146, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Движок оценки риска</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Аналитика в реальном времени</div>
                  </div>
               </div>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
               Все системы работают нормально. Статистика обновлена минуту назад.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
