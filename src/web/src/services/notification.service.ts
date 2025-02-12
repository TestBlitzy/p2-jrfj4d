/**
 * @fileoverview Enhanced notification service with real-time updates, batching, and offline support
 * @version 1.0.0
 */

import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotificationType } from '../types/notification.types';
import { NOTIFICATION_DISPLAY_DURATION } from '../constants/notification.constants';
import { webSocketService } from './websocket.service';

/**
 * Interface for connection status
 */
interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

/**
 * Enhanced service class for managing notifications with comprehensive features
 */
class NotificationService {
  // Observable streams for reactive state management
  private readonly notifications$ = new BehaviorSubject<Notification[]>([]);
  private readonly unreadCount$ = new BehaviorSubject<number>(0);
  private readonly connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0
  });

  // Internal state management
  private readonly activeSubscriptions: Function[] = [];
  private readonly offlineQueue: Notification[] = [];
  private readonly LOCAL_STORAGE_KEY = 'sip_notifications';
  private readonly BATCH_DELAY = 300; // ms

  constructor() {
    this.initializeService();
  }

  /**
   * Initializes the notification service with enhanced features
   */
  private initializeService(): void {
    // Initialize with cached notifications
    this.loadCachedNotifications();

    // Set up WebSocket subscription with reconnection logic
    this.setupWebSocketConnection();

    // Configure notification batching
    this.setupNotificationBatching();

    // Monitor connection status
    this.monitorConnection();
  }

  /**
   * Retrieves notifications with support for offline cache
   * @param forceRefresh Force refresh from server
   * @returns Promise resolving to notifications array
   */
  public async getNotifications(forceRefresh = false): Promise<Notification[]> {
    try {
      if (!this.connectionStatus$.value.isConnected && !forceRefresh) {
        return this.notifications$.value;
      }

      const response = await webSocketService.sendMessage('getNotifications', {}, {
        retry: true,
        priority: 'high'
      });

      this.updateNotifications(response);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return this.notifications$.value;
    }
  }

  /**
   * Adds a new notification with batching and offline support
   * @param notification Notification to add
   */
  public async addNotification(notification: Notification): Promise<void> {
    try {
      this.validateNotification(notification);

      if (!this.connectionStatus$.value.isConnected) {
        this.addToOfflineQueue(notification);
        return;
      }

      await webSocketService.sendMessage('addNotification', notification, {
        batch: true,
        compress: true,
        retry: true
      });

      this.updateLocalNotifications([...this.notifications$.value, notification]);
    } catch (error) {
      console.error('Error adding notification:', error);
      this.addToOfflineQueue(notification);
    }
  }

  /**
   * Marks a notification as read
   * @param notificationId ID of the notification to mark as read
   */
  public async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = this.notifications$.value.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );

      await webSocketService.sendMessage('markNotificationRead', { notificationId }, {
        batch: true,
        retry: true
      });

      this.updateLocalNotifications(notifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Clears all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await webSocketService.sendMessage('clearNotifications', {}, {
        priority: 'normal',
        retry: true
      });

      this.updateLocalNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Sets up WebSocket connection and handlers
   */
  private setupWebSocketConnection(): void {
    const unsubscribe = webSocketService.subscribe('notification', (data: any) => {
      if (data.type === NotificationType.SUCCESS) {
        this.handleNotificationReceived(data);
      }
    });

    this.activeSubscriptions.push(unsubscribe);
  }

  /**
   * Monitors WebSocket connection status
   */
  private monitorConnection(): void {
    webSocketService.subscribe('connection', (status: any) => {
      const newStatus: ConnectionStatus = {
        isConnected: status.connected,
        lastConnected: status.connected ? new Date() : this.connectionStatus$.value.lastConnected,
        reconnectAttempts: status.attempts || 0
      };

      this.connectionStatus$.next(newStatus);

      if (status.connected) {
        this.processOfflineQueue();
      }
    });
  }

  /**
   * Processes queued notifications when connection restores
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    try {
      await webSocketService.sendMessage('bulkAddNotifications', this.offlineQueue, {
        compress: true,
        retry: true
      });

      this.offlineQueue.length = 0;
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  /**
   * Sets up notification batching for performance
   */
  private setupNotificationBatching(): void {
    this.notifications$
      .pipe(
        debounceTime(this.BATCH_DELAY),
        distinctUntilChanged()
      )
      .subscribe(notifications => {
        this.persistNotifications(notifications);
        this.updateUnreadCount(notifications);
      });
  }

  /**
   * Updates local notifications and triggers persistence
   * @param notifications Updated notifications array
   */
  private updateLocalNotifications(notifications: Notification[]): void {
    this.notifications$.next(notifications);
  }

  /**
   * Validates notification object
   * @param notification Notification to validate
   */
  private validateNotification(notification: Notification): void {
    if (!notification.id || !notification.type || !notification.message) {
      throw new Error('Invalid notification format');
    }
  }

  /**
   * Adds notification to offline queue
   * @param notification Notification to queue
   */
  private addToOfflineQueue(notification: Notification): void {
    this.offlineQueue.push(notification);
    this.updateLocalNotifications([...this.notifications$.value, notification]);
  }

  /**
   * Handles incoming notification from WebSocket
   * @param notification Received notification
   */
  private handleNotificationReceived(notification: Notification): void {
    const notifications = [...this.notifications$.value, notification];
    this.updateLocalNotifications(notifications);
  }

  /**
   * Updates unread notification count
   * @param notifications Current notifications array
   */
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.read).length;
    this.unreadCount$.next(unreadCount);
  }

  /**
   * Loads cached notifications from local storage
   */
  private loadCachedNotifications(): void {
    try {
      const cached = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (cached) {
        const notifications = JSON.parse(cached);
        this.updateLocalNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading cached notifications:', error);
    }
  }

  /**
   * Persists notifications to local storage
   * @param notifications Notifications to persist
   */
  private persistNotifications(notifications: Notification[]): void {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error persisting notifications:', error);
    }
  }

  /**
   * Cleans up service resources
   */
  public destroy(): void {
    this.activeSubscriptions.forEach(unsubscribe => unsubscribe());
    this.activeSubscriptions.length = 0;
    this.notifications$.complete();
    this.unreadCount$.complete();
    this.connectionStatus$.complete();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();