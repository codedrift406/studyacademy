# 🚀 QUICK START: НАЧАТЬ РЕАЛИЗАЦИЮ ФАЗЫ 1

## ДЕНЬ 1-2: Инициализация & Фундамент

### ШАГ 1: Установить зависимости

```bash
# Navigate to frontend
cd c:\Users\kinge\OneDrive\Desktop\Cognify\Cognify\frontend

# Добавить новые пакеты
npm install framer-motion recharts

# Для типов
npm install --save-dev @types/recharts
```

### ШАГ 2: Создать новые папки

```bash
# From frontend directory
mkdir src/components/Charts
mkdir src/components/Animations
mkdir src/hooks
mkdir src/context
```

### ШАГ 3: Создать базовую структуру Toast System

**Файл:** `src/context/ToastContext.tsx`

```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  hideToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'], duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => hideToast(id), duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
```

### ШАГ 4: Создать Toast компонент

**Файл:** `src/components/ui/Toast.module.css`

```css
.toastContainer {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  pointer-events: auto;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  border-left-color: #10b981;
}

.toast.error {
  border-left-color: #ef4444;
}

.toast.info {
  border-left-color: #3b82f6;
}

.toast.warning {
  border-left-color: #f59e0b;
}

.message {
  font-size: 0.95rem;
  font-weight: 500;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}

[data-theme='light'] .toast {
  background: white;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}
```

**Файл:** `src/components/ui/Toast.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import styles from './Toast.module.css';

export const ToastContainer = () => {
  const { toasts, hideToast } = useToast();

  const icons = {
    success: <CheckCircle size={20} color="#10b981" />,
    error: <AlertCircle size={20} color="#ef4444" />,
    info: <Info size={20} color="#3b82f6" />,
    warning: <AlertTriangle size={20} color="#f59e0b" />,
  };

  return (
    <div className={styles.toastContainer}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            {icons[toast.type]}
            <span className={styles.message}>{toast.message}</span>
            <button
              onClick={() => hideToast(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={18} opacity={0.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

### ШАГ 5: Обновить Main.tsx

**Файл:** `src/main.tsx`

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { PreferencesProvider } from './context/PreferencesContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </PreferencesProvider>
  </StrictMode>,
)
```

### ШАГ 6: Добавить ToastContainer в App

**Файл:** `src/App.tsx` (конец файла перед export)

```typescript
import { ToastContainer } from './components/ui/Toast'

function App() {
  return (
    <>
      <Router>
        {/* ... существующие routes ... */}
      </Router>
      <ToastContainer />
    </>
  );
}
```

### ШАГ 7: Проверить что работает

```bash
# Build
npm run build

# Если все ОК, запустить dev сервер
npm run dev
```

**Результат должен быть:** ✅ Build успешен, 0 errors

---

## ДЕНЬ 3: Page Transitions & Skeleton

### ШАГ 8: Создать Page Transition компонент

**Файл:** `src/components/Animations/PageTransition.tsx`

```typescript
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const variants = {
    hidden: { opacity: 0, y: 10 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};
```

### ШАГ 9: Создать Skeleton компонент

**Файл:** `src/components/ui/Skeleton.module.css`

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

[data-theme='light'] .skeleton {
  background: linear-gradient(
    90deg,
    rgba(30, 64, 175, 0.08) 25%,
    rgba(30, 64, 175, 0.12) 50%,
    rgba(30, 64, 175, 0.08) 75%
  );
}

.skeletonCard {
  height: 300px;
  border-radius: 12px;
}

.skeletonText {
  height: 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeletonHeader {
  height: 28px;
  border-radius: 6px;
  margin-bottom: 16px;
}
```

**Файл:** `src/components/ui/Skeleton.tsx`

```typescript
import { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'card' | 'text' | 'header' | 'custom';
  count?: number;
  height?: number;
  width?: number;
  style?: CSSProperties;
}

export const Skeleton = ({
  variant = 'text',
  count = 1,
  height,
  width = '100%',
  style,
}: SkeletonProps) => {
  const getDefaultHeight = () => {
    switch (variant) {
      case 'card':
        return 300;
      case 'header':
        return 28;
      case 'text':
        return 16;
      default:
        return 20;
    }
  };

  const h = height || getDefaultHeight();
  const skeletonStyle: CSSProperties = {
    width,
    height: h,
    borderRadius: '6px',
    marginBottom: '8px',
    ...style,
  };

  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div
          key={i}
          className={styles.skeleton}
          style={skeletonStyle}
        />
      ))}
    </>
  );
};
```

### ШАГ 10: Использовать Skeleton на StudentDashboard

**Файл:** `src/pages/StudentDashboard.tsx` (обновить)

```typescript
import { Skeleton } from '../components/ui/Skeleton';

// ... в render части:
{isLoading ? (
  <div>
    <Skeleton variant="header" />
    <Skeleton variant="card" count={3} />
  </div>
) : (
  // существующий контент
)}
```

---

## ДЕНЬ 4-5: Search & Filter

### ШАГ 11: Создать Search Hook

**Файл:** `src/hooks/useSearch.ts`

```typescript
import { useState, useRef, useCallback } from 'react';

