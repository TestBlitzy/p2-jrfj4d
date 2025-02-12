/**
 * @fileoverview Constants for notification system configuration in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { NotificationType, NotificationPriority } from '../types/notification.types';

/**
 * Display duration in milliseconds for different notification priority levels
 */
export const NOTIFICATION_DISPLAY_DURATION = {
  [NotificationPriority.HIGH]: 10000,   // 10 seconds for high priority
  [NotificationPriority.MEDIUM]: 7000,  // 7 seconds for medium priority
  [NotificationPriority.LOW]: 5000      // 5 seconds for low priority
} as const;

/**
 * Animation duration in milliseconds for notification transitions
 */
export const NOTIFICATION_ANIMATION_DURATION = 300;

/**
 * Maximum number of notifications to display simultaneously
 */
export const NOTIFICATION_MAX_COUNT = 5;

/**
 * Color scheme for different notification types
 * Following Material Design color palette for consistency
 */
export const NOTIFICATION_COLORS = {
  [NotificationType.SUCCESS]: '#4CAF50', // Material Green
  [NotificationType.ERROR]: '#F44336',   // Material Red
  [NotificationType.WARNING]: '#FF9800', // Material Orange
  [NotificationType.INFO]: '#2196F3'     // Material Blue
} as const;

/**
 * Icon names for different notification types
 * Using consistent Material Icons naming convention
 */
export const NOTIFICATION_ICONS = {
  [NotificationType.SUCCESS]: 'check-circle',
  [NotificationType.ERROR]: 'error-circle',
  [NotificationType.WARNING]: 'warning',
  [NotificationType.INFO]: 'info-circle'
} as const;

/**
 * Z-index for notification stack
 * Set high to ensure notifications appear above other UI elements
 */
export const NOTIFICATION_Z_INDEX = 9999;

/**
 * Available positions for notification placement
 */
export const NOTIFICATION_POSITION = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left'
} as const;

/**
 * Type definitions for notification positions
 */
export type NotificationPosition = typeof NOTIFICATION_POSITION[keyof typeof NOTIFICATION_POSITION];

/**
 * Default notification configuration
 */
export const DEFAULT_NOTIFICATION_CONFIG = {
  position: NOTIFICATION_POSITION.TOP_RIGHT,
  animationDuration: NOTIFICATION_ANIMATION_DURATION,
  maxCount: NOTIFICATION_MAX_COUNT,
  zIndex: NOTIFICATION_Z_INDEX
} as const;