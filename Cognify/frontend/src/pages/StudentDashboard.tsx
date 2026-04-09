import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Sparkles,
  Brain,
  Map as MapIcon,
  LayoutGrid,
  Hash,
  Trophy,
  Star,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardBody, CardTitle, CardFooter } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { authFetch } from "../lib/api";
import { StudentRpgMap } from "../components/StudentRpgMap";
import { usePreferences } from "../context/PreferencesContext";
import styles from "./StudentDashboard.module.css";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  xp?: number;
  streakDays?: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  teacher_name?: string;
  progressPercent?: number;
  latestScore?: number | null;
  weakLessons?: string[];
}

interface RecommendationPayload {
  focusAreas: string[];
  actionPlan: Array<{
    courseId: string;
    courseTitle: string;
    progressPercent: number;
    averageGrade: number | null;
    priority: "high" | "medium" | "low";
    message: string;
  }>;
  recommendedCourses: Array<{
    id: string;
    title: string;
    description: string | null;
    teacherName: string;
    lessonCount: number;
    reason: string;
  }>;
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = usePreferences();
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] =
    useState<RecommendationPayload | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [gamification, setGamification] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "map">("map");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/auth");
      return;
    }
    const parsedUser: User = JSON.parse(storedUser);
    setUser(parsedUser);

    Promise.all([
      authFetch(`/api/student/courses/${parsedUser.id}`),
      authFetch(`/api/student/recommendations/${parsedUser.id}`),
      authFetch(`/api/gamification/student/${parsedUser.id}`),
      authFetch(`/api/gamification/leaderboard`),
    ])
      .then(
        async ([
          coursesRes,
          recommendationsRes,
          gamificationRes,
          leaderboardRes,
        ]) => {
          const coursesData = await coursesRes.json();
          const recommendationsData = await recommendationsRes.json();
          if (coursesData.courses) setCourses(coursesData.courses);
          setRecommendations(recommendationsData);
          if (gamificationRes.ok) {
            const gamData = await gamificationRes.json();
            setGamification(gamData);
          }
          if (leaderboardRes.ok) {
            const lbData = await leaderboardRes.json();
            setLeaderboard(lbData.leaderboard || []);
          }
        },
      )
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  if (!user) return null;

  return (
    <div className={styles.container}>
      <section className={styles.heroSection}>
        <Card className={styles.aiTutorCard}>
          <div className={styles.kzPattern} />
          <CardBody className={styles.aiBody}>
            <div className={styles.aiContent}>
              <div className={styles.aiStatus}>
                <Brain size={20} className={styles.statusIcon} />
                <span className={styles.statusLabel}>
                  {t("student.dashboard.aiTutorStatus")}
                </span>
              </div>
              <h2 className={styles.heroTitle}>
                {t("student.dashboard.heroTitle", "Welcome back, {name}!", {
                  name: user.name || (language === "kk" ? "Оқушы" : "Ученик"),
                })}
              </h2>
              <p className={styles.heroText}>
                {courses.length > 0
                  ? t(
                      "student.dashboard.heroSubtitle.courses",
                      "Your personalized learning paths are ready. Select a course to keep making progress.",
                    )
                  : t(
                      "student.dashboard.heroSubtitle.empty",
                      "You have not enrolled in any courses yet. Check the Course Catalog to begin your learning.",
                    )}
              </p>
              <div className={styles.heroStats}>
                <div className={styles.statChip}>
                  <Hash size={14} />
                  <span>
                    {t("common.xp", "XP: {xp}", { xp: user.xp || 0 })}
                  </span>
                </div>
                <div className={styles.statChip}>
                  <Sparkles size={14} />
                  <span>
                    {t("common.streakDays", "{days} days", {
                      days: user.streakDays || 0,
                    })}
                  </span>
                </div>
              </div>
              <div className={styles.heroActions}>
                <Button
                  variant="primary"
                  icon={<Sparkles size={18} />}
                  onClick={() => navigate("/student/catalog")}
                >
                  {t("student.dashboard.browseCatalog", "Browse Catalog")}
                </Button>
              </div>
            </div>
            <motion.div
              className={styles.aiGraphic}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.profileCard}>
                <motion.div
                  className={styles.levelBadge}
                  whileHover={{ scale: 1.1, rotateY: 10 }}
                >
                  <Trophy size={40} />
                </motion.div>
                <div className={styles.xpProgressRow}>
                  <div className={styles.xpLabel}>
                    <span>
                      {t("common.level", "Level {level}", {
                        level: gamification?.level || 1,
                      })}
                    </span>
                    <span>{user.xp || 0} / 500 XP</span>
                  </div>
                  <div className={styles.miniBar}>
                    <motion.div
                      className={styles.miniBarFill}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(((user.xp || 0) / 500) * 100, 100)}%`,
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <Star size={14} className="text-secondary" />
                  <Zap size={14} className="text-primary" />
                </div>
              </div>
            </motion.div>
          </CardBody>
        </Card>
      </section>

      {gamification && (
        <section style={{}} className={styles.gamificationCard}>
          <Card>
            <CardBody>
              <h3
                style={{
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Trophy className="text-primary" />{" "}
                {t("badges.title", "Your Badges & Stats")}
              </h3>
              <p style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                {t("common.level", "Level {level}", {
                  level: gamification.level,
                })}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginTop: "1rem",
                  flexWrap: "wrap",
                }}
              >
                {gamification.badges.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>
                    {t(
                      "badges.noBadges",
                      "Complete modules and tests to earn your first badge!",
                    )}
                  </p>
                ) : (
                  gamification.badges.map((b: any) => (
                    <div
                      key={b.id}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "rgba(249, 115, 22, 0.1)",
                        border: "1px solid var(--primary)",
                        borderRadius: "20px",
                        color: "var(--primary)",
                        fontWeight: "bold",
                      }}
                    >
                      🌟 {b.name}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ marginBottom: "1rem" }}>
                {t("leaderboard.title", "Global Leaderboard (Top XP)")}
              </h3>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {leaderboard.map((lbUser, idx) => (
                  <div
                    key={lbUser.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem",
                      background:
                        lbUser.id === user.id
                          ? "var(--bg-surface)"
                          : "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <strong
                        style={{
                          color:
                            idx === 0
                              ? "#fbbf24"
                              : idx === 1
                                ? "#9ca3af"
                                : idx === 2
                                  ? "#b45309"
                                  : "var(--text-primary)",
                        }}
                      >
                        #{idx + 1}
                      </strong>
                      <span>
                        {lbUser.name || t("leaderboard.placeholder", "Student")}
                      </span>
                    </div>
                    <span
                      style={{ fontWeight: "bold", color: "var(--primary)" }}
                    >
                      {lbUser.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      <section className={styles.sectionBlock}>
        <div
          className={styles.sectionHeader}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h3>
              {t("student.dashboard.portfolioTitle", "Your Learning Portfolio")}
            </h3>
            {isLoading && (
              <span className={styles.subtleNote}>
                {t(
                  "student.dashboard.loadingDashboard",
                  "Updating dashboard...",
                )}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              background: "var(--bg-surface)",
              padding: "0.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border-glass)",
            }}
          >
            <button
              onClick={() => setViewMode("map")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background:
                  viewMode === "map"
                    ? "rgba(249, 115, 22, 0.2)"
                    : "transparent",
                color:
                  viewMode === "map"
                    ? "var(--primary)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <MapIcon size={16} />{" "}
              {t("student.dashboard.viewMode.map", "RPG Map")}
            </button>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background:
                  viewMode === "grid"
                    ? "rgba(249, 115, 22, 0.2)"
                    : "transparent",
                color:
                  viewMode === "grid"
                    ? "var(--primary)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <LayoutGrid size={16} />{" "}
              {t("student.dashboard.viewMode.grid", "Grid List")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            {t(
              "student.dashboard.loadingDashboard",
              "Loading your dashboard...",
            )}
          </div>
        ) : courses.length === 0 ? (
          <div className={styles.emptyState}>
            {t(
              "student.dashboard.noCourses",
              "You are not enrolled in any courses right now.",
            )}
          </div>
        ) : viewMode === "map" ? (
          <StudentRpgMap
            courses={
              courses.map((c, i) => ({
                id: c.id,
                title: c.title,
                progressPercent: c.progressPercent ?? 0,
                status:
                  c.progressPercent === 100
                    ? "completed"
                    : (c.progressPercent ?? 0) > 0 || i === 0
                      ? "active"
                      : "locked",
              })) as any
            }
          />
        ) : (
          <div className={styles.portfolioGrid}>
            {courses.map((course) => (
              <Card key={course.id} interactive>
                <div className={styles.courseImage}>
                  <Brain size={48} />
                </div>
                <CardBody>
                  <div className={styles.courseMetaRow}>
                    <span>Enrolled</span>
                    <span className={styles.progressLabel}>
                      {course.progressPercent ?? 0}% complete
                    </span>
                  </div>
                  <CardTitle className={styles.courseCardTitle}>
                    {course.title}
                  </CardTitle>
                  <p className={styles.courseTeacher}>
                    {course.teacher_name || "Instructor"}
                  </p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${course.progressPercent ?? 0}%` }}
                    />
                  </div>
                  {course.latestScore !== null &&
                    course.latestScore !== undefined && (
                      <p
                        className={
                          course.latestScore < 50
                            ? styles.warningText
                            : styles.successText
                        }
                      >
                        Latest result: {course.latestScore}%
                      </p>
                    )}
                </CardBody>
                <CardFooter className={styles.cardFooterGroup}>
                  <Button
                    fullWidth
                    icon={<Play size={18} />}
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    Resume Learning
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className={styles.gridSection}>
        <Card className={styles.recommendationCard}>
          <CardBody>
            <div className={styles.sectionHeader}>
              <h3>
                {t(
                  "student.dashboard.recommendationsTitle",
                  "Your Next Actions",
                )}
              </h3>
            </div>
            {isLoading ? (
              <div className={styles.emptyState}>
                Loading recommendations...
              </div>
            ) : !recommendations?.actionPlan?.length ? (
              <div className={styles.emptyState}>
                {t(
                  "student.dashboard.recommendationsEmpty",
                  "Complete a lesson or quiz to unlock a personalized action plan.",
                )}
              </div>
            ) : (
              recommendations.actionPlan.map((item) => (
                <div key={item.courseId} className={styles.recommendationItem}>
                  <div className={styles.recommendationRow}>
                    <strong>{item.courseTitle}</strong>
                    <span className={styles.priorityPill}>{item.priority}</span>
                  </div>
                  <p className={styles.recommendationText}>{item.message}</p>
                  <p className={styles.recommendationMeta}>
                    Progress: {item.progressPercent}%
                    {item.averageGrade !== null
                      ? ` • Grade: ${item.averageGrade}%`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className={styles.recommendationCard}>
          <CardBody>
            <div className={styles.sectionHeader}>
              <h3>
                {t(
                  "student.dashboard.recommendedCoursesTitle",
                  "Recommended Next Courses",
                )}
              </h3>
            </div>
            {isLoading ? (
              <div className={styles.emptyState}>Loading suggestions...</div>
            ) : !recommendations?.recommendedCourses?.length ? (
              <div className={styles.emptyState}>
                {t(
                  "student.dashboard.recommendedCoursesEmpty",
                  "New course suggestions will appear here as your learning profile grows.",
                )}
              </div>
            ) : (
              recommendations.recommendedCourses.map((course) => (
                <div key={course.id} className={styles.recommendationItem}>
                  <strong>{course.title}</strong>
                  <p className={styles.recommendationText}>{course.reason}</p>
                  <p className={styles.recommendationMeta}>
                    {course.teacherName} • {course.lessonCount} lessons
                  </p>
                  <div className={styles.recommendationAction}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate("/student/catalog")}
                    >
                      Open Catalog
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </section>

      <Card className={styles.focusCard}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <h3>{t("student.dashboard.focusAreasTitle", "Focus Areas")}</h3>
          </div>
          {!recommendations?.focusAreas?.length ? (
            <div className={styles.emptyState}>
              {t(
                "student.dashboard.focusAreasEmpty",
                "Your weak-topic analysis will appear here after quiz attempts.",
              )}
            </div>
          ) : (
            <div className={styles.focusChips}>
              {recommendations.focusAreas.map((area) => (
                <span key={area} className={styles.focusChip}>
                  {area}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
