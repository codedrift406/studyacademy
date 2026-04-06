import { Link, useLocation } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

const labelMap: Record<string, string> = {
  teacher: 'Teacher',
  student: 'Student',
  dashboard: 'Dashboard',
  catalog: 'Catalog',
  courses: 'Courses',
  create: 'Create course',
  students: 'Students',
  profile: 'Profile',
  'ai-library': 'AI Library',
  admin: 'Analytics',
  verify: 'Certificate',
  course: 'Course',
  edit: 'Edit',
};

const formatSegment = (segment: string, prev: string | null) => {
  if (labelMap[segment]) return labelMap[segment];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
    return prev === 'course' || prev === 'courses' ? 'Course details' : 'Item';
  }
  if (/^\d+$/.test(segment)) {
    return prev === 'course' || prev === 'courses' ? 'Course details' : 'Item';
  }
  return segment
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const rootPath = segments[0] === 'teacher' ? '/teacher/dashboard' : segments[0] === 'student' ? '/student/dashboard' : '/auth';

  return (
    <nav className={styles.breadcrumbs} aria-label="breadcrumb">
      <Link to={rootPath} className={styles.link}>
        {segments[0] === 'teacher' ? 'Teacher Home' : segments[0] === 'student' ? 'Student Home' : 'Home'}
      </Link>
      <span className={styles.separator}>/</span>
      {segments.map((segment, index) => {
        const prev = index > 0 ? segments[index - 1] : null;
        const title = formatSegment(segment, prev);
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        return (
          <span key={path} className={styles.item}>
            {isLast ? (
              <span className={styles.current}>{title}</span>
            ) : (
              <Link to={path} className={styles.link}>
                {title}
              </Link>
            )}
            {!isLast && <span className={styles.separator}>/</span>}
          </span>
        );
      })}
    </nav>
  );
};
