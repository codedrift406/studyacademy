import { useEffect, useState } from 'react';
import { Activity, BookOpen, User, Layers } from 'lucide-react';
import { Card } from '../components/ui/Card';
import styles from './AdminDashboard.module.css';

interface SystemStats {
  userCount: number;
  courseCount: number;
  enrollmentCount: number;
  lessonCount: number;
}

interface RecentStats {
  last7days: {
    users: number;
    courses: number;
    enrollments: number;
  };
}

export const AdminDashboard = () => {
  const [system, setSystem] = useState<SystemStats | null>(null);
  const [recent, setRecent] = useState<RecentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const [systemRes, recentRes] = await Promise.all([
          fetch('/api/stats/system'),
          fetch('/api/stats/recent'),
        ]);

        if (!systemRes.ok || !recentRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const systemData = await systemRes.json();
        const recentData = await recentRes.json();

        setSystem(systemData);
        setRecent(recentData);
      } catch (err) {
        console.error('Analytics fetch error', err);
        setError('Не удалось загрузить аналитику. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return <p className={styles.statusText}>Загрузка метрик админки...</p>;
  }

  if (error) {
    return <p className={styles.errorText}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Панель аналитики</h1>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <User size={20} />
            <h2>Пользователи</h2>
          </div>
          <p className={styles.statValue}>{system?.userCount || 0}</p>
          <small className="text-secondary">За 7 дней: {recent?.last7days?.users || 0}</small>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <BookOpen size={20} />
            <h2>Курсы</h2>
          </div>
          <p className={styles.statValue}>{system?.courseCount || 0}</p>
          <small className="text-secondary">За 7 дней: {recent?.last7days?.courses || 0}</small>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <Layers size={20} />
            <h2>Уроки</h2>
          </div>
          <p className={styles.statValue}>{system?.lessonCount || 0}</p>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <Activity size={20} />
            <h2>Записи</h2>
          </div>
          <p className={styles.statValue}>{system?.enrollmentCount || 0}</p>
          <small className="text-secondary">За 7 дней: {recent?.last7days?.enrollments || 0}</small>
        </Card>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Состояние системы</h2>
        <p>Основные сервисы: <strong>Онлайн</strong></p>
      </div>
    </div>
  );
};
