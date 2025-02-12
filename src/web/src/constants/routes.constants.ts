/**
 * @fileoverview Route constants for the Sales & Intelligence Platform
 * Defines all application routes with type safety and proper organization
 * for protected and public routes.
 */

/**
 * Authentication and authorization related routes
 * Includes login, registration, password management, and MFA flows
 */
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  MFA_SETUP: '/auth/mfa-setup',
  MFA_VERIFY: '/auth/mfa-verify',
  LOGOUT: '/auth/logout',
} as const;

/**
 * Main dashboard and analytics routes
 * Core navigation paths for the application's primary features
 */
export const DASHBOARD_ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ANALYTICS: '/analytics',
  COMPETITOR_ANALYSIS: '/analytics/competitors',
  REVENUE_ANALYSIS: '/analytics/revenue',
  PERFORMANCE: '/analytics/performance',
  INSIGHTS: '/analytics/insights',
  REPORTS: '/analytics/reports',
} as const;

/**
 * Lead management related routes
 * Paths for lead tracking, scoring, and management features
 */
export const LEAD_ROUTES = {
  LIST: '/leads',
  DETAILS: '/leads/:id',
  CREATE: '/leads/create',
  EDIT: '/leads/:id/edit',
  SCORING: '/leads/:id/scoring',
  HISTORY: '/leads/:id/history',
  BULK_IMPORT: '/leads/import',
  EXPORT: '/leads/export',
} as const;

/**
 * Market intelligence and analysis routes
 * Paths for market research, competitor analysis, and industry insights
 */
export const MARKET_ROUTES = {
  INTELLIGENCE: '/market/intelligence',
  TRENDS: '/market/trends',
  COMPETITORS: '/market/competitors',
  COMPETITOR_DETAILS: '/market/competitors/:id',
  PRICE_ALERTS: '/market/price-alerts',
  INDUSTRY_ANALYSIS: '/market/industry',
  MARKET_SHARE: '/market/share',
  PREDICTIONS: '/market/predictions',
} as const;

/**
 * System and user settings routes
 * Configuration, profile management, and system administration paths
 */
export const SETTINGS_ROUTES = {
  PROFILE: '/settings/profile',
  INTEGRATIONS: '/settings/integrations',
  NOTIFICATIONS: '/settings/notifications',
  SECURITY: '/settings/security',
  API_KEYS: '/settings/api-keys',
  TEAM_MANAGEMENT: '/settings/team',
  BILLING: '/settings/billing',
  AUDIT_LOGS: '/settings/audit-logs',
} as const;

/**
 * Error and system status routes
 * Paths for error pages and system maintenance states
 */
export const ERROR_ROUTES = {
  NOT_FOUND: '/404',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',
  MAINTENANCE: '/maintenance',
} as const;

// Type definitions for route constants
type ValueOf<T> = T[keyof T];

export type AuthRoute = ValueOf<typeof AUTH_ROUTES>;
export type DashboardRoute = ValueOf<typeof DASHBOARD_ROUTES>;
export type LeadRoute = ValueOf<typeof LEAD_ROUTES>;
export type MarketRoute = ValueOf<typeof MARKET_ROUTES>;
export type SettingsRoute = ValueOf<typeof SETTINGS_ROUTES>;
export type ErrorRoute = ValueOf<typeof ERROR_ROUTES>;

// Combined route type for type-safe route handling
export type AppRoute = 
  | AuthRoute 
  | DashboardRoute 
  | LeadRoute 
  | MarketRoute 
  | SettingsRoute 
  | ErrorRoute;