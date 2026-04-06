import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Search, Sparkles } from "lucide-react";
import styles from "./StudentCatalog.module.css";
import { Card, CardBody, CardFooter } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useToastContext } from "../components/ToastProvider";
import { Skeleton } from "../components/Skeleton";
import { usePreferences } from "../context/PreferencesContext";
import { authFetch } from "../lib/api";

interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_name?: string;
  teacherId?: string;
  lessons?: Array<{ id: string; title: string; order: number }>;
  studentCount?: number;
  tags?: string[];
  progress?: number;
  teacher?: {
    name: string;
  };
  aiGenerated?: boolean;
}

interface User {
  id: string;
  email?: string;
  role?: string;
}

export const StudentCatalog = () => {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({});
  const [enrollingMap, setEnrollingMap] = useState<Record<string, boolean>>({});
  const [enrolledMap, setEnrolledMap] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(12);
  const { t } = usePreferences();

  const trendingTopics = ['Quantum Computing', 'Digital Art', 'Business AI', 'Psychology', 'Web3'];

  const communityCourses = useMemo(() => {
    const community = courses.filter((course) => course.tags?.includes('community') || !course.aiGenerated);
    return community.length > 0 ? community.slice(0, 4) : courses.slice(0, Math.min(4, courses.length));
  }, [courses]);

  const resources = [
    {
      title: t('student.catalog.resource.precision.title', 'Precision Agriculture Basics'),
      description: t(
        'student.catalog.resource.precision.desc',
        'Data-driven farming, crop monitoring, and precision input planning.',
      ),
    },
    {
      title: t('student.catalog.resource.drone.title', 'Drone Mapping for Agriculture'),
      description: t(
        'student.catalog.resource.drone.desc',
        'Drone surveys, mapping routes, imagery capture, and field inspection workflows.',
      ),
    },
    {
      title: t('student.catalog.resource.soil.title', 'Agronomy and Soil Management'),
      description: t(
        'student.catalog.resource.soil.desc',
        'Soil fertility, irrigation, crop rotation, and sustainable field decisions.',
      ),
    },
  ];

  useEffect(() => {
    const storedFavorites = localStorage.getItem('catalogFavorites');
    if (storedFavorites) {
      try {
        setFavoritesMap(JSON.parse(storedFavorites));
      } catch {
        setFavoritesMap({});
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/auth");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const query = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });

    if (searchQuery.trim()) {
      query.set("search", searchQuery.trim());
    }

    if (selectedTopic.trim()) {
      query.set("topic", selectedTopic.trim());
    }

    setIsLoading(true);
    fetch(`/api/courses?${query.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error("Error fetching courses:", err);
          showToast({ description: 'Unable to load courses. Please refresh.', variant: 'error' });
        }
      })
      .finally(() => setIsLoading(false));

    authFetch(`/api/student/courses/${parsedUser.id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) {
          const map: Record<string, boolean> = {};
          data.courses.forEach((c: Course) => {
            if (c.id) map[c.id] = true;
          });
          setEnrolledMap(map);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });

    return () => controller.abort();
  }, [navigate, page, pageSize, searchQuery]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setEnrollingMap((prev) => ({ ...prev, [courseId]: true }));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ course_id: courseId }),
      });

      if (res.ok) {
        setEnrolledMap((prev) => ({ ...prev, [courseId]: true }));
        showToast({ description: t('student.catalog.enrollSuccess', 'You have successfully enrolled in this course.'), variant: 'success' });
      } else {
        showToast({ description: t('student.catalog.enrollError', 'Enrollment failed. Please try again.'), variant: 'error' });
      }
    } catch (err) {
      console.error("Enrollment failed", err);
      showToast({ description: t('student.catalog.enrollError', 'Enrollment failed. Please try again.'), variant: 'error' });
    } finally {
      setEnrollingMap((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleFavorite = (courseId: string) => {
    const next = !favoritesMap[courseId];
    const nextMap = {
      ...favoritesMap,
      [courseId]: next,
    };
    setFavoritesMap(nextMap);
    localStorage.setItem('catalogFavorites', JSON.stringify(nextMap));
    showToast({
      description: next
        ? t('student.catalog.favoriteAdded', 'Course added to favorites.')
        : t('student.catalog.favoriteRemoved', 'Course removed from favorites.'),
      variant: 'success',
    });
  };

  if (!user) return null;

  const filterText = [searchQuery, selectedTopic].filter(Boolean).join(' ').toLowerCase();
  const filteredCourses = courses.filter((course) => {
    const normalized = `${course.title} ${course.description || ''} ${course.teacher?.name || course.teacher_name || ''} ${course.tags?.join(' ') || ''}`.toLowerCase();
    return normalized.includes(filterText);
  });

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={`text-gradient ${styles.pageTitle}`}>
            {t('student.catalog.title', 'Explore Knowledge')}
          </h1>
          <p className={styles.pageMeta}>
            {t('student.catalog.subtitle', 'Personalized AI-powered learning paths just for you.')}
          </p>
        </div>
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder={t('student.catalog.searchPlaceholder', 'Search courses...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`glass-input ${styles.searchInput}`}
          />
        </div>
      </div>

      <div className={styles.trendingSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionLabel}>{t('student.catalog.trendingTitle', 'Trending Topics')}</h3>
          <div className={styles.clearFilterRow}>
            {selectedTopic && (
              <button className={styles.clearTopicBtn} type="button" onClick={() => setSelectedTopic('')}>
                {t('student.catalog.clearFilter', 'Clear filter')}
              </button>
            )}
          </div>
        </div>
        <div className={styles.trendingList}>
          {trendingTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`${styles.trendingChip} ${selectedTopic === topic ? styles.activeChip : ''}`}
              onClick={() => {
                setSelectedTopic(topic);
                setSearchQuery(topic);
              }}
            >
              <Sparkles size={14} className={styles.chipIcon} />
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resourceSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionLabel}>{t('student.catalog.resourcesTitle', 'Related Resources')}</h3>
        </div>
        <div className={styles.resourceGrid}>
          {resources.map((resource) => (
            <div key={resource.title} className={styles.resourceCard}>
              <h4 className={styles.resourceTitle}>{resource.title}</h4>
              <p className={styles.resourceDesc}>{resource.description}</p>
            </div>
          ))}
        </div>
      </div>

      {communityCourses.length > 0 && (
        <div className={styles.communitySection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionLabel}>{t('student.catalog.communityTitle', 'Community Courses')}</h3>
              <p className={styles.sectionHint}>{t('student.catalog.communityHint', 'Explore unique courses created by the Cognify community.')}</p>
            </div>
          </div>
          <div className={styles.communityGrid}>
            {communityCourses.map((course) => (
              <div key={course.id} className={styles.communityCard}>
                <div className={styles.communityCardHeader}>
                  <h4 className={styles.communityCardTitle}>{course.title}</h4>
                  <span className={styles.communityBadge}>Community</span>
                </div>
                <p className={styles.communityCardDesc}>{course.description || 'A unique learning path shared by the community.'}</p>
                <div className={styles.communityCardFooter}>
                  <span>{course.teacher?.name || course.teacher_name || 'Community creator'}</span>
                  <button className={styles.communityAction} type="button" onClick={() => navigate(`/course/${course.id}`)}>
                    View course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              style={{
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                borderRadius: 24,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Skeleton lines={3} height="1rem" />
              <Skeleton lines={2} width="80%" height="0.9rem" />
              <Skeleton width="60%" height="2rem" />
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <p className={styles.statusText}>{t('student.catalog.noCourses', 'No courses available at the moment.')}</p>
      ) : (
        <div className={styles.courseGrid}>
          {filteredCourses.map((course) => (
            <Card key={course.id} interactive className={styles.courseCard}>
              <CardBody>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.badge}>{course.aiGenerated ? t('teacher.courses.aiGenerated', 'AI Generated') : t('teacher.courses.manual', 'Manual')}</div>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                  </div>
                  <button
                    type="button"
                    className={`${styles.favoriteToggle} ${favoritesMap[course.id] ? styles.favoriteActive : ''}`}
                    onClick={() => toggleFavorite(course.id)}
                    aria-label={favoritesMap[course.id] ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart size={18} />
                  </button>
                </div>
                <p className={styles.courseDesc}>
                  {course.description || 'Dive into this curated curriculum and master new horizons with Cognify AI.'}
                </p>
                {course.tags?.length ? (
                  <div className={styles.tagList}>
                    {course.tags.map((tag) => (
                      <span key={tag} className={styles.tagPill}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                
                {enrolledMap[course.id] && (
                  <div className={styles.progressArea}>
                    <div className={styles.progressInfo}>
                      <span>{course.progress === 100 ? t('student.catalog.completed', 'Completed') : t('student.catalog.progress', 'Progress')}</span>
                      <span>{course.progress || 0}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${course.progress || 0}%` }}></div>
                    </div>
                  </div>
                )}
              </CardBody>
              <CardFooter className={styles.cardFooter}>
                <div className={styles.teacherInfo}>
                  <div className={styles.avatarMini}>{course.teacher?.name?.[0] || course.teacher_name?.[0] || 'T'}</div>
                  <span>{course.teacher?.name || course.teacher_name || 'Teacher'}</span>
                </div>
                {enrolledMap[course.id] ? (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/course/${course.id}`)}>
                    {t('course.continue', 'Continue')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleEnroll(course.id)} disabled={enrollingMap[course.id]}>
                    {enrollingMap[course.id] ? t('student.catalog.enrolling', 'Enrolling...') : t('student.catalog.enroll', 'Enroll')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && courses.length > 0 && (
        <div className={styles.paginationWrap}>
          <Button onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1} size="sm">
            Previous
          </Button>
          <span className={styles.paginationInfo}>Page {page} of {totalPages}</span>
          <Button onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page >= totalPages} size="sm">
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
