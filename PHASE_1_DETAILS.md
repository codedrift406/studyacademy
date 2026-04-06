# 🎯 ДЕТАЛЬНЫЙ ПЛАН ФАЗА 1: UX/UI УЛУЧШЕНИЯ


## ЭТАП 1.1: АНИМАТИЗАЦИЯ ИНТЕРФЕЙСА (5-7 дней)

### Task 1.1.1: Page Transitions
**Описание:** Гладкие переходы между страницами с fade/slide эффектами  
**Файлы которые нужно создать:**
- `src/components/PageTransition.tsx` - компонент обертка
- `src/components/PageTransition.module.css` - анимации

**Реализация:**
```typescript
// PageTransition компонент с Framer Motion
// Wrap всех страниц в <PageTransition>
// Fade + Slide эффекты при смене роута
```

**Зависимости для добавления:**
```bash
npm install framer-motion
```

**Приоритет:** 🔴 ВЫСОКИЙ  
**Оценка:** 3-4 часа

---

### Task 1.1.2: Micro-animations на Card Hover
**Описание:** При наведении карточки слегка приподнимаются и светятся  
**Файлы которые нужно изменить:**
- `src/components/ui/Card.module.css` - добавить @keyframes
- `src/components/ui/Card.tsx` - добавить hover стили

**Эффекты:**
- Lift: translateY(-8px)
- Scale: scale(1.02)
- Glow: box-shadow с синим свечением
- Duration: 0.3s

**Приоритет:** 🟠 СРЕДНИЙ  
**Оценка:** 2 часа

---

### Task 1.1.3: Loading Skeletons
**Описание:** Вместо спиннера показывать структурированные загрузочные экраны  
**Файлы которые нужно создать:**
- `src/components/Skeleton.tsx` - Skeleton компонент
- `src/components/Skeleton.module.css` - shimmer анимация
- `src/components/SkeletonCard.tsx`, `src/components/SkeletonTable.tsx` - варианты

**Использование:**
```typescript
// Вместо: {isLoading ? <Spinner /> : <Card />}
// Использовать: <Skeleton isLoading={isLoading}><Card /></Skeleton>
```

**Не забыть применить на:**
- TeacherDashboard (статистика)
- StudentDashboard (рекомендации)
- CourseView (видео информация)
- StudentCatalog (список курсов)

**Приоритет:** 🔴 ВЫСОКИЙ  
**Оценка:** 6-8 часов

---

### Task 1.1.4: Toast Notifications
**Описание:** Улучшенные уведомления с анимацией  
**Файлы которые нужно создать:**
- `src/components/Toast.tsx` - Toast компонент
- `src/components/Toast.module.css` - стили
- `src/hooks/useToast.ts` - кастомный хук

**Типы:**
- Success (зеленый)
- Error (красный)  
- Info (голубой)
- Warning (оранжевый)

**Использование:**
```typescript
const { showToast } = useToast();
showToast('Курс добавлен!', 'success');
```

**Заменить все alert() на Toast в:**
- AuthPage (успешная регистрация)
- TeacherCourseCreate (сохранение курса)
- Grades (сохранение оценок)
- Видеоплеер (события)

**Приоритет:** 🟠 СРЕДНИЙ  
**Оценка:** 4-5 часов

---

## ЭТАП 1.2: УЛУЧШЕНИЕ НАВИГАЦИИ (5-6 дней)

### Task 1.2.1: Breadcrumbs
**Описание:** Навигационная цепочка: Home > Courses > Python > Lesson 5  
**Файлы которые нужно создать:**
- `src/components/Breadcrumbs.tsx` - компонент
- `src/components/Breadcrumbs.module.css` - стили

**Логика:**
```typescript
// Автоматически генерировать из маршрута
// /teacher/courses/123/edit -> Teacher / Courses / Edit Course
```

**Применить на:**
- Все вложенные страницы (курсы, уроки, редактирование)
- Помещать в `DashboardLayout header`

**Приоритет:** 🟠 СРЕДНИЙ  
**Оценка:** 3-4 часа

---

### Task 1.2.2: Course Search & Filter
**Описание:** Поиск по названию курса + фильтры по языку, сложности, теме  
**Файлы которые нужно изменить:**
- `src/pages/StudentCatalog.tsx` - добавить search input
- `src/pages/TeacherCourses.tsx` - добавить фильтры
- `src/components/ui/SearchInput.tsx` - новый компонент

**Функции:**
- Реал-тайм поиск (debounce 300ms)
- Фильтры: язык, уровень, категория
- Сохранение поиска в URL (query params)
- Показать "Результаты не найдены"

**API:**
```
GET /api/courses?search=python&language=en&level=beginner
```

**Приоритет:** 🔴 ВЫСОКИЙ  
**Оценка:** 6-7 часов

---

### Task 1.2.3: Quick Access Bar
**Описание:** Быстрый доступ к избранным курсам в боковой панели  
**Файлы которые нужно изменить:**
- `src/components/layout/DashboardLayout.tsx` - добавить раздел
- `src/lib/api.ts` - добавить API для избранного

**Функции:**
- Максимум 5 последних/избранных курсов
- Иконка звезды/закладки для добавления в избранное
- Хранить в localStorage или БД
- Быстрый переход кликом

**Приоритет:** 🟡 НИЗКИЙ  
**Оценка:** 4-5 часов

---

