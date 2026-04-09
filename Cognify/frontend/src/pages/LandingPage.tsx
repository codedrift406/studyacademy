import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Gamepad2,
  Layers,
  Moon,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  BarChart3,
  Zap,
} from 'lucide-react';
import styles from './LandingPage.module.css';
import { usePreferences } from '../context/PreferencesContext';

const highlights = [
  {
    icon: Brain,
    title: 'ИИ-курсы и адаптивные маршруты',
    text: 'Платформа помогает преподавателю быстро собирать курс, а студенту - получать персональный путь обучения без лишней ручной рутины.',
  },
  {
    icon: Gamepad2,
    title: 'Игровая механика и мотивация',
    text: 'RPG-карта, XP, прогресс и челленджи удерживают внимание и делают обучение ощутимо живее.',
  },
  {
    icon: BarChart3,
    title: 'Аналитика в реальном времени',
    text: 'Преподаватель видит, где студенты спотыкаются, какие темы проседают и где нужен дополнительный акцент.',
  },
  {
    icon: ShieldCheck,
    title: 'Безопасность и контроль доступа',
    text: 'Сессии, роли, сертификаты и разделение доступов помогают держать платформу аккуратной и защищённой.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Преподаватель создаёт курс',
    text: 'ИИ собирает структуру, уроки, материалы и проверочные блоки по заданным критериям качества.',
  },
  {
    number: '02',
    title: 'Студент проходит обучение',
    text: 'Курс подстраивается под прогресс, а интерфейс помогает не теряться даже в длинных программах.',
  },
  {
    number: '03',
    title: 'Результат сохраняется',
    text: 'После завершения курса выдаётся сертификат, а история обучения остаётся в архиве профиля.',
  },
];

