import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom'; // ^6.0.0
import classNames from 'classnames'; // ^2.3.2

import Icon from '../common/Icon';
import Avatar from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { DASHBOARD_ROUTES } from '../../constants/routes.constants';
import { UserRole } from '../../types/auth.types';
import { BaseComponentProps } from '../types/common.types';

// Enhanced props interface with security configuration
interface NavBarProps extends BaseComponentProps {
  securityConfig?: {
    enableRBAC: boolean;
    sessionTimeout: number;
    secureRoutes: string[];
  };
  mobileBreakpoint?: number;
}

// Type-safe navigation item structure
interface NavItem {
  label: string;
  path: string;
  icon: string;
  requiredRole: UserRole[];
  ariaLabel: string;
}

// Main navigation items with role-based access
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: DASHBOARD_ROUTES.DASHBOARD,
    icon: 'menu',
    requiredRole: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP],
    ariaLabel: 'Navigate to dashboard'
  },
  {
    label: 'Analytics',
    path: DASHBOARD_ROUTES.ANALYTICS,
    icon: 'financial',
    requiredRole: [UserRole.ADMIN, UserRole.MANAGER],
    ariaLabel: 'View analytics'
  },
  {
    label: 'Leads',
    path: '/leads',
    icon: 'add',
    requiredRole: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP],
    ariaLabel: 'Manage leads'
  },
  {
    label: 'Intelligence',
    path: '/market/intelligence',
    icon: 'info',
    requiredRole: [UserRole.ADMIN, UserRole.MANAGER],
    ariaLabel: 'Market intelligence'
  }
];

/**
 * Enhanced navigation bar component with security, accessibility, and mobile optimization
 */
const NavBar: React.FC<NavBarProps> = ({
  className,
  securityConfig = {
    enableRBAC: true,
    sessionTimeout: 1800,
    secureRoutes: []
  },
  mobileBreakpoint = 768,
  ...props
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Memoized filtered navigation items based on user role
  const authorizedNavItems = useMemo(() => {
    if (!securityConfig.enableRBAC || !user) return [];
    return NAV_ITEMS.filter(item => item.requiredRole.includes(user.role));
  }, [user, securityConfig.enableRBAC]);

  // Enhanced secure logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsProfileMenuOpen(false);
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  // Mobile menu handler with accessibility
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
    setIsProfileMenuOpen(false);
  }, []);

  // Profile menu handler with security
  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(prev => !prev);
    setIsMobileMenuOpen(false);
  }, []);

  // Active route checker with security validation
  const isActiveRoute = useCallback((path: string): boolean => {
    if (securityConfig.secureRoutes.includes(path) && !user) {
      return false;
    }
    return location.pathname === path;
  }, [location.pathname, user, securityConfig.secureRoutes]);

  // Session monitoring for security
  useEffect(() => {
    let sessionTimer: NodeJS.Timeout;
    
    if (user && securityConfig.sessionTimeout) {
      sessionTimer = setTimeout(() => {
        handleLogout();
      }, securityConfig.sessionTimeout * 1000);
    }

    return () => {
      if (sessionTimer) {
        clearTimeout(sessionTimer);
      }
    };
  }, [user, securityConfig.sessionTimeout, handleLogout]);

  // Keyboard navigation handler
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsMobileMenuOpen(false);
      setIsProfileMenuOpen(false);
    }
  }, []);

  return (
    <nav
      className={classNames(
        'fixed top-0 w-full bg-white shadow-md z-50',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
      onKeyDown={handleKeyPress}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-xl font-bold" aria-label="Home">
              Sales & Intelligence
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {authorizedNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={classNames(
                  'px-3 py-2 rounded-md text-sm font-medium',
                  isActiveRoute(item.path)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                aria-label={item.ariaLabel}
                aria-current={isActiveRoute(item.path) ? 'page' : undefined}
              >
                <div className="flex items-center space-x-2">
                  <Icon name={item.icon} size="sm" aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* User profile and mobile menu */}
          <div className="flex items-center">
            {user && (
              <div className="relative ml-3">
                <button
                  className="flex items-center space-x-2"
                  onClick={toggleProfileMenu}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <Avatar
                    src={user.profileImage}
                    name={`${user.firstName} ${user.lastName}`}
                    size="sm"
                  />
                  <span className="hidden md:block">{user.firstName}</span>
                </button>

                {/* Profile dropdown */}
                {isProfileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="py-1" role="none">
                      <Link
                        to="/settings/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden ml-4 p-2"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
            >
              <Icon
                name={isMobileMenuOpen ? 'close' : 'menu'}
                size="md"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden"
          id="mobile-menu"
          role="menu"
          aria-label="Mobile navigation"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            {authorizedNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={classNames(
                  'block px-3 py-2 rounded-md text-base font-medium',
                  isActiveRoute(item.path)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                aria-label={item.ariaLabel}
                aria-current={isActiveRoute(item.path) ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <Icon name={item.icon} size="sm" aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;