### Task 1.2.4: Course Bookmarks & History
**Описание:** Закладки в уроках + история просмотров  
**Файлы которые нужно создать:**
- Migration для БД (добавить Bookmark и History моделей)
- `src/hooks/useBookmarks.ts` - хук для работы с закладками
- Backend endpoints

**Функции:**
- Добавить/удалить закладку (Ctrl+B)
- История просмотров (автоматически сохраняется)
- Показать на Dashboard: "Продолжить просмотр"
- Вернуться к закладке одним кликом

**Приоритет:** 🟡 НИЗКИЙ  
**Оценка:** 6-8 часов

---

## ЭТАП 1.3: DATA VISUALIZATION (4-5 дней)

### Task 1.3.1: Student Progress Charts
**Описание:** Визуализация прогресса студента с графиками  
**Файлы которые нужно создать:**
- `src/components/Charts/ProgressChart.tsx` - линейный график
- `src/components/Charts/ScoreDistribution.tsx` - столбчатая диаграмма
- `src/components/Charts/TimeSpent.tsx` - круговая диаграмма

**Зависимости:**
```bash
npm install recharts
```

**Графики на StudentDashboard:**
1. Прогресс по курсам (строки)
2. Распределение оценок (столбцы)
3. Время потраченное на курсы (круговая)
4. Активность по дням (heatmap)

**Приоритет:** 🟠 СРЕДНИЙ  
**Оценка:** 8-10 часов

---

### Task 1.3.2: Teacher Analytics Dashboard
**Описание:** Расширенная аналитика для преподавателя  
**Файлы которые нужно изменить:**
- `src/pages/TeacherDashboard.tsx` - добавить больше графиков

**Новые графики:**
1. Успеваемость студентов по курса (heatmap)
2. Тренд оценок за время
3. Время прохождения курса (box plot)
4. Эффективность видеоуроков (просмотры vs оценки)

**API для получения:**
```
GET /api/teacher/analytics/{courseId}
```

**Приоритет:** 🟠 СРЕДНИЙ  
**Оценка:** 6-8 часов

---

### Task 1.3.3: Heatmap Activity
**Описание:** Калорийность активности студента (как GitHub heatmap)  
**Файлы которые нужно создать:**
- `src/components/Charts/ActivityHeatmap.tsx` - компонент
- `src/components/Charts/ActivityHeatmap.module.css` - стили

**Функции:**
- Показывает активность за последние 52 недели
- Цвет интенсивнее = больше активности
- На наведении показывает точное число часов
- Текущая неделя подсвечена

**Приоритет:** 🟡 НИЗКИЙ  
**Оценка:** 4-6 часов

---

## 📋 SUMMARY ФАЗА 1

| Task | Часы | Дни | Приоритет |
|------|-------|-----|-----------|
| 1.1.1 Page Transitions | 3-4 | 0.5 | 🔴 |
| 1.1.2 Card Hover Effects | 2 | 0.25 | 🟠 |
| 1.1.3 Loading Skeletons | 6-8 | 1 | 🔴 |
| 1.1.4 Toast Notifications | 4-5 | 0.75 | 🟠 |
| 1.2.1 Breadcrumbs | 3-4 | 0.5 | 🟠 |
| 1.2.2 Search & Filter | 6-7 | 1 | 🔴 |
| 1.2.3 Quick Access | 4-5 | 0.75 | 🟡 |
| 1.2.4 Bookmarks & History | 6-8 | 1 | 🟡 |
| 1.3.1 Progress Charts | 8-10 | 1.25 | 🟠 |
| 1.3.2 Analytics Dashboard | 6-8 | 1 | 🟠 |
| 1.3.3 Activity Heatmap | 4-6 | 0.75 | 🟡 |
| **ИТОГО** | **51-68** | **8-9** | - |

---

## 🚀 РЕКОМЕНДОВАННЫЙ ПОРЯДОК РЕАЛИЗАЦИИ

**Неделя 1:**
1. Install Framer Motion & Recharts
2. Implement Loading Skeletons (1.1.3) - большое влияние
3. Implement Toast Notifications (1.1.4)
4. Implement Page Transitions (1.1.1)
5. Implement Card Hover (1.1.2)

**Неделя 2:**
1. Implement Search & Filter (1.2.2) - главный фокус
2. Implement Breadcrumbs (1.2.1)
3. Start Progress Charts (1.3.1)

**Неделя 3 (Дополнительно если время):**
1. Analytics Dashboard (1.3.2)
2. Quick Access (1.2.3)
3. Activity Heatmap (1.3.3)
4. Bookmarks & History (1.2.4)

---

## 🔧 ПЕРЕД НАЧАЛОМ

**Зависимости для добавления:**
```bash
npm install framer-motion recharts
```

**Обновить типы:**
```bash
npm install --save-dev @types/recharts
```

**Создать папки:**
```
src/components/Charts/
src/components/Animations/
src/hooks/
```

**Конфиг для оптимизации:**
```typescript
// tailwind.config.js (если используется)
// импортировать анимации из Framer Motion
```

---

## ✅ DEFINITION OF DONE

Каждая задача считается завершенной когда:
- ✅ Код написан и протестирован локально
- ✅ Нет ошибок в консоли
- ✅ Работает на темной и светлой теме
- ✅ Responsive на мобильных размерах
- ✅ Все переводы добавлены (ru/en/kk)
- ✅ Loading/Error states обработаны
- ✅ Build успешен (`npm run build`)
- ✅ E2E тест написан (если нужно)

---

**Документ создан:** 2 апреля 2026  
**Версия:** 1.0