export const useSearch = (onSearch: (term: string) => void, debounceMs = 300) => {
  const [term, setTerm] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const search = useCallback((value: string) => {
    setTerm(value);
    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (value.length >= 2) {
        onSearch(value);
      }
    }, debounceMs);
  }, [onSearch, debounceMs]);

  const clear = useCallback(() => {
    setTerm('');
    clearTimeout(timeoutRef.current);
  }, []);

  return { term, search, clear };
};
```

### ШАГ 12: Создать SearchInput компонент

**Файл:** `src/components/ui/SearchInput.tsx`

```typescript
import { SearchIcon, X } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { usePreferences } from '../../context/PreferencesContext';
import styles from './Input.module.css';

interface SearchInputProps {
  onSearch: (term: string) => void;
  placeholder?: string;
}

export const SearchInput = ({ onSearch, placeholder }: SearchInputProps) => {
  const { t } = usePreferences();
  const { term, search, clear } = useSearch(onSearch);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <SearchIcon size={18} style={{ position: 'absolute', left: '12px' }} />
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder || t('search.placeholder', 'Search...')}
        value={term}
        onChange={(e) => search(e.target.value)}
        style={{ paddingLeft: '40px' }}
      />
      {term && (
        <button
          onClick={clear}
          style={{
            position: 'absolute',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};
```

### ШАГ 13: Обновить StudentCatalog с поиском

**Файл:** `src/pages/StudentCatalog.tsx` (обновить)

```typescript
import { SearchInput } from '../components/ui/SearchInput';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const StudentCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (term: string) => {
    setSearchParams({ search: term });
    // Fetch filtered courses
    setIsLoading(true);
    authFetch(`/api/courses/search?search=${term}`)
      .then(r => r.json())
      .then(data => {
        setCourses(data.courses);
        setIsLoading(false);
      });
  };

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      {isLoading ? (
        <Skeleton variant="card" count={4} />
      ) : courses.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {courses.map(course => (
            <Card key={course.id}>
              <CardBody>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <p>{t('search.noResults', 'No results found')}</p>
      )}
    </div>
  );
};
```

---

## ДЕНЬ 6-7: Charts & Data Visualization

### ШАГ 14: Создать Progress Chart

**Файл:** `src/components/Charts/ProgressChart.tsx`

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProgressData {
  courseTitle: string;
  progress: number;
}

interface ProgressChartProps {
  data: ProgressData[];
  title?: string;
}

export const ProgressChart = ({ data, title = 'Course Progress' }: ProgressChartProps) => {
  return (
    <div>
      {title && <h3>{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
          <XAxis dataKey="courseTitle" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" />
          <Tooltip 
            contentStyle={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="progress" 
            stroke="var(--primary)" 
            strokeWidth={2}
            dot={{ fill: 'var(--primary)', r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### ШАГ 15: Добавить Charts на StudentDashboard

```typescript
import { ProgressChart } from '../components/Charts/ProgressChart';

// ... в render:
<ProgressChart 
  data={courses.map(c => ({
    courseTitle: c.title,
    progress: c.progressPercent || 0,
  }))}
  title={t('chart.progress', 'My Progress')}
/>
```

---

## ✅ CHECKLIST ПОСЛЕ ПЕРВОЙ НЕДЕЛИ

- [ ] Toast System работает
- [ ] Page Transitions реализованы
- [ ] Skeleton loading компоненты работают
- [ ] Search & Filter функционируют
- [ ] Progress Charts отображаются
- [ ] Build успешен
- [ ] Нет ошибок в консоли
- [ ] Работает на светлой и темной теме
- [ ] Все переводы добавлены

---

## КОМАНДЫ ДЛЯ ПРОВЕРКИ

```bash
# Проверить что все компилируется
npm run build

# Запустить линтер
npm run lint

# Запустить dev сервер
npm run dev

# Проверить e2e тесты
npm run test:e2e
```

---

## 🚨 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

**Список ошибок и решения:**

1. **`framer-motion not found`**
   ```bash
   npm install framer-motion
   npm install --save-dev @types/framer-motion
   ```

2. **`recharts not found`**
   ```bash
   npm install recharts
   npm install --save-dev @types/recharts
   ```

3. **`ToastContext не найден`**
   - Убедитесь что `ToastProvider` обернул `App` в `main.tsx`
   - Проверьте импорт: `import { useToast } from '../../context/ToastContext'`

4. **`Animations не срабатывают`**
   - Проверьте что `motion` импортирован из `framer-motion`
   - Проверьте что компонент внутри `motion.div`

5. **CSS переменные не работают**
   - Убедитесь что `DashboardLayout` применяет `data-theme` атрибут
   - Проверьте `index.css` на наличие `:root` переменных

---

**Документ создан:** 2 апреля 2026  
**Версия:** 1.0  
**Время读через:** ~30 минут