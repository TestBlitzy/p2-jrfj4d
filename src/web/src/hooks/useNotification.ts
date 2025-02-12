/**
 * @fileoverview Custom React hook for managing notifications in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  Notification,
  NotificationState
} from '../types/notification.types';
import {
  NOTIFICATION_DISPLAY_DURATION,
  NOTIFICATION_MAX_COUNT,
  NOTIFICATION_POSITION
} from '../constants/notification.constants';
import notificationService from '../services/notification.service';
import {
  addNotification,
  removeNotification,
  markAsRead,
  clearAll,
  selectNotifications,
  selectUnreadCount,
  selectWebSocketStatus
} from '../redux/slices/notificationSlice';

/**
 * Custom hook for managing notifications with real-time updates and offline support
 */
export const useNotification = () => {
  const dispatch = useDispatch();
  const dismissTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Redux selectors
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const wsStatus = useSelector(selectWebSocketStatus);
  const isConnected = wsStatus === 'connected';

  /**
   * Shows a new notification with priority-based auto-dismissal
   */
  const showNotification = useCallback(async (
    type: NotificationType,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    category: NotificationCategory = NotificationCategory.SYSTEM
  ): Promise<void> => {
    try {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        priority,
        category,
        timestamp: new Date(),
        read: false
      };

      // Add notification through service and Redux
      await notificationService.addNotification(notification);
      dispatch(addNotification(notification));

      // Set up auto-dismiss timer based on priority
      if (priority !== NotificationPriority.HIGH) {
        const timer = setTimeout(() => {
          dismissNotification(notification.id);
        }, NOTIFICATION_DISPLAY_DURATION[priority]);
        dismissTimersRef.current.set(notification.id, timer);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [dispatch]);

  /**
   * Dismisses a notification and cleans up associated timer
   */
  const dismissNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      // Clear dismiss timer if exists
      const timer = dismissTimersRef.current.get(notificationId);
      if (timer) {
        clearTimeout(timer);
        dismissTimersRef.current.delete(notificationId);
      }

      // Remove notification through service and Redux
      await notificationService.removeNotification(notificationId);
      dispatch(removeNotification(notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [dispatch]);

  /**
   * Marks a notification as read with optimistic updates
   */
  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      // Optimistically update UI
      dispatch(markAsRead(notificationId));
      
      // Update through service
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Rollback could be implemented here if needed
    }
  }, [dispatch]);

  /**
   * Clears all notifications with comprehensive cleanup
   */
  const clearAllNotifications = useCallback(async (): Promise<void> => {
    try {
      // Clear all dismiss timers
      dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
      dismissTimersRef.current.clear();

      // Clear through service and Redux
      await notificationService.clearAllNotifications();
      dispatch(clearAll());
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [dispatch]);

  /**
   * Sets up notification service subscription and cleanup
   */
  useEffect(() => {
    const subscription = notificationService.notificationState$.subscribe(
      (state: NotificationState) => {
        if (state.notifications.length > NOTIFICATION_MAX_COUNT) {
          const oldestNotification = state.notifications[state.notifications.length - 1];
          dismissNotification(oldestNotification.id);
        }
      }
    );

    return () => {
      // Cleanup timers and subscription on unmount
      dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
      dismissTimersRef.current.clear();
      subscription.unsubscribe();
    };
  }, [dismissNotification]);

  return {
    // State
    notifications,
    unreadCount,
    loading: false,
    error: null,
    isConnected,

    // Actions
    showNotification,
    dismissNotification,
    markNotificationAsRead,
    clearAllNotifications,

    // Constants
    NOTIFICATION_POSITION,
    NOTIFICATION_DISPLAY_DURATION
  };
};

export default useNotification;