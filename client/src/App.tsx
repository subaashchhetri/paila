import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { NotificationProvider } from './context/NotificationContext.js';

// Layout & Pages
import { Layout } from './components/Layout.js';
import { Login } from './pages/Login.js';
import { Signup } from './pages/Signup.js';
import { Onboarding } from './pages/Onboarding.js';
import { Home } from './pages/Home.js';
import { Todo } from './pages/Todo.js';
import { Finance } from './pages/Finance.js';
import { Loans } from './pages/Loans.js';
import { Reports } from './pages/Reports.js';
import { Profile } from './pages/Profile.js';
import { Admin } from './pages/Admin.js';

// 1. Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed
  if (user && !user.profile.onboardingCompleted) {
    return <Navigate to="/onboard" replace />;
  }

  return <>{children}</>;
};

// 2. Public-only Route Component (Redirects to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// 3. Onboarding-only Route Component
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.profile.onboardingCompleted) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />

      {/* Admin Panel */}
      <Route path="/admin" element={<Admin />} />

      {/* Onboarding Screen */}
      <Route path="/onboard" element={
        <OnboardingRoute>
          <Onboarding />
        </OnboardingRoute>
      } />

      {/* Secure Pages wrapped in Sidebar Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="todo" element={<Todo />} />
        <Route path="finance" element={<Finance />} />
        <Route path="loans" element={<Loans />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Catch-all redirects to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <HashRouter>
      <NotificationProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </NotificationProvider>
    </HashRouter>
  );
}
