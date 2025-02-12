import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';

import { DASHBOARD_ROUTES, LEAD_ROUTES, MARKET_ROUTES } from '../../constants/routes.constants';
import Icon from './Icon';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';

// Interface for menu items with security and accessibility features
interface MenuItem {
  label: string;
  path: string;
  icon: string;
  requiresAuth: boolean;
  requiredRoles: UserRole[];
  ariaLabel?: string;
  testId?: string;
}

// Props interface for the Sidebar component
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  ariaLabel?: string;
}

// Function to generate secure menu items based on user authentication and roles
const getMenuItems = (user: User | null, roles: string[]): MenuItem[] => {
  const baseItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: DASHBOARD_ROUTES.DASHBOARD,
      icon: 'menu',
      requiresAuth: true,
      requiredRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.ADMIN],
      ariaLabel: 'Navigate to dashboard',
      testId: 'sidebar-dashboard'
    },
    {
      label: 'Analytics',
      path: DASHBOARD_ROUTES.ANALYTICS,
      icon: 'financial',
      requiresAuth: true,
      requiredRoles: [UserRole.MANAGER, UserRole.ADMIN],
      ariaLabel: 'View analytics',
      testId: 'sidebar-analytics'
    },
    {
      label: 'Leads',
      path: LEAD_ROUTES.LIST,
      icon: 'add',
      requiresAuth: true,
      requiredRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.ADMIN],
      ariaLabel: 'Manage leads',
      testId: 'sidebar-leads'
    },
    {
      label: 'Market Intelligence',
      path: MARKET_ROUTES.INTELLIGENCE,
      icon: 'info',
      requiresAuth: true,
      requiredRoles: [UserRole.MANAGER, UserRole.ADMIN],
      ariaLabel: 'View market intelligence',
      testId: 'sidebar-market'
    }
  ];

  // Filter items based on authentication and role requirements
  return baseItems.filter(item => {
    if (item.requiresAuth && !user) return false;
    if (item.requiredRoles.length === 0) return true;
    return item.requiredRoles.some(role => roles.includes(role));
  });
};

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  className,
  ariaLabel = 'Main navigation'
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Get authorized menu items
  const menuItems = getMenuItems(user, user?.role ? [user.role] : []);

  // Handle secure navigation
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Handle touch gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Swipe threshold of 50px
    if (Math.abs(diff) > 50) {
      onToggle();
    }

    setTouchStart(null);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  // Focus trap for accessibility
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || isCollapsed) return;

    const focusableElements = sidebar.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    sidebar.addEventListener('keydown', handleTabKey);
    return () => sidebar.removeEventListener('keydown', handleTabKey);
  }, [isCollapsed]);

  return (
    <nav
      ref={sidebarRef}
      className={classNames(
        'sidebar',
        {
          'sidebar--collapsed': isCollapsed,
          'sidebar--expanded': !isCollapsed
        },
        className
      )}
      aria-label={ariaLabel}
      aria-expanded={!isCollapsed}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon
          name={isCollapsed ? 'chevronRight' : 'chevronLeft'}
          size="sm"
          aria-hidden="true"
        />
      </button>

      <ul className="sidebar__menu" role="menu">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className="sidebar__menu-item"
            role="none"
          >
            <button
              className={classNames('sidebar__menu-button', {
                'sidebar__menu-button--active': location.pathname === item.path
              })}
              onClick={() => handleNavigation(item.path)}
              aria-label={item.ariaLabel}
              data-testid={item.testId}
              role="menuitem"
            >
              <Icon
                name={item.icon}
                size={isCollapsed ? 'md' : 'sm'}
                className="sidebar__menu-icon"
                aria-hidden="true"
              />
              {!isCollapsed && (
                <span className="sidebar__menu-label">{item.label}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;