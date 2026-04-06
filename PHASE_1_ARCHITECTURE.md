# 🏗️ АРХИТЕКТУРА: ФАЗА 1 РЕАЛИЗАЦИЯ

## СТРУКТУРА НОВЫХ КОМПОНЕНТОВ

```
src/
├── components/
│   ├── ui/
│   │   ├── Card.tsx ✅
│   │   ├── Button.tsx ✅
│   │   ├── Input.tsx ✅
│   │   └── Skeleton.tsx 🔜 NEW
│   │   └── SearchInput.tsx 🔜 NEW
│   │   └── Toast.tsx 🔜 NEW
│   │   └── Breadcrumbs.tsx 🔜 NEW
│   │
│   ├── Charts/ 🔜 NEW FOLDER
│   │   ├── ProgressChart.tsx
│   │   ├── ScoreDistribution.tsx
│   │   ├── TimeSpent.tsx
│   │   ├── ActivityHeatmap.tsx
│   │   └── Charts.module.css
│   │
│   ├── Animations/ 🔜 NEW FOLDER
│   │   ├── PageTransition.tsx
│   │   ├── PageTransition.module.css
│   │   └── useAnimation.ts
│   │
│   ├── Layout/
│   │   ├── DashboardLayout.tsx ✅ (update)
│   │   └── DashboardLayout.module.css ✅ (update)
│   │
│   └── layout/
│       └── ...existing
│
├── hooks/ 🔜 NEW FOLDER
│   ├── useToast.ts
│   ├── useBookmarks.ts
│   ├── useSearch.ts
│   └── useLocalStorage.ts
│
├── context/
│   ├── PreferencesContext.tsx ✅ (exists)
│   └── ToastContext.tsx 🔜 NEW
│
├── lib/
│   ├── api.ts ✅ (update with new endpoints)
│   ├── animations.ts 🔜 NEW
│   └── constants.ts 🔜 NEW
│
└── pages/
    ├── StudentDashboard.tsx ✅ (update with charts)
    ├── StudentCatalog.tsx ✅ (update with search)
    ├── TeacherDashboard.tsx ✅ (update with analytics)
    ├── TeacherCourses.tsx ✅ (update with filters)
    └── CourseView.tsx ✅ (update with bookmarks)
```

---

## DATA FLOW DIAGRAMS

### 1. TOAST NOTIFICATION SYSTEM

```
User Action (onClick)
        ↓
showToast('Message', 'success')
        ↓
ToastContext dispatch
        ↓
Toast Component renders
        ↓
Animation IN (slideUp + fadeIn)
        ↓
Wait 3 seconds
        ↓
Animation OUT (slideDown + fadeOut)
        ↓
Removed from DOM
```

### 2. SEARCH & FILTER FLOW

```
User types in SearchInput
        ↓
Debounce 300ms
        ↓
useSearch hook updates state
        ↓
Query string updated (?search=python&level=beginner)
        ↓
API call: GET /api/courses?search=...
        ↓
Results loading (show Skeleton)
        ↓
Results cached with TanStack Query
        ↓
Display results with animations
```

### 3. CHARTS DATA FLOW

```
StudentDashboard mounts
        ↓
useQuery('studentProgress')
        ↓
API: GET /api/progress/student/{id}
        ↓
Data: { 
    courseProgress: [...],
    scores: [...],
    timeSpent: {...},
    dailyActivity: [...]
}
        ↓
ProgressChart component renders
        ↓
Recharts animates data points
```

---

## API ENDPOINTS NEEDED

### Новые endpoints для backend

```typescript
// Search & Filter
GET /api/courses/search
  Query: { search?: string, language?: string, level?: string, limit?: number }
  Response: { courses: Course[], total: number }

// Activity History
GET /api/progress/activity/{userId}
  Response: { dailyActivity: { date: string, hours: number }[] }

POST /api/bookmarks
  Body: { userId: string, courseId: string, lessonId: string, timestamp: number }
  
GET /api/bookmarks/{userId}
  Response: { bookmarks: Bookmark[] }

DELETE /api/bookmarks/{bookmarkId}

// Analytics
GET /api/analytics/student/{userId}
  Response: { 
    scoreDistribution: { score: number, count: number }[],
    timePerCourse: { courseId: string, hours: number }[],
    progressTrend: { date: string, progress: number }[]
  }

GET /api/analytics/teacher/{teacherId}/courses/{courseId}
  Response: {
    studentPerformance: { studentId: string, score: number }[],
    heatmap: Array<Array<number>>,
    videoEngagement: { videoId: string, views: number, avgTime: number }[]
  }
```

---

## COMPONENT API EXAMPLES

### Skeleton Component

```typescript
interface SkeletonProps {
  isLoading: boolean;
  variant?: 'card' | 'table' | 'text' | 'circle';
  count?: number;
  children?: ReactNode;
}

// Usage:
<Skeleton isLoading={isLoading} variant="card" count={3}>
  <Card>...</Card>
</Skeleton>
```

### Toast Hook

```typescript
interface ToastOptions {
  duration?: number; // default 3000ms
  position?: 'top-right' | 'bottom-right' | 'top-center';
  icon?: ReactNode;
}

const { showToast, hideToast } = useToast();

// Usage:
showToast('Success!', 'success', { duration: 5000 });
```

### Search Component

```typescript
interface SearchInputProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  debounceMs?: number;
  minChars?: number;
}

// Usage:
<SearchInput 
  onSearch={(term) => console.log(term)}
  debounceMs={300}
/>
```

### Breadcrumbs Component

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: string;
}

