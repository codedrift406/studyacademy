import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Languages, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  BookOpen, 
  AlertCircle,
  Hash,
  Globe,
  Upload,
  FileUp,
  X,
  ArrowRight
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { authFetch } from '../lib/api';
import styles from './AILibraryPage.module.css';

const SearchHub = React.memo(({ query, mode, loading, error, onQueryChange, onModeChange, onSearch, onKeyPress, t }: any) => {
  return (
    <section className={styles.heroSection}>
      <motion.div 
        className={styles.commandCenter}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.badgeRow}>
          <span className={styles.premiumBadge}>
            <Sparkles size={14} /> AI Library 2.0
          </span>
        </div>
        
        <h1 className={styles.commandTitle}>{t('ai.library.title')}</h1>
        
        {error && (
          <motion.div 
            className={styles.errorHighlight}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}

        <div className={styles.searchWrapper}>
          <p className={styles.searchGuide}>{t('ai.library.subtitle')}</p>
          <div className={styles.mainSearchInput}>
            <Search className={styles.searchIcon} size={24} />
            <textarea
              className={styles.commandInput}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={mode === 'search' ? "Чего желаете исследовать сегодня?" : "Введите текст для обработки..."}
              rows={mode === 'search' ? 1 : 3}
            />
            <button 
              className={styles.executeBtn}
              onClick={onSearch}
              disabled={loading || !query.trim()}
            >
              {loading ? <Sparkles className={styles.spinning} size={20} /> : <ArrowRight size={20} />}
            </button>
          </div>

          <div className={styles.modeChips}>
            {[
              { id: 'search', icon: <Search size={14} />, label: t('ai.library.mode.search') },
              { id: 'web_search', icon: <Globe size={14} />, label: t('landing.nav.solutions') },
              { id: 'translate', icon: <Languages size={14} />, label: t('ai.library.mode.translate') },
              { id: 'summarize', icon: <FileText size={14} />, label: t('ai.library.mode.summarize') }
            ].map(chip => (
              <button
                key={chip.id}
                className={`${styles.modeChip} ${mode === chip.id ? styles.chipActive : ''}`}
                onClick={() => onModeChange(chip.id as any)}
              >
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
});

const ResultsArea = React.memo(({ results, loading, copied, onCopy, t }: any) => {
  return (
    <AnimatePresence mode="wait">
      {!results && !loading ? (
        <motion.div 
          key="empty"
          className={styles.emptyState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={styles.emptyIcon}>
            <BookOpen size={48} />
          </div>
          <p>{t('ai.library.empty')}</p>
        </motion.div>
      ) : loading ? (
        <motion.div 
          key="loading"
          className={styles.loadingSkeleton}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={styles.skeletonBlock} style={{ height: 120 }} />
          <div className={styles.skeletonBlock} style={{ height: 300 }} />
        </motion.div>
      ) : (
        <motion.div 
          key="results"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={styles.resultsContent}
        >
          {(results?.translated || results?.summary) && (
            <div className={`${styles.resultCard} ${styles.specialCard} glass-panel`}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} />
                  <h4 className={styles.cardTitle}>{results?.translated ? t('ai.library.results.translation') : t('ai.library.results.summary')}</h4>
                </div>
                <button 
                  className={styles.copyBtn} 
                  onClick={() => onCopy(results?.translated || results?.summary || '')}
                >
                  {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  <span>{copied ? t('ai.library.copied') : t('ai.library.copy')}</span>
                </button>
              </div>
              <div className={styles.aiResultBody}>
                {results?.translated || results?.summary}
              </div>
            </div>
          )}

          {results?.items && results.items.length > 0 && (
            <div className={styles.resultsGrid}>
              {results.items.map((item: any, index: number) => (
                <motion.div 
                  key={item.id || index} 
                  className={styles.resultCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.typeBadge}>
                      {String(item.type || item.category || 'Resource').toUpperCase()}
                    </span>
                    {item.source && <span className={styles.sourceTag}>{item.source}</span>}
                  </div>
                  <h4 className={styles.cardTitle}>{item.title}</h4>
                  <p className={styles.cardDesc}>{item.summary || item.description}</p>
                  <div className={styles.tagRow}>
                    {item.tags?.slice(0, 3).map((tag: string, tagIndex: number) => (
                      <span key={tagIndex} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {results?.related && results.related.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Hash size={18} />
                <h3>{t('ai.library.results.related')}</h3>
              </div>
              {results.related.map((item: any, index: number) => (
                <div key={index} className={`${styles.resultCard} glass-panel`}>
                  <h5 className={styles.resultTitle}>{item.title}</h5>
                  <p className={styles.resultSummary}>{item.summary}</p>
                  <div className={styles.resultTags}>
                    {item.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                      <span key={tagIndex} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

interface LibraryItem {
  id?: string;
  title: string;
  language: string;
  type: string;
  source: string;
  summary: string;
  tags: string[];
  category?: string;
  description?: string;
}

interface LibraryResponse {
  items: LibraryItem[];
  related: LibraryItem[];
  offline: boolean;
  message: string;
  translated?: string;
  summary?: string;
}

const AILibraryPage: React.FC = () => {
  const { t } = usePreferences();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'translate' | 'summarize' | 'web_search'>('search');
  const [targetLanguage, setTargetLanguage] = useState('ru');
  const [results, setResults] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSearch = async () => {
    if (!query.trim() && mode !== 'search' && !file) return;

    if (file) {
      handleFileUpload();
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await authFetch('/api/ai/library-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          query: mode === 'search' || mode === 'web_search' ? query : '',
          text: mode !== 'search' && mode !== 'web_search' ? query : '',
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch library data');
      }

      const data: LibraryResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(t('ai.library.error', 'Failed to load library results. Please try again.'));
      console.error('Library search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLanguage', targetLanguage);
    formData.append('mode', mode === 'summarize' ? 'summarize' : 'translate');

    try {
      const response = await authFetch('/api/ai/library-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setResults({
        items: [],
        related: [],
        offline: false,
        message: data.message,
        translated: data.mode === 'translate' ? data.result : undefined,
        summary: data.mode === 'summarize' ? data.result : undefined,
      });
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'File processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (mode === 'search') {
      handleSearch();
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.kzPattern} />
      
      {/* Search Hub / Command Center */}
      <SearchHub 
        query={query}
        mode={mode}
        loading={loading}
        error={error}
        onQueryChange={setQuery}
        onModeChange={setMode}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        t={t}
      />

      <div className={styles.container}>
        <div className={styles.mainLayout}>
          {/* Action Sidebar (Hidden on search, visible on translation/upload) */}
          <AnimatePresence>
            {(mode === 'translate' || mode === 'summarize' || file) && (
              <motion.aside 
                className={styles.sidebar}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className={`glass-panel ${styles.sideCard}`}>
                  <h4>{t('ai.library.mode')}</h4>
                  
                  <div className={styles.fileUploadArea}>
                    <label className={styles.fileLabel}>
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      <div className={`${styles.uploadBox} ${file ? styles.uploadBoxActive : ''}`}>
                        {file ? (
                          <div className={styles.fileInfo}>
                            <FileUp size={20} className="text-primary" />
                            <div className={styles.fileName}>{file.name}</div>
                            <button onClick={(e) => { e.preventDefault(); setFile(null); }} className={styles.removeFile}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} />
                            <span>{t('course.create.upload')}</span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {(mode === 'translate' || mode === 'summarize') && (
                    <div className={styles.sideGroup}>
                      <label>{t('ai.library.targetLang')}</label>
                      <select
                        className="glass-input"
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        <option value="en">English (EN)</option>
                        <option value="ru">Russian (RU)</option>
                        <option value="kk">Kazakh (KK)</option>
                      </select>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

        <div className={styles.resultsArea}>
          {results?.message && (
            <div className={`${styles.message} ${styles.success}`}>
              {results.message}
            </div>
          )}
        </div>
          <ResultsArea 
            results={results}
            loading={loading}
            copied={copied}
            onCopy={copyToClipboard}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export { AILibraryPage };