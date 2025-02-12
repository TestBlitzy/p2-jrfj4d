import React, { useCallback, useMemo, useState } from 'react';
import { Grid, Card, CardContent, Typography, Button, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import Input from '../common/Input';
import ErrorBoundary from '../common/ErrorBoundary';
import { validateEmail, validateLength } from '../../utils/validation.utils';
import { UserSettings, NotificationPreferences } from '../../types/settings.types';
import { ThemeMode } from '../../types/common.types';

interface ProfileSettingsProps {
  initialSettings?: UserSettings;
  onError?: (error: Error) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  initialSettings,
  onError
}) => {
  const { t } = useTranslation();
  const { settings, updateSettings, loading } = useSettings();
  const [formData, setFormData] = useState<Partial<UserSettings>>(initialSettings || settings);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Memoized validation rules
  const validationRules = useMemo(() => ({
    email: (value: string) => validateEmail(value),
    firstName: (value: string) => validateLength(value, 2, 50, 'First name'),
    lastName: (value: string) => validateLength(value, 2, 50, 'Last name'),
  }), []);

  // Handle form field changes
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate field
    const validationRule = validationRules[field as keyof typeof validationRules];
    if (validationRule) {
      const error = validationRule(value);
      setValidationErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  }, [validationRules]);

  // Handle notification preference changes
  const handleNotificationChange = useCallback((category: keyof NotificationPreferences, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [category]: enabled
      }
    }));
  }, []);

  // Handle theme changes
  const handleThemeChange = useCallback((theme: ThemeMode) => {
    setFormData(prev => ({
      ...prev,
      displaySettings: {
        ...prev.displaySettings,
        theme
      }
    }));
  }, []);

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.entries(validationRules).forEach(([field, rule]) => {
      const value = formData[field as keyof UserSettings];
      if (typeof value === 'string') {
        const error = rule(value);
        if (error) errors[field] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsSaving(true);
      await updateSettings(formData);
      // Announce success to screen readers
      const successMessage = t('settings.updateSuccess');
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = successMessage;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      if (onError) onError(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, validationRules, updateSettings, t, onError]);

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={200} />
        </Grid>
      </Grid>
    );
  }

  return (
    <ErrorBoundary onError={onError}>
      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('settings.personalInfo')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Input
                      label={t('settings.firstName')}
                      value={formData.firstName || ''}
                      onChange={(value) => handleFieldChange('firstName', value)}
                      error={validationErrors.firstName}
                      required
                      aria-label={t('settings.firstName')}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Input
                      label={t('settings.lastName')}
                      value={formData.lastName || ''}
                      onChange={(value) => handleFieldChange('lastName', value)}
                      error={validationErrors.lastName}
                      required
                      aria-label={t('settings.lastName')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Input
                      label={t('settings.email')}
                      value={formData.email || ''}
                      onChange={(value) => handleFieldChange('email', value)}
                      error={validationErrors.email}
                      type="email"
                      required
                      aria-label={t('settings.email')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Display Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('settings.displaySettings')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('settings.theme')}
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.values(ThemeMode).map((theme) => (
                        <Grid item key={theme}>
                          <Button
                            variant={formData.displaySettings?.theme === theme ? 'contained' : 'outlined'}
                            onClick={() => handleThemeChange(theme)}
                            aria-pressed={formData.displaySettings?.theme === theme}
                          >
                            {t(`settings.theme.${theme.toLowerCase()}`)}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Preferences */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('settings.notifications')}
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(formData.notificationPreferences || {}).map(([category, enabled]) => (
                    <Grid item xs={12} key={category}>
                      <Button
                        variant={enabled ? 'contained' : 'outlined'}
                        onClick={() => handleNotificationChange(category as keyof NotificationPreferences, !enabled)}
                        fullWidth
                        aria-pressed={enabled}
                      >
                        {t(`settings.notifications.${category.toLowerCase()}`)}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSaving || Object.keys(validationErrors).length > 0}
              aria-busy={isSaving}
              fullWidth
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </Grid>
        </Grid>
      </form>
    </ErrorBoundary>
  );
};

export default ProfileSettings;