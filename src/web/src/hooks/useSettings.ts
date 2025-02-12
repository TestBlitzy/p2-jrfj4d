/**
 * Custom React hook for managing user settings, integration configurations,
 * and notification preferences in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  UserSettings,
  IntegrationConfig,
  NotificationPreferences,
  DisplaySettings,
  IntegrationType,
  IntegrationStatus
} from '../types/settings.types';
import { settingsService } from '../services/settings.service';
import {
  fetchUserSettings,
  updateSettings,
  updateIntegrationConfig,
  updateThemeSettings,
  updateNotificationPreferences,
  selectSettings,
  selectSettingsError,
  selectSettingsLoading,
  selectCacheStatus,
  invalidateCache
} from '../redux/slices/settingsSlice';
import { ThemeMode } from '../types/common.types';

// Constants for settings management
const SETTINGS_SYNC_INTERVAL = 300000; // 5 minutes
const INTEGRATION_HEALTH_CHECK_INTERVAL = 60000; // 1 minute

/**
 * Custom hook for comprehensive settings management
 * @returns Object containing settings state and management functions
 */
export const useSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const error = useSelector(selectSettingsError);
  const loading = useSelector(selectSettingsLoading);
  const cacheStatus = useSelector(selectCacheStatus);

  /**
   * Initialize settings and setup real-time sync
   */
  useEffect(() => {
    const userId = settings.userId;
    if (userId) {
      // Initial settings fetch
      dispatch(fetchUserSettings(userId));

      // Setup periodic sync
      const syncInterval = setInterval(() => {
        dispatch(fetchUserSettings(userId));
      }, SETTINGS_SYNC_INTERVAL);

      // Setup integration health monitoring
      const healthCheckInterval = setInterval(() => {
        settings.integrations.forEach(async (integration) => {
          try {
            const result = await settingsService.testIntegrationConnection(
              integration.type,
              integration
            );
            if (!result.success) {
              console.warn(`Integration health check failed for ${integration.type}`);
            }
          } catch (error) {
            console.error(`Integration health check error for ${integration.type}:`, error);
          }
        });
      }, INTEGRATION_HEALTH_CHECK_INTERVAL);

      return () => {
        clearInterval(syncInterval);
        clearInterval(healthCheckInterval);
      };
    }
  }, [dispatch, settings.userId]);

  /**
   * Update user settings with optimistic updates and error handling
   */
  const updateUserSettings = useCallback(async (
    newSettings: Partial<UserSettings>
  ): Promise<void> => {
    try {
      if (!settings.userId) throw new Error('User ID not found');
      
      await dispatch(updateSettings({
        userId: settings.userId,
        settings: newSettings
      })).unwrap();
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, [dispatch, settings.userId]);

  /**
   * Update integration configuration with connection testing
   */
  const updateIntegration = useCallback(async (
    config: IntegrationConfig
  ): Promise<void> => {
    try {
      if (!settings.userId) throw new Error('User ID not found');

      // Test connection before updating
      const testResult = await settingsService.testIntegrationConnection(
        config.type,
        config
      );

      if (!testResult.success) {
        throw new Error(`Integration test failed: ${testResult.message}`);
      }

      await dispatch(updateIntegrationConfig({
        userId: settings.userId,
        config
      })).unwrap();
    } catch (error) {
      console.error('Failed to update integration:', error);
      throw error;
    }
  }, [dispatch, settings.userId]);

  /**
   * Update notification preferences with validation
   */
  const updateNotifications = useCallback(async (
    preferences: NotificationPreferences
  ): Promise<void> => {
    try {
      if (!settings.userId) throw new Error('User ID not found');

      dispatch(updateNotificationPreferences(preferences));
      await updateUserSettings({
        notificationPreferences: preferences
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }, [dispatch, settings.userId, updateUserSettings]);

  /**
   * Update theme settings with system preference detection
   */
  const updateTheme = useCallback(async (
    theme: ThemeMode
  ): Promise<void> => {
    try {
      if (!settings.userId) throw new Error('User ID not found');

      const newDisplaySettings: DisplaySettings = {
        ...settings.displaySettings,
        theme
      };

      dispatch(updateThemeSettings(newDisplaySettings));
      await updateUserSettings({
        displaySettings: newDisplaySettings
      });
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  }, [dispatch, settings, updateUserSettings]);

  /**
   * Test integration connection status
   */
  const testIntegration = useCallback(async (
    type: IntegrationType,
    config: IntegrationConfig
  ): Promise<boolean> => {
    try {
      const result = await settingsService.testIntegrationConnection(type, config);
      return result.success;
    } catch (error) {
      console.error('Integration test failed:', error);
      return false;
    }
  }, []);

  /**
   * Clear settings cache and force refresh
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      dispatch(invalidateCache());
      if (settings.userId) {
        await dispatch(fetchUserSettings(settings.userId)).unwrap();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }, [dispatch, settings.userId]);

  return {
    // State
    settings,
    loading,
    error,
    cacheStatus,

    // Core functions
    updateSettings: updateUserSettings,
    updateIntegration,
    updateNotifications,
    updateTheme,
    testIntegration,
    clearCache
  };
};