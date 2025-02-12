/**
 * @fileoverview TypeScript type definitions for user settings, integration configurations,
 * notification preferences, and theme settings for the Sales & Intelligence Platform frontend
 * @version 1.0.0
 */

import { ThemeMode } from './common.types';
import { NotificationCategory } from './notification.types';
import { UserRole } from './auth.types';

/**
 * Enum for supported third-party service integrations
 */
export enum IntegrationType {
  SALESFORCE = 'SALESFORCE',
  HUBSPOT = 'HUBSPOT',
  LINKEDIN_SALES_NAVIGATOR = 'LINKEDIN_SALES_NAVIGATOR',
  GMAIL = 'GMAIL',
  SENDGRID = 'SENDGRID',
  SLACK = 'SLACK'
}

/**
 * Enum for integration connection status
 */
export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  PENDING = 'PENDING'
}

/**
 * Interface for third-party service integration configuration
 */
export interface IntegrationConfig {
  /** Type of integration service */
  type: IntegrationType;
  
  /** Current connection status */
  status: IntegrationStatus;
  
  /** Integration credentials (API keys, tokens, etc.) */
  credentials: Record<string, string>;
  
  /** Timestamp of last successful data sync */
  lastSync: Date;
}

/**
 * Interface for user notification preferences
 */
export interface NotificationPreferences {
  /** Enabled/disabled state for each notification category */
  categories: Record<NotificationCategory, boolean>;
  
  /** Flag for email notifications */
  emailNotifications: boolean;
  
  /** Flag for browser push notifications */
  pushNotifications: boolean;
  
  /** Flag for Slack notifications */
  slackNotifications: boolean;
}

/**
 * Interface for display and localization settings
 */
export interface DisplaySettings {
  /** User's preferred theme mode */
  theme: ThemeMode;
  
  /** User's preferred language code (e.g., 'en-US') */
  language: string;
  
  /** User's timezone (e.g., 'America/New_York') */
  timezone: string;
  
  /** Preferred date format (e.g., 'MM/DD/YYYY') */
  dateFormat: string;
}

/**
 * Main interface for user settings configuration
 */
export interface UserSettings {
  /** Unique identifier for the user */
  userId: string;
  
  /** User's role for access control */
  role: UserRole;
  
  /** Array of configured integrations */
  integrations: IntegrationConfig[];
  
  /** User's notification preferences */
  notificationPreferences: NotificationPreferences;
  
  /** User's display and localization settings */
  displaySettings: DisplaySettings;
}

/**
 * Interface for settings state management in Redux
 */
export interface SettingsState {
  /** Current user settings */
  settings: UserSettings;
  
  /** Loading state flag */
  loading: boolean;
  
  /** Error message if any */
  error: string | null;
}