import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlusCircle, Search, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Skeleton } from '../components/Skeleton';
import { usePreferences } from '../context/PreferencesContext';
import styles from './TeacherDashboard.module.css';

interface User {
  id: string;
}

interface TeacherCourse {
  id: string;
  title: string;
  description: string | null;
  aiGenerated: boolean;
  teacherId?: string;
  _count?: {
    enrollments: number;
  };
}

export const TeacherCourses = () => {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [allCourses, setAllCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'ai' | 'manual'>('all');

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesMode = filterMode === 'all' || (filterMode === 'ai' && course.aiGenerated) || (filterMode === 'manual' && !course.aiGenerated);
      const searchText = `${course.title} ${course.description || ''}`.toLowerCase();
      const matchesSearch = searchText.includes(searchQuery.toLowerCase().trim());
      return matchesMode && matchesSearch;
    });
  }, [courses, filterMode, searchQuery]);

  const sharedCourses = useMemo(
    () => allCourses.filter((course) => course.teacherId && course.teacherId !== JSON.parse(localStorage.getItem('user') || '{}').id),
    [allCourses],
  );

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }
    const user = JSON.parse(storedUser) as User;
    Promise.all([
      fetch(`/api/courses?teacherId=${user.id}&limit=50`),
      fetch('/api/courses?limit=100'),
    ])
      .then(async ([teacherRes, allRes]) => {
        const teacherData = await teacherRes.json();
        const allData = await allRes.json();
        setCourses(teacherData.courses || []);
        setAllCourses(allData.courses || []);
      })
      .catch((err) => console.error('Courses fetch error:', err))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{t('teacher.courses.title', 'My Courses')}</h1>
          <p className={styles.headerText}>{t('teacher.courses.headerDesc', 'Manage your teaching portfolio and create courses with confidence.')}</p>
        </div>
        <Button icon={<PlusCircle size={18} />} onClick={() => navigate('/teacher/create')}>
          {t('teacher.createCourse', 'Create Course')}
        </Button>
      </div>

      <div className={styles.searchToolbar}>
        <div className={styles.searchInputWrapper}>
          <Search size={18} />
          <input
            type="search"
            placeholder={t('teacher.courses.searchPlaceholder', 'Search course titles or descriptions...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchField}
          />
        </div>
        <div className={styles.filterChips}>
          {['all', 'ai', 'manual'].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.chipButton} ${filterMode === mode ? styles.activeChip : ''}`}
              onClick={() => setFilterMode(mode as 'all' | 'ai' | 'manual')}
            >
              {mode === 'all'
                ? t('teacher.courses.filterAll', 'All Courses')
                : mode === 'ai'
                ? t('teacher.courses.filterAI', 'AI Courses')
                : t('teacher.courses.filterManual', 'Manual Courses')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardBody>
                <Skeleton lines={2} height="1rem" />
                <Skeleton width="90%" height="1rem" />
                <div className={styles.skeletonFooter}>
                  <Skeleton width="30%" height="1.5rem" />
                  <Skeleton width="25%" height="2rem" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className={styles.emptyCard}>
          <CardBody className={styles.emptyStateCard}>
            <BookOpen size={42} className={styles.emptyIcon} />
            <p className={styles.emptyMessage}>{t('teacher.courses.noMatches', 'No courses match the current filters.')}</p>
          </CardBody>
        </Card>
      ) : (
        <div>
          <div className={styles.grid}>
          {filteredCourses.map((course) => (
            <Card key={course.id} interactive>
              <CardBody>
                <div className={styles.courseCardHeader}>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <span className={`${styles.aiBadge} ${course.aiGenerated ? '' : styles.manualBadge}`}>
                    {course.aiGenerated ? t('teacher.courses.aiGenerated', 'AI Generated') : t('teacher.courses.manual', 'Manual')}
                  </span>
                </div>
                <p className={styles.courseDescription}>
                  {course.description || t('teacher.courses.descriptionFallback', 'Use this space to describe what students will learn in this course.')}
                </p>
                <div className={styles.courseMetaRow}>
                  <div className={styles.metaChip}>
                    <Users size={14} />
                    {t('teacher.courses.students', '{count} students', { count: course._count?.enrollments || 0 })}
                  </div>
                </div>
                <div className={styles.courseActions}>
                  <Button size="sm" onClick={() => navigate(`/course/${course.id}`)}>{t('teacher.courses.openCourse', 'Open Course')}</Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}>
                    {t('teacher.courses.editCourse', 'Edit Course')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

          {Boolean(sharedCourses.length) && (
            <section className={styles.sharedSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>{t('teacher.courses.sharedTitle', 'Community Courses')}</h2>
                  <p className={styles.headerText}>{t('teacher.courses.sharedSubtitle', 'Courses created or added beyond your personal teaching catalog.')}</p>
                </div>
              </div>
              <div className={styles.grid}>
                {sharedCourses.slice(0, 6).map((course) => (
                  <Card key={course.id} interactive>
                    <CardBody>
                      <div className={styles.courseCardHeader}>
                        <h3 className={styles.courseTitle}>{course.title}</h3>
                        <span className={`${styles.aiBadge} ${course.aiGenerated ? '' : styles.manualBadge}`}>
                          {course.aiGenerated ? t('teacher.courses.aiGenerated', 'AI Generated') : t('teacher.courses.manual', 'Manual')}
                        </span>
                      </div>
                      <p className={styles.courseDescription}>
                        {course.description || t('teacher.courses.descriptionFallback', 'Use this space to describe what students will learn in this course.')}
                      </p>
                      <div className={styles.courseMetaRow}>
                        <div className={styles.metaChip}>
                          <Users size={14} />
                          {t('teacher.courses.students', '{count} students', { count: course._count?.enrollments || 0 })}
                        </div>
                      </div>
                      <div className={styles.courseActions}>
                        <Button size="sm" onClick={() => navigate(`/course/${course.id}`)}>{t('teacher.courses.openCourse', 'Open Course')}</Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
