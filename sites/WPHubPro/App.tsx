
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import SitesPage from './pages/SitesPage';
import LibraryPage from './pages/LibraryPage';
import SubscriptionPage from './pages/SubscriptionPage';
import UserSubscriptionDetailPage from './pages/UserSubscriptionDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import SiteDetailPage from './pages/SiteDetailPage';
import QueryProvider from './QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagerPage from './pages/admin/UserManagerPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import OrdersPage from './pages/admin/OrdersPage';
import PlanManagementPage from './pages/admin/PlanManagementPage';
import SubscriptionsPage from './pages/admin/SubscriptionsPage';
import SubscriptionDetailPage from './pages/admin/SubscriptionDetailPage';
import { Loader2 } from 'lucide-react';
const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  console.log('🔄 AppRoutes render - isLoading:', isLoading, 'user:', user?.$id, 'isAdmin:', user?.isAdmin);

  // Centralized loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - only redirect if auth is fully initialized */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Protected Layout Routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/sites/:id" element={<SiteDetailPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/subscription" element={<UserSubscriptionDetailPage />} />
        <Route path="/subscription/plans" element={<SubscriptionPage />} />
        
        {/* Admin Specific Routes */}
        <Route path="/admin" element={<AdminRoute><Outlet /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<UserManagerPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="plans" element={<PlanManagementPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
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
