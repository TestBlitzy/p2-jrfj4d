import React, { useState, useCallback, useEffect } from 'react';
import { Container, Paper, Tabs, Tab, Skeleton, Alert, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import IntegrationSettings from '../../components/settings/IntegrationSettings';
import NotificationSettings from '../../components/settings/NotificationSettings';
import ProfileSettings from '../../components/settings/ProfileSettings';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import Toast from '../../components/common/Toast';
import useAnalytics from '../../hooks/useAnalytics';
import { useSettings } from '../../hooks/useSettings';
import { NotificationType, NotificationPriority } from '../../types/notification.types';
import { LoadingState } from '../../types/common.types';

// Constants for settings management
const UPDATE_DEBOUNCE_MS = 500;
const MAX_RETRY_ATTEMPTS = 3;

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile Settings', ariaLabel: 'Profile settings tab' },
  { id: 'integrations', label: 'Integrations', ariaLabel: 'Integrations settings tab' },
  { id: 'notifications', label: 'Notifications', ariaLabel: 'Notification settings tab' }
] as const;

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);

  const { settings, loading, updateSettings, clearCache } = useSettings();
  const { trackEvent } = useAnalytics('settings', '30d', { enableRealTime: false });

  // Handle tab changes with analytics tracking
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    trackEvent('settings_tab_change', {
      from: SETTINGS_TABS[activeTab].id,
      to: SETTINGS_TABS[newValue].id
    });
  }, [activeTab, trackEvent]);

  // Handle settings updates with error handling and retries
  const handleSettingsUpdate = useCallback(async (
    section: string,
    updates: Partial<typeof settings>
  ) => {
    let retryCount = 0;
    setUpdateStatus(LoadingState.LOADING);
    setError(null);

    const attemptUpdate = async (): Promise<void> => {
      try {
        await updateSettings(updates);
        setUpdateStatus(LoadingState.SUCCESS);
        trackEvent('settings_update_success', { section });
      } catch (err) {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, UPDATE_DEBOUNCE_MS * retryCount));
          return attemptUpdate();
        }
        setError(err instanceof Error ? err.message : 'Failed to update settings');
        setUpdateStatus(LoadingState.ERROR);
        trackEvent('settings_update_error', { section, error: err });
      }
    };

    await attemptUpdate();
  }, [updateSettings, trackEvent]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        setError(error.message);
        trackEvent('settings_error', { error: error.message });
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Settings navigation tabs"
            variant="fullWidth"
          >
            {SETTINGS_TABS.map((tab, index) => (
              <Tab
                key={tab.id}
                label={t(`settings.tabs.${tab.id}`)}
                id={`settings-tab-${index}`}
                aria-controls={`settings-tabpanel-${index}`}
                aria-label={tab.ariaLabel}
              />
            ))}
          </Tabs>
        </Paper>

        <Box role="tabpanel" hidden={activeTab !== 0}>
          {activeTab === 0 && (
            <ProfileSettings
              initialSettings={settings}
              onError={(error) => {
                setError(error.message);
                trackEvent('profile_settings_error', { error: error.message });
              }}
            />
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 1}>
          {activeTab === 1 && (
            <IntegrationSettings
              integrations={settings.integrations}
              onUpdateSuccess={(config) => {
                handleSettingsUpdate('integrations', {
                  integrations: settings.integrations.map(i => 
                    i.type === config.type ? config : i
                  )
                });
              }}
              onError={(error) => {
                setError(error.message);
                trackEvent('integration_settings_error', { error: error.message });
              }}
            />
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 2}>
          {activeTab === 2 && (
            <NotificationSettings
              initialPreferences={settings.notificationPreferences}
              onUpdateSuccess={(preferences) => {
                handleSettingsUpdate('notifications', {
                  notificationPreferences: preferences
                });
              }}
            />
          )}
        </Box>

        {updateStatus === LoadingState.SUCCESS && (
          <Toast
            id="settings-update-success"
            type={NotificationType.SUCCESS}
            title={t('settings.updateSuccess')}
            message={t('settings.updateSuccessMessage')}
            duration={3000}
          />
        )}

        {updateStatus === LoadingState.ERROR && (
          <Toast
            id="settings-update-error"
            type={NotificationType.ERROR}
            title={t('settings.updateError')}
            message={error || t('settings.updateErrorMessage')}
            duration={5000}
          />
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default Settings;