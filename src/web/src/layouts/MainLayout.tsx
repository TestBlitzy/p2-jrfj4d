import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import classNames from 'classnames';

import Header from '../components/navigation/Header';
import Notification from '../components/common/Notification';
import useTheme from '../hooks/useTheme';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Version comments for external dependencies
// @mui/material: ^5.0.0
// react: ^18.2.0
// classnames: ^2.3.2

interface MainLayoutProps {
  /** Child components to render in the layout */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Initial theme preference */
  initialTheme?: 'light' | 'dark' | 'system';
}

/**
 * Main layout component that provides the base structure for the application
 * with enhanced error handling, theme management, and responsive design
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className,
  initialTheme
}) => {
  // Theme management
  const { theme, setThemeMode } = useTheme();
  
  // Responsive state
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // System theme preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Notification state
  const [notification, setNotification] = useState<any | null>(null);

  /**
   * Handle theme changes with system preference detection
   */
  const handleThemeChange = useCallback((mode: string) => {
    try {
      if (mode === 'system') {
        setThemeMode(prefersDarkMode ? 'dark' : 'light');
      } else {
        setThemeMode(mode as 'light' | 'dark');
      }
      
      // Persist theme preference
      localStorage.setItem('theme', mode);

      // Add transition class for smooth theme switching
      document.documentElement.classList.add('theme-transition');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 300);
    } catch (error) {
      console.error('Theme change failed:', error);
      setNotification({
        id: 'theme-error',
        type: 'ERROR',
        priority: 'MEDIUM',
        category: 'SYSTEM',
        title: 'Theme Change Failed',
        message: 'Failed to update theme preference. Please try again.',
        timestamp: new Date(),
        read: false
      });
    }
  }, [prefersDarkMode, setThemeMode]);

  /**
   * Handle menu toggle for mobile view
   */
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  /**
   * Handle layout-level errors
   */
  const handleError = useCallback((error: Error, componentStack: string) => {
    console.error('Layout error:', error, componentStack);
    setNotification({
      id: 'layout-error',
      type: 'ERROR',
      priority: 'HIGH',
      category: 'SYSTEM',
      title: 'Application Error',
      message: 'An unexpected error occurred. Please refresh the page.',
      timestamp: new Date(),
      read: false
    });
  }, []);

  /**
   * Handle notification dismissal
   */
  const handleNotificationDismiss = useCallback((id: string) => {
    setNotification(null);
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    if (initialTheme) {
      handleThemeChange(initialTheme);
    }
  }, [initialTheme, handleThemeChange]);

  // Monitor system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme') === 'system') {
        setThemeMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setThemeMode]);

  return (
    <ErrorBoundary
      onError={handleError}
      enableMonitoring={process.env.NODE_ENV === 'production'}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div
          className={classNames(
            'main-layout',
            {
              'main-layout--mobile': isMobile,
              'main-layout--menu-open': isMenuOpen
            },
            className
          )}
          role="main"
          aria-label="Main application layout"
        >
          <Header
            onThemeChange={handleThemeChange}
            onMenuToggle={handleMenuToggle}
            className="main-layout__header"
          />

          <main
            className={classNames('main-layout__content', {
              'main-layout__content--padded': !isMobile
            })}
          >
            {children}
          </main>

          {notification && (
            <div className="main-layout__notifications" role="alert">
              <Notification
                notification={notification}
                onDismiss={handleNotificationDismiss}
                autoClose
                duration={5000}
              />
            </div>
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default MainLayout;