import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { useAnalytics } from '@analytics/react'; // ^0.1.0

import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../common/ErrorBoundary';

interface DashboardHeaderProps {
  /** Dashboard title text */
  title: string;
  /** Optional help button click handler */
  onHelpClick?: (event: React.MouseEvent) => void;
  /** Optional settings button click handler */
  onSettingsClick?: (event: React.MouseEvent) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Security context for header actions */
  securityContext?: {
    enableMFA?: boolean;
    allowSettings?: boolean;
    allowHelp?: boolean;
  };
  /** Enable/disable analytics tracking */
  analyticsEnabled?: boolean;
  /** Enable/disable error boundary */
  errorBoundary?: boolean;
}

/**
 * Enhanced header component for the main dashboard with comprehensive security,
 * accessibility, and responsive features.
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  onHelpClick,
  onSettingsClick,
  className,
  securityContext = {
    enableMFA: true,
    allowSettings: true,
    allowHelp: true
  },
  analyticsEnabled = true,
  errorBoundary = true
}) => {
  const { user, logout, validateSession } = useAuth();
  const analytics = useAnalytics();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Validate session on component mount
  useEffect(() => {
    validateSession().catch(console.error);
  }, [validateSession]);

  /**
   * Enhanced help icon click handler with analytics and accessibility
   */
  const handleHelpClick = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      // Validate current session
      await validateSession();

      // Check feature access
      if (!securityContext.allowHelp) {
        throw new Error('Help access denied');
      }

      // Track interaction
      if (analyticsEnabled) {
        analytics.track('help_button_clicked', {
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

      onHelpClick?.(event);

    } catch (error) {
      console.error('Help click error:', error);
    }
  }, [onHelpClick, validateSession, securityContext, user, analyticsEnabled, analytics]);

  /**
   * Enhanced settings icon click handler with security checks
   */
  const handleSettingsClick = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      // Validate current session
      await validateSession();

      // Check feature access
      if (!securityContext.allowSettings) {
        throw new Error('Settings access denied');
      }

      // Track interaction
      if (analyticsEnabled) {
        analytics.track('settings_button_clicked', {
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

      onSettingsClick?.(event);

    } catch (error) {
      console.error('Settings click error:', error);
    }
  }, [onSettingsClick, validateSession, securityContext, user, analyticsEnabled, analytics]);

  /**
   * Enhanced profile click handler with security validation
   */
  const handleProfileClick = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      // Validate current session
      await validateSession();

      setIsProfileOpen(prev => !prev);

      // Track interaction
      if (analyticsEnabled) {
        analytics.track('profile_button_clicked', {
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Profile click error:', error);
    }
  }, [validateSession, user, analyticsEnabled, analytics]);

  /**
   * Secure logout handler with session cleanup
   */
  const handleLogout = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      // Validate current session
      await validateSession();

      // Track logout
      if (analyticsEnabled) {
        analytics.track('user_logout', {
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

      await logout();
      setIsProfileOpen(false);

    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, validateSession, user, analyticsEnabled, analytics]);

  const headerContent = (
    <header 
      className={classNames('dashboard-header', className)}
      role="banner"
      aria-label="Dashboard header"
    >
      <div className="dashboard-header__content">
        <h1 className="dashboard-header__title">
          {title}
        </h1>

        <div className="dashboard-header__actions">
          {securityContext.allowHelp && (
            <Button
              variant="text"
              size="medium"
              onClick={handleHelpClick}
              ariaLabel="Help and documentation"
              className="dashboard-header__help-button"
            >
              <Icon 
                name="help"
                size="md"
                ariaHidden={true}
              />
            </Button>
          )}

          {securityContext.allowSettings && (
            <Button
              variant="text"
              size="medium"
              onClick={handleSettingsClick}
              ariaLabel="Settings"
              className="dashboard-header__settings-button"
            >
              <Icon 
                name="settings"
                size="md"
                ariaHidden={true}
              />
            </Button>
          )}

          <div className="dashboard-header__profile">
            <Button
              variant="text"
              size="medium"
              onClick={handleProfileClick}
              ariaLabel="User profile"
              ariaExpanded={isProfileOpen}
              ariaHaspopup="true"
              className="dashboard-header__profile-button"
            >
              <Avatar
                src={user?.profileImage}
                name={`${user?.firstName} ${user?.lastName}`}
                size="sm"
                ariaLabel={`${user?.firstName} ${user?.lastName}'s profile`}
              />
            </Button>

            {isProfileOpen && (
              <div 
                className="dashboard-header__profile-dropdown"
                role="menu"
                aria-label="Profile menu"
              >
                <div className="profile-dropdown__user-info">
                  <strong>{user?.firstName} {user?.lastName}</strong>
                  <span>{user?.email}</span>
                </div>
                <Button
                  variant="text"
                  size="medium"
                  onClick={handleLogout}
                  ariaLabel="Sign out"
                  className="profile-dropdown__logout-button"
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  return errorBoundary ? (
    <ErrorBoundary>
      {headerContent}
    </ErrorBoundary>
  ) : headerContent;
};

export default DashboardHeader;