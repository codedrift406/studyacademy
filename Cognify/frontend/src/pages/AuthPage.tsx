import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, GraduationCap, BookOpen, Moon, Sun, Brain } from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToastContext } from '../components/ToastProvider';
import styles from './AuthPage.module.css';
import { usePreferences } from '../context/PreferencesContext';

type Role = 'student' | 'teacher';
type Mode = 'login' | 'register';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { language, setLanguage, theme, toggleTheme, t } = usePreferences();
  const { showToast } = useToastContext();
  const [role, setRole] = useState<Role>('student');
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const trimmedEmail = email.trim();
      const body = mode === 'login'
        ? { email: trimmedEmail, password }
        : { name, email: trimmedEmail, password, role: role.toUpperCase() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data.error || `Error ${res.status}`;
        setError(message);
        showToast({ description: message, variant: 'error' });
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      showToast({
        title: t('auth.success', 'Success'),
        description: mode === 'login' ? t('auth.loginSuccess', 'Welcome back!') : t('auth.registerSuccess', 'Account created successfully!'),
        variant: 'success',
      });
      const userRole = (data.user.role || role).toLowerCase();
      navigate(userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      console.error(err);
      const message = 'Server connection failed.';
      setError(message);
      showToast({ description: message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.splitContainer}>
      <div className={styles.graphicPanel}>
        <div className={styles.graphicOverlay}></div>
        <div className={styles.graphicContent}>
          <Brain size={64} fill="currentColor" color="white" />
          <h2 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, marginTop: '1.5rem', lineHeight: 1.1 }}>
            {t('auth.graphicTitle', 'Empower Your Mind.')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginTop: '1.5rem', maxWidth: '400px', lineHeight: 1.6 }}>
            {t('auth.graphicSubtitle', 'Join the next generation of online learning powered by artificial intelligence and adaptive design.')}
          </p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <Card className={styles.authCard}>
          <CardBody>
            <div className={styles.header}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '1rem', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                  <BookOpen size={32} />
                </div>
              </div>
              <h1 className={`${styles.title} text-gradient`}>{t('auth.title', 'Cognify')}</h1>
              <p className={styles.subtitle}>
                {mode === 'login'
                  ? t('auth.login.subtitle', 'Sign in to continue learning')
                  : t('auth.register.subtitle', 'Create an account to start learning')}
              </p>
            </div>

            <div className={styles.prefBar}>
              <div className={styles.langSwitch}>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'ru' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('ru')}
                >
                  RU
                </button>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'kk' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('kk')}
                >
                  KZ
                </button>
              </div>
              <button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-label={t('layout.theme', 'Theme')}>
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <span>{theme === 'dark' ? t('layout.dark', 'Dark') : t('layout.light', 'Light')}</span>
              </button>
            </div>

            <div className={styles.roleToggle}>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'student' ? styles.active : ''}`}
                onClick={() => setRole('student')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={18} /> {t('auth.student', 'Student')}
                </div>
              </button>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'teacher' ? styles.active : ''}`}
                onClick={() => setRole('teacher')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <User size={18} /> {t('auth.teacher', 'Teacher')}
                </div>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {mode === 'register' && (
                <Input
                  label={t('auth.name', 'Full Name')}
                  placeholder="John Doe"
                  icon={<User size={18} />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
              <Input
                label={t('auth.email', 'Email')}
                type="email"
                placeholder="name@example.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label={t('auth.password', 'Password')}
                type="password"
                placeholder="********"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" size="lg" fullWidth style={{ marginTop: '0.5rem' }} disabled={isLoading}>
                {isLoading ? '...' : mode === 'login' ? t('auth.login', 'Sign In') : t('auth.register', 'Create Account')}
              </Button>
            </form>

            <div className={styles.footer}>
              {mode === 'login' ? (
                <p>
                  Нет аккаунта?{' '}
                  <button type="button" className={styles.link} onClick={() => { setMode('register'); setError(''); }}>
                    {t('auth.register', 'Create Account')}
                  </button>
                </p>
              ) : (
                <p>
                  Уже есть аккаунт?{' '}
                  <button type="button" className={styles.link} onClick={() => { setMode('login'); setError(''); }}>
                    {t('auth.login', 'Sign In')}
                  </button>
                </p>
              )}
            </div>
          </CardBody>
        </Card>
        <div style={{ position: 'absolute', bottom: '20px', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
          Cognify © 2026. Дизайн Phase 9.
        </div>
      </div>
    </div>
  );
};
