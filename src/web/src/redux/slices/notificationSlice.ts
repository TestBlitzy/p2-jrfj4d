/**
 * @fileoverview Redux slice for managing notification state in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory,
  Notification, 
  NotificationState,
  WebSocketStatus 
} from '../../types/notification.types';
import { 
  NOTIFICATION_MAX_COUNT, 
  NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_RETRY_LIMIT 
} from '../../constants/notification.constants';
import notificationService from '../../services/notification.service';

// Initial state with offline support and WebSocket status
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  wsStatus: 'disconnected',
  offlineQueue: [],
  retryCount: 0,
  lastSync: null
};

/**
 * Async thunk for fetching notifications with retry logic and offline support
 */
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue, getState }) => {
    try {
      const response = await notificationService.getNotifications();
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for marking notifications as read with optimistic updates
 */
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { dispatch, rejectWithValue }) => {
    try {
      await notificationService.markAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Notification slice with comprehensive state management
 */
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add new notification with priority handling
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = action.payload;
      state.notifications = [
        ...state.notifications,
        notification
      ].sort((a, b) => {
        // Sort by priority and timestamp
        if (a.priority !== b.priority) {
          return a.priority === NotificationPriority.HIGH ? -1 : 1;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }).slice(0, NOTIFICATION_MAX_COUNT);
      
      if (!notification.read) {
        state.unreadCount += 1;
      }
    },

    // Remove notification with cleanup
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.offlineQueue = [];
    },

    // Update WebSocket connection status
    updateWebSocketStatus: (state, action: PayloadAction<WebSocketStatus>) => {
      state.wsStatus = action.payload;
      if (action.payload === 'connected') {
        state.retryCount = 0;
      }
    },

    // Add to offline queue when disconnected
    addToOfflineQueue: (state, action: PayloadAction<Notification>) => {
      state.offlineQueue.push(action.payload);
    },

    // Process offline queue when connection restores
    processOfflineQueue: (state) => {
      if (state.wsStatus === 'connected' && state.offlineQueue.length > 0) {
        const batchSize = NOTIFICATION_BATCH_SIZE;
        const batch = state.offlineQueue.slice(0, batchSize);
        state.notifications = [...state.notifications, ...batch]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, NOTIFICATION_MAX_COUNT);
        state.offlineQueue = state.offlineQueue.slice(batchSize);
        state.unreadCount += batch.filter(n => !n.read).length;
      }
    },

    // Update last sync timestamp
    updateLastSync: (state) => {
      state.lastSync = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications handlers
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        if (state.retryCount < NOTIFICATION_RETRY_LIMIT) {
          state.retryCount += 1;
        }
      })
      // Mark as read handlers
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  }
});

// Export actions
export const {
  addNotification,
  removeNotification,
  clearNotifications,
  updateWebSocketStatus,
  addToOfflineQueue,
  processOfflineQueue,
  updateLastSync
} = notificationSlice.actions;

// Memoized selectors
export const selectNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationState }) => 
  state.notifications.unreadCount;

export const selectWebSocketStatus = (state: { notifications: NotificationState }) => 
  state.notifications.wsStatus;

export const selectOfflineQueue = (state: { notifications: NotificationState }) => 
  state.notifications.offlineQueue;

// Export reducer
export default notificationSlice.reducer;