// Usage:
<Breadcrumbs items={[
  { label: 'Courses', href: '/courses' },
  { label: 'Python', href: '/course/123' },
  { label: 'Lesson 5' }
]} />
```

### Charts Components

```typescript
interface ProgressChartData {
  courseTitle: string;
  progress: number; // 0-100
  score: number; // 0-100
}

interface ProgressChartProps {
  data: ProgressChartData[];
  title?: string;
  height?: number;
}

// Usage:
<ProgressChart 
  data={progressData} 
  title="My Courses Progress"
/>
```

---

## STYLING STRATEGY

### Animations в Framer Motion

```typescript
// PageTransition.tsx
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

// Card Hover Effect
const cardVariants = {
  rest: { y: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  hover: { 
    y: -8, 
    boxShadow: '0 12px 24px rgba(59,130,246,0.25)',
    transition: { duration: 0.3 }
  }
};
```

### CSS для Skeleton

```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

---

## STATE MANAGEMENT

### Toast Context

```typescript
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (msg: string, type: Toast['type']) => void;
  hideToast: (id: string) => void;
}
```

### Search State (Zustand OR Context)

```typescript
interface SearchState {
  searchTerm: string;
  filters: {
    language?: string;
    level?: string;
    category?: string;
  };
  results: Course[];
  isLoading: boolean;
  
  setSearchTerm: (term: string) => void;
  setFilters: (filters: SearchState['filters']) => void;
  fetchResults: () => Promise<void>;
}
```

---

## PERFORMANCE OPTIMIZATIONS

### 1. Code Splitting

```typescript
// lazy load chart components
const ProgressChart = lazy(() => import('./ProgressChart'));
const ScoreDistribution = lazy(() => import('./ScoreDistribution'));

// Usage with Suspense
<Suspense fallback={<Skeleton variant="card" />}>
  <ProgressChart data={data} />
</Suspense>
```

### 2. Query Caching

```typescript
// TanStack Query с правильной кэшем стратегией
const { data: courses } = useQuery({
  queryKey: ['courses', searchTerm, filters],
  queryFn: () => searchCourses(searchTerm, filters),
  staleTime: 1000 * 60 * 5, // 5 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes
  keepPreviousData: true, // keep old data during new fetch
});
```

### 3. Debouncing Search

```typescript
const useSearch = (onSearch: (term: string) => void, delay = 300) => {
  const [term, setTerm] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const search = (value: string) => {
    setTerm(value);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (value.length >= 2) {
        onSearch(value);
      }
    }, delay);
  };

  return { term, search };
};
```

### 4. Memoization

```typescript
// Memoize expensive components
const ProgressChart = memo(({ data }: Props) => {...});
const ActivityHeatmap = memo(({ data }: Props) => {...});
```

---

## TESTING STRATEGY

### E2E Test для Search

```typescript
// e2e/search.spec.ts
test('Search for courses', async ({ page }) => {
  await page.goto('/student/catalog');
  await page.fill('[data-testid="search-input"]', 'python');
  await page.waitForSelector('[data-testid="course-card"]');
  const cards = await page.locator('[data-testid="course-card"]').count();
  expect(cards).toBeGreaterThan(0);
});
```

### Component Test для Toast

```typescript
// test/Toast.spec.ts
test('Toast should appear and disappear', async () => {
  render(<Toast message="Success!" type="success" />);
  expect(screen.getByText('Success!')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByText('Success!')).not.toBeInTheDocument();
  }, { timeout: 4000 });
});
```

---

## TRANSLATION KEYS (PreferencesContext)

Добавить новые ключи в `DICTIONARY`:

```typescript
'search.placeholder': 'Поиск курсов...',
'search.noResults': 'Курсы не найдены',
'filters.level': 'Уровень',
'filters.language': 'Язык',
'chart.progress': 'Прогресс',
'chart.scores': 'Оценки',
'chart.timeSpent': 'Время потрачено',
'breadcrumb.home': 'Главная',
'breadcrumb.courses': 'Курсы',
'toast.success': 'Успешно!',
'toast.error': 'Ошибка',
// ... и т.д.
```

---

## MIGRATION & DATABASE

### New Prisma Models

```prisma
model Bookmark {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id])
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id])
  timestamp Int
  createdAt DateTime @default(now())
  
  @@unique([userId, courseId, lessonId])
}

model ViewHistory {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id])
  watchedAt DateTime
  timeSpent Int // в секундах
  
  @@index([userId, courseId])
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_bookmarks_and_history
```

---

## GIT WORKFLOW

```bash
# Feature branch для Phase 1
git checkout -b feature/phase-1-ui-ux

# Commits по отдельным задачам:
git commit -m "feat: add page transitions with framer-motion"
git commit -m "feat: implement skeleton loading state"
git commit -m "feat: add toast notification system"
git commit -m "feat: implement search and filters"
# ...

# Pull request с описанием всех изменений
# После review -> merge в cognify3 branch
```

---

## DEPLOYMENT CHECKLIST

Перед деплоем убедиться что:
- ✅ `npm run build` успешен (0 errors)
- ✅ `npm run lint` проходит
- ✅ `npm test` все тесты зеленые
- ✅ `npm run test:e2e` E2E тесты OK
- ✅ Lighthouse score 85+
- ✅ Responsive на мобилях
- ✅ Все переводы добавлены
- ✅ Темная и светлая тема работают
- ✅ Code review одобрен

---

**Документ создан:** 2 апреля 2026  
**Версия:** 1.0  
**Автор:** DevTeam