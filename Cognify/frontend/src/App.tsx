import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PageTransition } from './components/PageTransition.tsx';
import { Suspense, lazy } from 'react';

const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const TeacherCourseCreate = lazy(() => import('./pages/TeacherCourseCreate').then(m => ({ default: m.TeacherCourseCreate })));
const TeacherCourses = lazy(() => import('./pages/TeacherCourses').then(m => ({ default: m.TeacherCourses })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentCatalog = lazy(() => import('./pages/StudentCatalog').then(m => ({ default: m.StudentCatalog })));
const CourseView = lazy(() => import('./pages/CourseView').then(m => ({ default: m.CourseView })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CourseHistoryPage = lazy(() => import('./pages/CourseHistoryPage').then(m => ({ default: m.CourseHistoryPage })));
const TeacherStudents = lazy(() => import('./pages/TeacherStudents').then(m => ({ default: m.TeacherStudents })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';
import { AILibraryPage } from './pages/AILibraryPage';

interface StoredUser {
  id: string;
  role: string;
}

function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function ProtectedRoute({ roles }: { roles: Array<'TEACHER' | 'STUDENT' | 'ADMIN'> }) {
  const user = getStoredUser();
  const token = localStorage.getItem('token');
  if (!user || !token) {
    return <Navigate to="/auth" replace />;
  }
  if (!roles.includes((user.role || '').toUpperCase() as 'TEACHER' | 'STUDENT' | 'ADMIN')) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/course/:id" element={<PageTransition><Suspense fallback={<div className="p-8 text-center">Загрузка курса...</div>}><CourseView /></Suspense></PageTransition>} />
          <Route path="/verify/:code" element={<PageTransition><CertificateVerifyPage /></PageTransition>} />

          <Route element={<ProtectedRoute roles={['TEACHER', 'ADMIN']} />}>
            <Route
              path="/teacher"
              element={
                <DashboardLayout role="teacher">
                  <Outlet />
                </DashboardLayout>
              }
            >
              <Route path="dashboard" element={<Suspense fallback={<div className="p-4">Загрузка панели...</div>}><TeacherDashboard /></Suspense>} />
              <Route path="courses" element={<Suspense fallback={<div>Загрузка курсов...</div>}><TeacherCourses /></Suspense>} />
              <Route path="create" element={<Suspense fallback={<div>Загрузка инструментов...</div>}><TeacherCourseCreate /></Suspense>} />
              <Route path="students" element={<Suspense fallback={<div>Загрузка студентов...</div>}><TeacherStudents /></Suspense>} />
              <Route path="ai-library" element={<AILibraryPage />} />
              <Route path="history" element={<Suspense fallback={<div>Загрузка истории...</div>}><CourseHistoryPage /></Suspense>} />
              <Route path="courses/:id/edit" element={<Suspense fallback={<div>Загрузка редактора...</div>}><TeacherCourseCreate /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<div>Загрузка профиля...</div>}><ProfilePage /></Suspense>} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['STUDENT', 'ADMIN']} />}>
            <Route
              path="/student"
              element={
                <DashboardLayout role="student">
                  <Outlet />
                </DashboardLayout>
              }
            >
              <Route path="dashboard" element={<Suspense fallback={<div className="p-4">Загрузка панели...</div>}><StudentDashboard /></Suspense>} />
              <Route path="catalog" element={<Suspense fallback={<div>Загрузка каталога...</div>}><StudentCatalog /></Suspense>} />
              <Route path="ai-library" element={<AILibraryPage />} />
              <Route path="history" element={<Suspense fallback={<div>Загрузка истории...</div>}><CourseHistoryPage /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<div>Загрузка профиля...</div>}><ProfilePage /></Suspense>} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route
              path="/admin"
              element={
                <DashboardLayout role="teacher">
                  <Outlet />
                </DashboardLayout>
              }
            >
              <Route path="dashboard" element={<Suspense fallback={<div className="p-4">Загрузка админки...</div>}><AdminDashboard /></Suspense>} />
              <Route path="history" element={<Suspense fallback={<div>Загрузка истории...</div>}><CourseHistoryPage /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<div>Загрузка профиля...</div>}><ProfilePage /></Suspense>} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          <Route path="/" element={<PageTransition><Suspense fallback={<div>Загрузка Cognify...</div>}><LandingPage /></Suspense></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
