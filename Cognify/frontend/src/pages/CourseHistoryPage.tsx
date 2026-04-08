import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Sparkles, Trophy, Users } from 'lucide-react';
import { Card, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { authFetch } from '../lib/api';
import { usePreferences } from '../context/PreferencesContext';
import styles from './CourseHistoryPage.module.css';

interface StoredUser {
  id: string;
  role: string;
  name?: string | null;
  nickname?: string | null;
}

interface StudentCourseHistoryItem {
  id: string;
  title: string;
  description: string | null;
  teacherName: string;
  progressPercent: number;
  latestScore: number | null;
  enrolledAt: string;
}

interface TeacherCourseHistoryItem {
  id: string;
  title: string;
  description: string | null;
  lessons: Array<{ id: string; title: string }>;
  enrolledStudents: number;
  createdAt: string;
}

export const CourseHistoryPage = () => {
  const navigate = useNavigate();
  const { t, language } = usePreferences();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [studentCourses, setStudentCourses] = useState<StudentCourseHistoryItem[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      navigate('/auth');
      return;
    }

    let parsedUser: StoredUser;
    try {
      parsedUser = JSON.parse(rawUser) as StoredUser;
    } catch {
      navigate('/auth');
      return;
    }

    setUser(parsedUser);

    const loadHistory = async () => {
      const role = (parsedUser.role || '').toUpperCase();
      if (role === 'STUDENT') {
        const response = await authFetch(`/api/student/courses/${parsedUser.id}?limit=100`);
        const data = await response.json();
        setStudentCourses(
          (data.courses || []).map((course: { id: string; title: string; description: string | null; teacher_name: string; progressPercent: number; latestScore: number | null; enrolledAt: string }) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            teacherName: course.teacher_name,
            progressPercent: course.progressPercent || 0,
            latestScore: course.latestScore ?? null,
            enrolledAt: course.enrolledAt,
          })),
        );
        return;
      }

      const response = await authFetch(`/api/courses/teacher/${parsedUser.id}?limit=100`);
      const data = await response.json();
      setTeacherCourses(
        (data.courses || []).map((course: { id: string; title: string; description: string | null; lessons: Array<{ id: string; title: string }>; _count?: { enrollments?: number }; createdAt: string }) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          lessons: course.lessons || [],
          enrolledStudents: course._count?.enrollments || 0,
          createdAt: course.createdAt,
        })),
      );
    };

    loadHistory()
      .catch((error) => console.error(error))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const isStudent = (user?.role || '').toUpperCase() === 'STUDENT';
  const entries = isStudent ? studentCourses : teacherCourses;

  const completedCourses = useMemo(() => {
    if (!isStudent) return teacherCourses.length;
    return studentCourses.filter((course) => course.progressPercent >= 100).length;
  }, [isStudent, studentCourses, teacherCourses]);

  const averageScore = useMemo(() => {
    if (!isStudent) return null;
    const scoredCourses = studentCourses.filter((course) => course.latestScore !== null && course.latestScore !== undefined);
    if (scoredCourses.length === 0) return null;
    return Math.round(
      scoredCourses.reduce((sum, course) => sum + (course.latestScore || 0), 0) / scoredCourses.length,
    );
  }, [isStudent, studentCourses]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : language === 'kk' ? 'kk-KZ' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const goToPrimarySection = () => {
    navigate(isStudent ? '/student/catalog' : '/teacher/courses');
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      <section className={styles.heroRow}>
        <Card interactive className={styles.heroCard}>
          <CardBody className={styles.heroBody}>
            <div className={styles.heroIntro}>
              <div className={styles.heroBadge}>
                <Sparkles size={16} />
                <span>{isStudent ? t('course.history.learningArchive', 'Learning archive') : t('course.history.teachingArchive', 'Teaching archive')}</span>
              </div>
              <h1 className={styles.heroTitle}>
                {isStudent ? t('course.history.completedCoursesTitle', 'Completed Courses History') : t('course.history.courseHistoryTitle', 'Course History')}
              </h1>
              <p className={styles.heroText}>
                {isStudent
                  ? t('course.history.studentDesc', 'Track the courses you have finished, revisit your scores, and jump back into the next learning path.')
                  : t('course.history.teacherDesc', 'Review the courses you created, their lesson counts, and how your teaching portfolio is growing.')}
              </p>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className={styles.statValue}>{isStudent ? completedCourses : teacherCourses.length}</div>
                  <div className={styles.statLabel}>{isStudent ? 'Completed courses' : 'Published courses'}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <CalendarDays size={18} />
                </div>
                <div>
                  <div className={styles.statValue}>{entries.length}</div>
                  <div className={styles.statLabel}>{isStudent ? 'Total enrollments' : 'Course records'}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  {isStudent ? <Trophy size={18} /> : <Users size={18} />}
                </div>
                <div>
                  <div className={styles.statValue}>{isStudent ? (averageScore ?? '—') : teacherCourses.reduce((sum, course) => sum + course.enrolledStudents, 0)}</div>
                  <div className={styles.statLabel}>{isStudent ? 'Average score' : 'Total students'}</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {isLoading ? (
        <Card>
          <CardBody className={styles.loadingState}>Loading history...</CardBody>
        </Card>
      ) : entries.length === 0 || (isStudent && completedCourses === 0) ? (
        <Card interactive className={styles.emptyCard}>
          <CardBody className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <GraduationCap size={28} />
            </div>
            <CardTitle className={styles.emptyTitle}>
              {isStudent ? 'No completed courses yet' : 'No course history yet'}
            </CardTitle>
            <p className={styles.emptyText}>
              {isStudent
                ? 'Finish a course to see it here with your progress and score summary.'
                : 'Create your first course to start building a teaching timeline.'}
            </p>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={goToPrimarySection}>
              {isStudent ? 'Browse catalog' : 'Open courses'}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className={styles.listGrid}>
          {isStudent
            ? studentCourses
                .filter((course) => course.progressPercent >= 100)
                .map((course) => (
                  <Card key={course.id} interactive className={styles.entryCard}>
                    <CardBody className={styles.entryBody}>
                      <div className={styles.entryMain}>
                        <div className={styles.entryTopRow}>
                          <div>
                            <CardTitle className={styles.entryTitle}>{course.title}</CardTitle>
                            <p className={styles.entrySubtle}>{course.teacherName}</p>
                          </div>
                          <div className={styles.statusChip}>100% complete</div>
                        </div>
                        {course.description && <p className={styles.entryText}>{course.description}</p>}
                      </div>

                      <div className={styles.entryMeta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Score</span>
                          <span className={styles.metaValue}>{course.latestScore ?? '—'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Enrolled</span>
                          <span className={styles.metaValue}>{formatDate(course.enrolledAt)}</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ArrowRight size={14} />}
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))
            : teacherCourses.map((course) => (
                <Card key={course.id} interactive className={styles.entryCard}>
                  <CardBody className={styles.entryBody}>
                    <div className={styles.entryMain}>
                      <div className={styles.entryTopRow}>
                        <div>
                          <CardTitle className={styles.entryTitle}>{course.title}</CardTitle>
                          <p className={styles.entrySubtle}>
                            {course.lessons.length} lessons
                          </p>
                        </div>
                        <div className={styles.statusChip}>{course.enrolledStudents} students</div>
                      </div>
                      {course.description && <p className={styles.entryText}>{course.description}</p>}
                    </div>

                    <div className={styles.entryMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Created</span>
                        <span className={styles.metaValue}>{formatDate(course.createdAt)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Lessons</span>
                        <span className={styles.metaValue}>{course.lessons.length}</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArrowRight size={14} />}
                        onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
        </div>
      )}
    </div>
  );
};
