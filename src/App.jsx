import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import LoginScreen from './components/auth/LoginScreen';
import AppShell from './components/layout/AppShell';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const ClickUpPage = lazy(() => import('./pages/ClickUpPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const FormatterPage = lazy(() => import('./pages/FormatterPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const EnsightPage = lazy(() => import('./pages/EnsightPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '40vh', color: 'var(--text-muted)', fontSize: '0.875rem',
    }}>
      Loading...
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: 'var(--text-muted)',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <NotificationProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
          <Route path="inbox" element={<Suspense fallback={<Loading />}><InboxPage /></Suspense>} />
          <Route path="clickup" element={<Suspense fallback={<Loading />}><ClickUpPage /></Suspense>} />
          <Route path="tasks" element={<Suspense fallback={<Loading />}><TasksPage /></Suspense>} />
          <Route path="meetings" element={<Suspense fallback={<Loading />}><MeetingsPage /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={<Loading />}><CalendarPage /></Suspense>} />
          <Route path="formatter" element={<Suspense fallback={<Loading />}><FormatterPage /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<Loading />}><AnalyticsPage /></Suspense>} />
          <Route path="ensight" element={<Suspense fallback={<Loading />}><EnsightPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Loading />}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AuthGate />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