const platformFacts = [
  'Генерация курсов через ИИ с критериями качества.',
  'Видео-уроки, тесты, адаптивные задания и сертификаты.',
  'RPG-механики, прогресс, XP и наглядная аналитика.',
  'Поддержка светлой и тёмной темы, локализация интерфейса.',
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const rotateXImage = useTransform(scrollYProgress, [0, 0.3], [15, 0]);
  const scaleImage = useTransform(scrollYProgress, [0, 0.3], [0.9, 1]);
  const { language, setLanguage, theme, toggleTheme } = usePreferences();

  return (
    <div className={styles.landingContainer}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Brain className={styles.logoIcon} size={28} />
          Cognify
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Возможности</a>
          <a href="#about" className={styles.navLink}>О платформе</a>
        </div>
        <div className={styles.controls}>
          <div className={styles.langSwitch}>
            <button className={`${styles.langBtn} ${language === 'ru' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('ru')}>
              RU
            </button>
            <button className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('en')}>
              EN
            </button>
            <button className={`${styles.langBtn} ${language === 'kk' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('kk')}>
              KZ
            </button>
          </div>
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label="Переключить тему"
            type="button"
          >
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="neon-border-wrapper" style={{ borderRadius: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`${styles.btnPrimary} neon-border-inner ${styles.loginBtn}`}
              style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-surface)' }}
              onClick={() => navigate('/auth')}
              type="button"
            >
              Войти
            </motion.button>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={`${styles.gradientBlob} ${styles.blob1}`} />
          <div className={`${styles.gradientBlob} ${styles.blob2}`} />
          <div className={styles.heroOrnament} />
        </div>

        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={styles.badge}
          >
            <Sparkles size={14} />
            Cognify 2.0 уже доступен
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={styles.title}
            dangerouslySetInnerHTML={{ __html: 'Платформа для обучения,<br/>генерации курсов и роста студентов.' }}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={styles.subtitle}
          >
            Cognify объединяет ИИ, аналитику, игровые механики и сертификаты, чтобы преподаватели создавали курсы быстрее, а студенты учились вовлечённее и результативнее.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={styles.ctaGroup}
          >
            <button className={styles.btnPrimary} onClick={() => navigate('/auth')} type="button">
              Начать бесплатно <ArrowRight size={18} style={{ display: 'inline', marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            </button>
            <button className={styles.btnSecondary} onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} type="button">
              О платформе
            </button>
          </motion.div>
        </div>
      </section>

      <section className={styles.previewSection}>
        <motion.div
          className={styles.previewContainer}
          style={{ y: yImage, rotateX: rotateXImage, scale: scaleImage, transformPerspective: 1200 }}
        >
          <div
            className={styles.dashboardImage}
            style={{
              aspectRatio: '16/9',
              background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-elevated))',
              display: 'flex',
            }}
          >
            <div style={{ width: '250px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '2rem' }}>
              <div style={{ width: '100%', height: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '2rem' }} />
              <div style={{ width: '80%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ width: '70%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ width: '90%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
            </div>
            <div style={{ flex: 1, padding: '3rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, height: '120px', background: 'linear-gradient(135deg, rgba(249,115,22,0.22), transparent)', borderRadius: '16px', border: '1px solid rgba(249,115,22,0.25)' }} />
                <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ width: '100%', height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }} />
            </div>
          </div>

          <motion.div
            className={`${styles.floatingCard} ${styles.card1}`}
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <div className={styles.floatingIcon}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <p className={styles.floatingTitle}>Оценка ИИ</p>
              <p className={styles.floatingText}>Результат: 98%</p>
            </div>
          </motion.div>

          <motion.div
            className={`${styles.floatingCard} ${styles.card2}`}
            animate={{ y: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
          >
            <div className={styles.floatingIcon}>
              <Gamepad2 size={20} color="white" />
            </div>
            <div>
              <p className={styles.floatingTitle}>Новый уровень</p>
              <p className={styles.floatingText}>Вы достигли 12 уровня</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutGrid}>
          <motion.div
            className={styles.aboutPanel}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.aboutBadge}>
              <BookOpen size={16} />
              О платформе
            </div>
            <h2 className={styles.aboutTitle}>Cognify помогает учить, строить курсы и отслеживать прогресс в одном месте.</h2>
            <p className={styles.aboutText}>
              Это не просто LMS. Здесь преподаватель получает инструменты для генерации курсов, а студент - понятный маршрут, мотивацию, видео-уроки, тесты и сертификат после прохождения.
            </p>

            <div className={styles.aboutHighlights}>
              {highlights.map(({ icon: Icon, title, text }) => (
                <article key={title} className={styles.highlightCard}>
                  <div className={styles.highlightIcon}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className={styles.highlightTitle}>{title}</h3>
                    <p className={styles.highlightText}>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>

          <div className={styles.aboutSide}>
            <motion.div
              className={styles.processCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              <div className={styles.processBadge}>
                <Zap size={16} />
                Как это работает
              </div>
              <div className={styles.processList}>
                {steps.map((step) => (
                  <article key={step.number} className={styles.processItem}>
                    <span className={styles.processNumber}>{step.number}</span>
                    <div>
                      <h3 className={styles.processTitle}>{step.title}</h3>
                      <p className={styles.processText}>{step.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </motion.div>

            <motion.div
              className={styles.infoPanel}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <div className={styles.infoPanelTitle}>Что внутри Cognify</div>
              <ul className={styles.infoList}>
                {platformFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Что умеет платформа</h2>
          <p className={styles.sectionSubtitle}>Набор инструментов, который закрывает создание курса, обучение студентов и контроль результата.</p>
        </div>

        <div className={styles.featureGrid}>
          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Brain size={32} />
            </div>
            <h3 className={styles.featureTitle}>Создание курсов с ИИ</h3>
            <p className={styles.featureText}>
              Генерация структуры курса, уроков, целей обучения и проверочных материалов по единым критериям качества.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.green}`}>
              <Layers size={32} />
            </div>
            <h3 className={styles.featureTitle}>RPG-геймификация</h3>
            <p className={styles.featureText}>
              Интерактивная карта, уровни, XP и прогресс превращают обучение в понятный и интересный маршрут.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.purple}`}>
              <Zap size={32} />
            </div>
            <h3 className={styles.featureTitle}>Аналитика и отчёты</h3>
            <p className={styles.featureText}>
              Преподаватель получает аналитику по слабым темам, рискам, активности и результатам, не теряя время на ручную сводку.
            </p>
          </motion.div>
        </div>
      </section>

      <footer className={styles.siteFooter}>
        <span>Cognify © 2026. Все права защищены.</span>
        <span>Сайт поддерживает HTTPS/SSL и использует cookie-файлы для сохранения сессии и защиты ваших данных.</span>
      </footer>
    </div>
  );
};
