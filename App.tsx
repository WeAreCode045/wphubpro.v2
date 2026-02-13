
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import SitesPage from './pages/SitesPage';
import LibraryPage from './pages/LibraryPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotFoundPage from './pages/NotFoundPage';
import SiteDetailPage from './pages/SiteDetailPage';
import QueryProvider from './QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { Loader2 } from 'lucide-react';

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />
      <Route 
        path="/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="sites" element={<SitesPage />} />
                <Route path="sites/:siteId" element={<SiteDetailPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};


const App: React.FC = () => {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <HashRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </HashRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default App;
