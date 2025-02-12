import React, { useEffect, useCallback } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Analytics } from '@segment/analytics-next';
import { ErrorBoundary } from 'react-error-boundary';

import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import store from './redux/store';
import useAuth from './hooks/useAuth';
import useTheme from './hooks/useTheme';
import { AUTH_ROUTES, DASHBOARD_ROUTES, ERROR_ROUTES } from './constants/routes.constants';

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.VITE_SEGMENT_WRITE_KEY as string,
  maxAttempts: 3
});

// Protected route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, sessionStatus } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  if (sessionStatus && !sessionStatus.isValid) {
    return <Navigate to={AUTH_ROUTES.LOGIN} state={{ expired: true }} replace />;
  }

  return <>{children}</>;
};

// Error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" className="error-container">
    <h2>Application Error</h2>
    <pre>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Reload Application</button>
  </div>
);

const App: React.FC = React.memo(() => {
  const { theme } = useTheme();

  // Initialize performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Report web vitals
      const reportWebVitals = async (metric: any) => {
        analytics.track('Web Vitals', {
          ...metric,
          timestamp: new Date().toISOString()
        });
      };

      // Initialize performance observer
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          reportWebVitals(entry);
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

      return () => observer.disconnect();
    }
  }, []);

  // Global error handler
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    analytics.track('Error', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route path={AUTH_ROUTES.LOGIN} element={<AuthLayout />} />
              <Route path={AUTH_ROUTES.REGISTER} element={<AuthLayout />} />
              <Route path={AUTH_ROUTES.RESET_PASSWORD} element={<AuthLayout />} />
              <Route path={AUTH_ROUTES.FORGOT_PASSWORD} element={<AuthLayout />} />
              <Route path={AUTH_ROUTES.MFA_SETUP} element={<AuthLayout />} />
              <Route path={AUTH_ROUTES.MFA_VERIFY} element={<AuthLayout />} />

              {/* Protected dashboard routes */}
              <Route
                path={DASHBOARD_ROUTES.HOME}
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DashboardLayout />
                    </MainLayout>
                  </ProtectedRoute>
                }
              >
                <Route path={DASHBOARD_ROUTES.DASHBOARD} element={<DashboardLayout />} />
                <Route path={DASHBOARD_ROUTES.ANALYTICS} element={<DashboardLayout />} />
                <Route path={DASHBOARD_ROUTES.COMPETITOR_ANALYSIS} element={<DashboardLayout />} />
                <Route path={DASHBOARD_ROUTES.REVENUE_ANALYSIS} element={<DashboardLayout />} />
                <Route path={DASHBOARD_ROUTES.INSIGHTS} element={<DashboardLayout />} />
                <Route path={DASHBOARD_ROUTES.REPORTS} element={<DashboardLayout />} />
              </Route>

              {/* Error routes */}
              <Route path={ERROR_ROUTES.NOT_FOUND} element={<MainLayout />} />
              <Route path={ERROR_ROUTES.FORBIDDEN} element={<MainLayout />} />
              <Route path={ERROR_ROUTES.SERVER_ERROR} element={<MainLayout />} />
              <Route path={ERROR_ROUTES.MAINTENANCE} element={<MainLayout />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to={ERROR_ROUTES.NOT_FOUND} replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
});

App.displayName = 'App';

export default App;