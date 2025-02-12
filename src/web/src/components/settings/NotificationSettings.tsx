/**
 * @fileoverview NotificationSettings component for managing user notification preferences
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Switch,
  FormGroup,
  FormControlLabel,
  Typography,
  Paper,
  Box,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';

import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  isNotificationCategory,
  isNotificationPriority
} from '../../types/notification.types';

import { useNotification } from '../../hooks/useNotification';
import {
  NOTIFICATION_DISPLAY_DURATION,
  NOTIFICATION_POSITION
} from '../../constants/notification.constants';

interface NotificationPreference {
  enabled: boolean;
  priority: NotificationPriority;
  displayDuration: number;
}

interface NotificationSettingsState {
  [key in NotificationCategory]: NotificationPreference;
}

const DEFAULT_PREFERENCES: NotificationSettingsState = {
  [NotificationCategory.LEAD]: {
    enabled: true,
    priority: NotificationPriority.HIGH,
    displayDuration: NOTIFICATION_DISPLAY_DURATION[NotificationPriority.HIGH]
  },
  [NotificationCategory.ANALYTICS]: {
    enabled: true,
    priority: NotificationPriority.MEDIUM,
    displayDuration: NOTIFICATION_DISPLAY_DURATION[NotificationPriority.MEDIUM]
  },
  [NotificationCategory.MARKET]: {
    enabled: true,
    priority: NotificationPriority.MEDIUM,
    displayDuration: NOTIFICATION_DISPLAY_DURATION[NotificationPriority.MEDIUM]
  },
  [NotificationCategory.SYSTEM]: {
    enabled: true,
    priority: NotificationPriority.HIGH,
    displayDuration: NOTIFICATION_DISPLAY_DURATION[NotificationPriority.HIGH]
  }
};

const NotificationSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  // Local state for notification preferences
  const [preferences, setPreferences] = useState<NotificationSettingsState>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // WebSocket connection status from Redux store
  const wsStatus = useSelector(selectWebSocketStatus);
  const isConnected = wsStatus === 'connected';

  // Memoized category labels for better performance
  const categoryLabels = useMemo(() => ({
    [NotificationCategory.LEAD]: 'Lead Updates',
    [NotificationCategory.ANALYTICS]: 'Analytics Insights',
    [NotificationCategory.MARKET]: 'Market Intelligence',
    [NotificationCategory.SYSTEM]: 'System Notifications'
  }), []);

  /**
   * Handles toggling notification preferences with optimistic updates
   */
  const handleToggle = useCallback(async (category: NotificationCategory) => {
    try {
      setIsDirty(true);
      const currentPreference = preferences[category];
      const newPreferences = {
        ...preferences,
        [category]: {
          ...currentPreference,
          enabled: !currentPreference.enabled
        }
      };

      // Optimistic update
      setPreferences(newPreferences);

      // Persist changes
      await notificationService.updatePreferences(newPreferences);

      showNotification(
        NotificationType.SUCCESS,
        `${categoryLabels[category]} notifications ${currentPreference.enabled ? 'disabled' : 'enabled'}`,
        NotificationPriority.LOW
      );
    } catch (error) {
      // Rollback on error
      setPreferences(preferences);
      setError('Failed to update notification preferences');
      showNotification(
        NotificationType.ERROR,
        'Failed to update notification settings',
        NotificationPriority.HIGH
      );
    }
  }, [preferences, categoryLabels, showNotification]);

  /**
   * Handles changing notification priority with validation
   */
  const handlePriorityChange = useCallback(async (
    category: NotificationCategory,
    priority: NotificationPriority
  ) => {
    try {
      if (!isNotificationPriority(priority)) {
        throw new Error('Invalid notification priority');
      }

      setIsDirty(true);
      const newPreferences = {
        ...preferences,
        [category]: {
          ...preferences[category],
          priority,
          displayDuration: NOTIFICATION_DISPLAY_DURATION[priority]
        }
      };

      // Optimistic update
      setPreferences(newPreferences);

      // Persist changes
      await notificationService.updatePreferences(newPreferences);

      showNotification(
        NotificationType.SUCCESS,
        `Priority updated for ${categoryLabels[category]}`,
        NotificationPriority.LOW
      );
    } catch (error) {
      // Rollback on error
      setPreferences(preferences);
      setError('Failed to update notification priority');
      showNotification(
        NotificationType.ERROR,
        'Failed to update priority settings',
        NotificationPriority.HIGH
      );
    }
  }, [preferences, categoryLabels, showNotification]);

  /**
   * Loads saved preferences on component mount
   */
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const savedPreferences = await notificationService.getPreferences();
        setPreferences(savedPreferences || DEFAULT_PREFERENCES);
      } catch (error) {
        setError('Failed to load notification preferences');
        showNotification(
          NotificationType.ERROR,
          'Failed to load notification settings',
          NotificationPriority.HIGH
        );
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [showNotification]);

  /**
   * Renders priority selection for a notification category
   */
  const renderPrioritySelect = (category: NotificationCategory) => (
    <Select
      value={preferences[category].priority}
      onChange={(e) => handlePriorityChange(category, e.target.value as NotificationPriority)}
      disabled={!preferences[category].enabled || !isConnected}
      size="small"
      aria-label={`Priority for ${categoryLabels[category]}`}
    >
      {Object.values(NotificationPriority).map((priority) => (
        <MenuItem key={priority} value={priority}>
          {priority.charAt(0) + priority.slice(1).toLowerCase()}
        </MenuItem>
      ))}
    </Select>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Notification Preferences
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some settings may be unavailable while offline
        </Alert>
      )}

      <FormGroup>
        {Object.values(NotificationCategory).map((category) => (
          <Box key={category} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences[category].enabled}
                  onChange={() => handleToggle(category)}
                  disabled={!isConnected}
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography>{categoryLabels[category]}</Typography>
                  {renderPrioritySelect(category)}
                </Box>
              }
            />
            <Divider sx={{ mt: 1 }} />
          </Box>
        ))}
      </FormGroup>

      {isDirty && (
        <Typography variant="caption" color="text.secondary">
          Changes are saved automatically
        </Typography>
      )}
    </Paper>
  );
};

export default NotificationSettings;