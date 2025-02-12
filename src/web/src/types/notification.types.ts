/**
 * @fileoverview TypeScript type definitions for the notification system of the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { ApiResponse } from './common.types';

/**
 * Enum defining different types of notifications
 */
export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

/**
 * Enum defining priority levels for notifications
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Enum defining different categories of notifications
 */
export enum NotificationCategory {
  LEAD = 'LEAD',
  ANALYTICS = 'ANALYTICS',
  MARKET = 'MARKET',
  SYSTEM = 'SYSTEM'
}

/**
 * Interface defining the structure of a notification
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  
  /** Type of notification (success, error, warning, info) */
  type: NotificationType;
  
  /** Priority level of the notification */
  priority: NotificationPriority;
  
  /** Category the notification belongs to */
  category: NotificationCategory;
  
  /** Short title describing the notification */
  title: string;
  
  /** Detailed message content of the notification */
  message: string;
  
  /** Timestamp when the notification was created */
  timestamp: Date;
  
  /** Flag indicating if the notification has been read */
  read: boolean;
  
  /** Optional URL for action associated with the notification */
  actionUrl?: string;
}

/**
 * Interface for notification state management in Redux
 */
export interface NotificationState {
  /** Array of all notifications */
  notifications: Notification[];
  
  /** Count of unread notifications */
  unreadCount: number;
  
  /** Loading state flag */
  loading: boolean;
  
  /** Error message if any */
  error: string | null;
}

/**
 * Interface for API responses containing notification data
 * Extends the common ApiResponse type with Notification array
 */
export interface NotificationResponse extends ApiResponse<Notification[]> {
  /** Array of notification objects */
  data: Notification[];
  
  /** Success status of the response */
  success: boolean;
  
  /** Response message */
  message: string;
}

/**
 * Type guard to check if a value is a valid NotificationType
 */
export const isNotificationType = (value: any): value is NotificationType => {
  return Object.values(NotificationType).includes(value);
};

/**
 * Type guard to check if a value is a valid NotificationPriority
 */
export const isNotificationPriority = (value: any): value is NotificationPriority => {
  return Object.values(NotificationPriority).includes(value);
};

/**
 * Type guard to check if a value is a valid NotificationCategory
 */
export const isNotificationCategory = (value: any): value is NotificationCategory => {
  return Object.values(NotificationCategory).includes(value);
};