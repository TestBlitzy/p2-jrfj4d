import React, { useState, useEffect, useCallback, useRef } from 'react';
import classNames from 'classnames';
import useResizeObserver from '@react-hook/resize-observer';

import Header from '../components/navigation/Header';
import Sidebar from '../components/common/Sidebar';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';

// Version comments for external dependencies
// @react-hook/resize-observer: ^1.2.6
// react: ^18.2.0
// classnames: ^2.3.2

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  sessionTimeout?: number;
  enableSystemTheme?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className,
  sessionTimeout = 30, // 30 minutes default
  enableSystemTheme = true
}) => {
  // State management
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  });

  // Refs
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizeTimeout = useRef<NodeJS.Timeout>();

  // Hooks
  const { theme, themeMode, setThemeMode } = useTheme();
  const { refreshSession, logout, sessionStatus } = useAuth();

  // Resize observer setup
  useResizeObserver(layoutRef, (entry) => {
    const { width, height } = entry.contentRect;
    
    // Debounce resize calculations
    if (resizeTimeout.current) {
      clearTimeout(resizeTimeout.current);
    }

    setIsResizing(true);
    resizeTimeout.current = setTimeout(() => {
      setDimensions({ width, height });
      setIsResizing(false);
    }, 150);
  });

  // Handle sidebar toggle with accessibility
  const handleSidebarToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      
      // Announce state change to screen readers
      const message = `Sidebar ${newState ? 'collapsed' : 'expanded'}`;
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);

      return newState;
    });
  }, []);

  // Handle theme changes with system preference support
  const handleThemeChange = useCallback((mode: string) => {
    if (enableSystemTheme && mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDark ? 'dark' : 'light');
    } else {
      setThemeMode(mode as 'light' | 'dark');
    }
  }, [enableSystemTheme, setThemeMode]);

  // Session monitoring and refresh
  useEffect(() => {
    if (sessionStatus?.isValid) {
      const sessionCheckInterval = setInterval(() => {
        const now = new Date();
        const expiresAt = new Date(sessionStatus.expiresAt);
        
        if (now >= expiresAt) {
          logout();
        } else if ((expiresAt.getTime() - now.getTime()) / 1000 / 60 <= 5) {
          // Refresh 5 minutes before expiry
          refreshSession();
        }
      }, 60000); // Check every minute

      return () => clearInterval(sessionCheckInterval);
    }
  }, [sessionStatus, refreshSession, logout]);

  // System theme detection
  useEffect(() => {
    if (enableSystemTheme && themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setThemeMode(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [enableSystemTheme, themeMode, setThemeMode]);

  return (
    <ErrorBoundary>
      <div
        ref={layoutRef}
        className={classNames(
          'dashboard-layout',
          {
            'dashboard-layout--collapsed': isCollapsed,
            'dashboard-layout--resizing': isResizing,
            [`theme-${themeMode}`]: true
          },
          className
        )}
        style={{ minHeight: '100vh' }}
      >
        <Header
          onThemeChange={handleThemeChange}
          onSessionExpired={logout}
          className="dashboard-layout__header"
        />

        <div className="dashboard-layout__container">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={handleSidebarToggle}
            className="dashboard-layout__sidebar"
          />

          <main
            className={classNames('dashboard-layout__content', {
              'dashboard-layout__content--collapsed': isCollapsed
            })}
            role="main"
            aria-label="Main content"
          >
            {children}
          </main>
        </div>

        {/* Skip to main content link for accessibility */}
        <a
          href="#main"
          className="skip-link"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;