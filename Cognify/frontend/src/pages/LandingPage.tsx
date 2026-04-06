import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Zap, Shield, Gamepad2, Layers, Moon, Sun } from 'lucide-react';
import styles from './LandingPage.module.css';
import { usePreferences } from '../context/PreferencesContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const rotateXImage = useTransform(scrollYProgress, [0, 0.3], [15, 0]);
  const scaleImage = useTransform(scrollYProgress, [0, 0.3], [0.9, 1]);
  const { t, language, setLanguage, theme, toggleTheme } = usePreferences();

  return (
    <div className={styles.landingContainer}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Brain className="text-primary" size={28} />
          {t('brand.name', 'Cognify')}
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>{t('landing.nav.features', 'Features')}</a>
          <a href="#solutions" className={styles.navLink}>{t('landing.nav.solutions', 'Solutions')}</a>
        </div>
        <div className={styles.controls}>
          <div className={styles.langSwitch}>
            <button className={`${styles.langBtn} ${language === 'ru' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('ru')}>RU</button>
            <button className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('en')}>EN</button>
            <button className={`${styles.langBtn} ${language === 'kk' ? styles.langBtnActive : ''}`} onClick={() => setLanguage('kk')}>KK</button>
          </div>
          <button onClick={toggleTheme} className={styles.navLink} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="neon-border-wrapper" style={{ borderRadius: '12px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              className={`${styles.btnPrimary} neon-border-inner`} 
              style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-surface)' }}
              onClick={() => navigate('/auth')}
            >
              {t('landing.nav.signin', 'Sign In')}
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
            {t('landing.hero.badge', '🚀 Cognify 2.0 is now live')}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className={styles.title}
            dangerouslySetInnerHTML={{ __html: t('landing.hero.title', 'The Operating System<br/>for Next-Gen Learning.') }}
          />
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className={styles.subtitle}
          >
            {t('landing.hero.subtitle', 'Empower your students with AI-driven adaptive learning, immersive RPG game modes, and deep enterprise analytics. Welcome to the future of education.')}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className={styles.ctaGroup}
          >
            <button className={styles.btnPrimary} onClick={() => navigate('/auth')}>
              {t('landing.hero.cta.start', 'Get Started Free')} <ArrowRight size={18} style={{ display: 'inline', marginLeft: '0.5rem', verticalAlign: 'middle' }}/>
            </button>
            <button className={styles.btnSecondary} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('landing.hero.cta.explore', 'Explore Platform')}
            </button>
          </motion.div>
        </div>
      </section>

      <section className={styles.previewSection}>
        <motion.div 
          className={styles.previewContainer}
          style={{ y: yImage, rotateX: rotateXImage, scale: scaleImage, transformPerspective: 1200 }}
        >
          <div className={styles.dashboardImage} style={{ 
            aspectRatio: '16/9', background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-elevated))', display: 'flex'
          }}>
            <div style={{ width: '250px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '2rem' }}>
              <div style={{ width: '100%', height: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '2rem' }} />
              <div style={{ width: '80%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ width: '70%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ width: '90%', height: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
            </div>
            <div style={{ flex: 1, padding: '3rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, height: '120px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), transparent)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)' }} />
                <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ width: '100%', height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }} />
            </div>
          </div>

          <motion.div 
            className={`${styles.floatingCard} ${styles.card1}`}
            animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{t('landing.preview.shield', 'AI Graded')}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('landing.preview.score', 'Score: 98% 🌟')}</p>
            </div>
          </motion.div>

          <motion.div 
            className={`${styles.floatingCard} ${styles.card2}`}
            animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #7e22ce)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gamepad2 size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{t('landing.preview.level', 'Level Up!')}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('landing.preview.levelSub', 'You reached Level 12')}</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('landing.features.title', 'Built for the Modern Learner')}</h2>
          <p className={styles.sectionSubtitle}>{t('landing.features.subtitle', 'Everything you need to deliver world-class educational experiences.')}</p>
        </div>
        
        <div className={styles.featureGrid}>
          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={`${styles.featureIcon}`}>
              <Brain size={32} />
            </div>
            <h3 className={styles.featureTitle}>{t('landing.features.ai.title', 'AI-Powered Creation')}</h3>
            <p className={styles.featureText}>{t('landing.features.ai.desc', 'Generate entire courses, quizzes, and adaptive learning paths in seconds using advanced language models.')}</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.green}`}>
              <Layers size={32} />
            </div>
            <h3 className={styles.featureTitle}>{t('landing.features.rpg.title', 'RPG Gamification')}</h3>
            <p className={styles.featureText}>{t('landing.features.rpg.desc', 'Turn boring curriculum into an interactive 2D map. Students explore islands, earn XP, and unlock chests.')}</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.purple}`}>
              <Zap size={32} />
            </div>
            <h3 className={styles.featureTitle}>{t('landing.features.analytics.title', 'Real-time Analytics')}</h3>
            <p className={styles.featureText}>{t('landing.features.analytics.desc', 'Instantly spot struggling students with our risk-scoring algorithms and export beautifully crafted PDF reports.')}</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
