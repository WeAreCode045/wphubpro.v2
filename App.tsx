
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

const App: React.FC = () => {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <HashRouter>
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
          </HashRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default App;