import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../Breadcrumbs';
import { PageTransition } from '../PageTransition.tsx';
import {
  BrainCircuit,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Sun,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import styles from './DashboardLayout.module.css';

interface NavLinkItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'teacher' | 'student';
}

export const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, theme, toggleTheme, t } = usePreferences();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { name?: string; nickname?: string; avatarUrl?: string };
    } catch {
      return {};
    }
  }, []);

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => null);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/auth');
  };

  const navLinks: NavLinkItem[] =
    role === 'teacher'
      ? [
          { path: '/teacher/dashboard', label: t('nav.teacher.dashboard', 'Overview'), icon: <LayoutDashboard size={20} /> },
          { path: '/teacher/courses', label: t('nav.teacher.courses', 'My Courses'), icon: <BookOpen size={20} /> },
          { path: '/teacher/create', label: t('nav.teacher.create', 'Create Course'), icon: <PlusCircle size={20} /> },
          { path: '/teacher/students', label: t('nav.teacher.students', 'Students'), icon: <Users size={20} /> },
          { path: '/teacher/ai-library', label: 'AI Library', icon: <BrainCircuit size={20} /> },
          { path: '/teacher/profile', label: 'Profile', icon: <UserCircle2 size={20} /> },
        ]
      : [
          { path: '/student/dashboard', label: t('nav.student.dashboard', 'My Learning'), icon: <LayoutDashboard size={20} /> },
          { path: '/student/catalog', label: t('nav.student.catalog', 'Catalog'), icon: <BookOpen size={20} /> },
          { path: '/student/ai-library', label: 'AI Library', icon: <BrainCircuit size={20} /> },
          { path: '/student/profile', label: 'Profile', icon: <UserCircle2 size={20} /> },
        ];

  const currentTitle = navLinks.find((item) => location.pathname.startsWith(item.path))?.label || 'Dashboard';
  const initials = (user.nickname || user.name || (role === 'teacher' ? 'Teacher' : 'Student')).slice(0, 2).toUpperCase();


  return (
    <div className={styles.layout}>
      {isMobileMenuOpen && <div className={styles.overlay} onClick={() => setIsMobileMenuOpen(false)} />}

      <div className={styles.appContainer}>
        <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <BookOpen size={28} />
            </div>
            <span className="text-gradient">{t('brand.name', 'Cognify')}</span>
            <button
              className={styles.mobileCloseBtn}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className={styles.nav}>
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          <div className={styles.footerContainer}>
            <button className={`${styles.navItem} ${styles.logoutButton}`} onClick={handleLogout}>
              <LogOut size={20} />
              {t('layout.logout', 'Logout')}
            </button>
          </div>
        </aside>

        <main className={styles.mainSection}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
                <Menu size={24} />
              </button>
              <div className={styles.headerTitleArea}>
                <div className={styles.titleRow}>
                  <h2 className={styles.headerTitle}>{currentTitle}</h2>
                </div>
                <Breadcrumbs />
              </div>
            </div>
            <div className={styles.userInfo}>
              <div className={styles.controlCluster}>
                <div className={styles.langSwitch} aria-label={t('layout.language', 'Language')}>
                  <button
                    className={`${styles.langBtn} ${language === 'ru' ? styles.langBtnActive : ''}`}
                    onClick={() => setLanguage('ru')}
                    type="button"
                  >
                    RU
                  </button>
                  <button
                    className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`}
                    onClick={() => setLanguage('en')}
                    type="button"
                  >
                    EN
                  </button>
                  <button
                    className={`${styles.langBtn} ${language === 'kk' ? styles.langBtnActive : ''}`}
                    onClick={() => setLanguage('kk')}
                    type="button"
                  >
                    KZ
                  </button>
                </div>
              </div>
              <button
                className={styles.themeToggle}
                aria-label={t('layout.theme', 'Theme')}
                onClick={toggleTheme}
                title={theme === 'dark' ? t('layout.dark', 'Dark') : t('layout.light', 'Light')}
                type="button"
              >
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatar}>{initials}</div>
              )}
            </div>
          </header>

          <div className={styles.content}>
            <PageTransition>{children}</PageTransition>
            <footer className={styles.pageFooter}>
              <span>Cognify © 2026. All rights reserved.</span>
              <span>AI learning platform for students and teachers.</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
