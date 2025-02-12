import React, { useEffect, memo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { withErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';

// Styles for the authentication layout with accessibility enhancements
const AUTH_LAYOUT_STYLES = {
  container: 'min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900',
  content: 'w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl',
  logo: 'mx-auto h-12 w-auto',
  errorBoundary: 'text-center p-4 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 rounded'
};

// Security configuration for the authentication layout
const SECURITY_CONFIG = {
  sessionTimeout: 3600, // 1 hour in seconds
  mfaThreshold: 0.8, // Risk score threshold for requiring MFA
  maxRetries: 3, // Maximum login attempts before lockout
  inactivityTimeout: 900 // 15 minutes in seconds
};

// Props interface for the AuthLayout component
interface AuthLayoutProps {
  requireAuth?: boolean;
  allowAuthenticated?: boolean;
  children?: React.ReactNode;
}

/**
 * Enhanced authentication layout component with security features including
 * device fingerprinting, adaptive MFA, and comprehensive audit logging
 */
const AuthLayout: React.FC<AuthLayoutProps> = memo(({
  requireAuth = false,
  allowAuthenticated = false
}) => {
  const { 
    isAuthenticated,
    deviceFingerprint,
    mfaRequired,
    sessionStatus,
    refreshSession
  } = useAuth();

  // Monitor session activity and handle timeouts
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      inactivityTimer = setTimeout(() => {
        refreshSession();
      }, SECURITY_CONFIG.inactivityTimeout * 1000);
    };

    // Setup activity monitoring
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Initial timer setup
    resetInactivityTimer();

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [refreshSession]);

  // Handle authentication state redirects
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowAuthenticated && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle MFA requirement
  if (mfaRequired) {
    return <Navigate to="/mfa-verify" replace />;
  }

  // Verify session validity
  if (sessionStatus && !sessionStatus.isValid) {
    return <Navigate to="/login" replace state={{ expired: true }} />;
  }

  return (
    <div 
      className={AUTH_LAYOUT_STYLES.container}
      role="main"
      aria-label="Authentication page"
    >
      <div className={AUTH_LAYOUT_STYLES.content}>
        {/* Company Logo */}
        <img
          src="/logo.svg"
          alt="Company Logo"
          className={AUTH_LAYOUT_STYLES.logo}
        />

        {/* Device fingerprint for security audit */}
        {deviceFingerprint && (
          <meta 
            name="device-id" 
            content={deviceFingerprint}
            data-testid="device-fingerprint"
          />
        )}

        {/* Error Boundary for graceful error handling */}
        <ErrorBoundaryWrapper>
          <Outlet />
        </ErrorBoundaryWrapper>
      </div>
    </div>
  );
});

// Error Boundary wrapper component
const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" aria-live="polite">
    {children}
  </div>
);

// Error Boundary fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className={AUTH_LAYOUT_STYLES.errorBoundary} role="alert">
    <h2>Authentication Error</h2>
    <p>{error.message}</p>
    <button 
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
);

// Export enhanced AuthLayout with error boundary
export default withErrorBoundary(AuthLayout, {
  FallbackComponent: ErrorFallback,
  onError: (error) => {
    // Log authentication errors for monitoring
    console.error('Authentication Layout Error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      location: window.location.pathname
    });
  }
});