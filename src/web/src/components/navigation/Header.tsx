import React, { useState, useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import useAuth from '../../hooks/useAuth';
import { THEME_MODES } from '../../constants/theme.constants';

// Version comments for external dependencies
// @mui/material: ^5.0.0
// react: ^18.2.0
// classnames: ^2.3.2

interface SecurityEvent {
  type: string;
  timestamp: Date;
  details: Record<string, any>;
}

interface HeaderProps {
  className?: string;
  onThemeChange: (mode: string) => void;
  onSessionExpired: () => void;
  onSecurityEvent: (event: SecurityEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  onThemeChange,
  onSessionExpired,
  onSecurityEvent
}) => {
  // State management
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(
    localStorage.getItem('theme') || THEME_MODES.SYSTEM
  );

  // Auth hook for secure session management
  const { user, logout, refreshToken, sessionStatus } = useAuth();

  // Memoized values
  const isSessionValid = useMemo(() => {
    return sessionStatus?.isValid && new Date() < new Date(sessionStatus?.expiresAt);
  }, [sessionStatus]);

  // Security event logging
  const logSecurityEvent = useCallback((type: string, details: Record<string, any> = {}) => {
    onSecurityEvent({
      type,
      timestamp: new Date(),
      details: {
        userId: user?.id,
        ...details
      }
    });
  }, [user, onSecurityEvent]);

  // Profile menu handlers
  const handleProfileClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();

    if (!isSessionValid) {
      logSecurityEvent('invalid_session_access_attempt');
      onSessionExpired();
      return;
    }

    setAnchorEl(event.currentTarget);
    setIsProfileOpen(true);
    logSecurityEvent('profile_menu_opened');
  }, [isSessionValid, logSecurityEvent, onSessionExpired]);

  // Secure logout handler
  const handleLogout = useCallback(async () => {
    try {
      logSecurityEvent('logout_initiated');
      await logout();
      setIsProfileOpen(false);
      setAnchorEl(null);
    } catch (error) {
      logSecurityEvent('logout_error', { error });
      console.error('Logout failed:', error);
    }
  }, [logout, logSecurityEvent]);

  // Theme handling with system preference detection
  const handleThemeChange = useCallback((mode: string) => {
    if (!Object.values(THEME_MODES).includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }

    document.documentElement.classList.add('theme-transition');
    setCurrentTheme(mode);
    onThemeChange(mode);
    localStorage.setItem('theme', mode);

    // Remove transition class after animation
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);

    logSecurityEvent('theme_changed', { mode });
  }, [onThemeChange, logSecurityEvent]);

  // Session monitoring
  useEffect(() => {
    if (!isSessionValid) {
      logSecurityEvent('session_expired');
      onSessionExpired();
    }
  }, [isSessionValid, onSessionExpired, logSecurityEvent]);

  // Token refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (isSessionValid) {
        refreshToken().catch((error) => {
          logSecurityEvent('token_refresh_error', { error });
          onSessionExpired();
        });
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isSessionValid, refreshToken, logSecurityEvent, onSessionExpired]);

  const themeOptions = [
    { value: THEME_MODES.LIGHT, label: 'Light' },
    { value: THEME_MODES.DARK, label: 'Dark' },
    { value: THEME_MODES.SYSTEM, label: 'System' }
  ];

  return (
    <header
      className={classNames(
        'header',
        'flex items-center justify-between',
        'px-4 py-2',
        'bg-white dark:bg-gray-800',
        'shadow-md',
        className
      )}
      role="banner"
      aria-label="Main navigation header"
    >
      {/* Logo and primary navigation */}
      <div className="flex items-center space-x-4">
        <img
          src="/logo.svg"
          alt="Sales & Intelligence Platform"
          className="h-8 w-auto"
        />
        <nav className="hidden md:flex space-x-4" role="navigation">
          <a href="/dashboard" className="nav-link" aria-current="page">
            Dashboard
          </a>
          <a href="/analytics" className="nav-link">
            Analytics
          </a>
          <a href="/leads" className="nav-link">
            Leads
          </a>
        </nav>
      </div>

      {/* User profile and settings */}
      <div className="flex items-center space-x-4">
        {/* Theme selector */}
        <Dropdown
          name="theme-selector"
          value={currentTheme}
          options={themeOptions}
          onChange={handleThemeChange}
          aria-label="Select theme"
          className="hidden md:block"
        />

        {/* User profile */}
        {user && (
          <div className="relative">
            <button
              className="flex items-center space-x-2"
              onClick={handleProfileClick}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              aria-label="Open user menu"
            >
              <Avatar
                src={user.profileImage}
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
                aria-hidden="true"
              />
              <span className="hidden md:block text-sm font-medium">
                {user.firstName}
              </span>
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu"
              >
                <div className="py-1 rounded-md bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                  <a
                    href="/profile"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => logSecurityEvent('profile_accessed')}
                  >
                    Your Profile
                  </a>
                  <a
                    href="/settings"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => logSecurityEvent('settings_accessed')}
                  >
                    Settings
                  </a>
                  <button
                    className="menu-item w-full text-left text-red-600"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;