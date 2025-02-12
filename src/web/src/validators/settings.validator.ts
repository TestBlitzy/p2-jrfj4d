/**
 * @fileoverview Enterprise-grade validation schemas and functions for user settings
 * @version 1.0.0
 * Dependencies:
 * - zod: ^3.22.0
 * - sanitize-html: ^2.11.0
 */

import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { IntegrationType, IntegrationStatus } from '../types/settings.types';
import { ThemeMode } from '../types/common.types';
import { isValidEmail } from '../utils/validation.utils';

// Constants for validation
const MAX_WEBHOOK_LENGTH = 2048;
const MAX_API_KEY_LENGTH = 256;
const SUPPORTED_LANGUAGES = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'];
const SUPPORTED_TIMEZONES = Intl.supportedValuesOf('timeZone');
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

/**
 * Schema for OAuth credentials validation
 */
const oauthCredentialsSchema = z.object({
  accessToken: z.string().min(1).max(MAX_API_KEY_LENGTH),
  refreshToken: z.string().min(1).max(MAX_API_KEY_LENGTH),
  expiresAt: z.date(),
  scope: z.array(z.string())
});

/**
 * Schema for API key credentials validation
 */
const apiKeyCredentialsSchema = z.object({
  apiKey: z.string().min(1).max(MAX_API_KEY_LENGTH),
  apiSecret: z.string().min(1).max(MAX_API_KEY_LENGTH).optional()
});

/**
 * Enhanced schema for integration configuration
 */
export const integrationConfigSchema = z.object({
  type: z.nativeEnum(IntegrationType),
  status: z.nativeEnum(IntegrationStatus),
  credentials: z.discriminatedUnion('type', [
    z.object({ type: z.literal('oauth'), ...oauthCredentialsSchema.shape }),
    z.object({ type: z.literal('apiKey'), ...apiKeyCredentialsSchema.shape })
  ]),
  lastSync: z.date().optional(),
  rateLimits: z.object({
    maxRequests: z.number().min(1),
    timeWindow: z.number().min(1)
  }).optional()
}).refine(
  (data) => {
    // Additional security checks for credentials
    const sanitizedCreds = JSON.stringify(data.credentials)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return sanitizedCreds.length > 0;
  },
  { message: 'Invalid credentials format' }
);

/**
 * Schema for email notification settings
 */
const emailNotificationSchema = z.object({
  enabled: z.boolean(),
  address: z.string().email().refine(isValidEmail),
  frequency: z.enum(['instant', 'daily', 'weekly']),
  digestEnabled: z.boolean()
});

/**
 * Schema for push notification settings
 */
const pushNotificationSchema = z.object({
  enabled: z.boolean(),
  browserEnabled: z.boolean(),
  desktopEnabled: z.boolean(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })
});

/**
 * Schema for Slack notification settings
 */
const slackNotificationSchema = z.object({
  enabled: z.boolean(),
  webhookUrl: z.string()
    .max(MAX_WEBHOOK_LENGTH)
    .url()
    .refine(
      (url) => url.startsWith('https://hooks.slack.com/'),
      { message: 'Invalid Slack webhook URL' }
    ),
  channel: z.string().min(1),
  mentionUsers: z.array(z.string()).optional()
});

/**
 * Enhanced schema for notification preferences
 */
export const notificationPreferencesSchema = z.object({
  categories: z.record(z.boolean()),
  emailNotifications: emailNotificationSchema,
  pushNotifications: pushNotificationSchema,
  slackNotifications: slackNotificationSchema,
  customTemplates: z.record(z.string()).transform((val) => 
    Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, sanitizeHtml(v)])
    )
  )
});

/**
 * Schema for accessibility settings
 */
const accessibilitySchema = z.object({
  highContrast: z.boolean(),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  reduceMotion: z.boolean(),
  screenReaderOptimized: z.boolean(),
  keyboardNavigation: z.boolean()
});

/**
 * Schema for localization settings
 */
const localizationSchema = z.object({
  language: z.string().refine(
    (lang) => SUPPORTED_LANGUAGES.includes(lang),
    { message: 'Unsupported language code' }
  ),
  timezone: z.string().refine(
    (tz) => SUPPORTED_TIMEZONES.includes(tz),
    { message: 'Invalid timezone' }
  ),
  dateFormat: z.string().regex(/^(MM|DD|YYYY)[-/.](MM|DD|YYYY)[-/.](MM|DD|YYYY)$/),
  timeFormat: z.enum(['12h', '24h']),
  firstDayOfWeek: z.number().min(0).max(6)
});

/**
 * Enhanced schema for display settings
 */
export const displaySettingsSchema = z.object({
  theme: z.nativeEnum(ThemeMode),
  accessibility: accessibilitySchema,
  localization: localizationSchema,
  customization: z.object({
    compactView: z.boolean(),
    showTutorials: z.boolean(),
    dashboardLayout: z.array(z.string())
  }).optional()
});

/**
 * Schema for security settings
 */
const securitySchema = z.object({
  mfaEnabled: z.boolean(),
  sessionTimeout: z.number().min(5).max(1440),
  ipWhitelist: z.array(z.string().ip()).optional(),
  passwordExpiryDays: z.number().min(30).max(180),
  allowedDevices: z.array(z.string()).optional()
});

/**
 * Comprehensive schema for all user settings
 */
export const userSettingsSchema = z.object({
  integrations: z.array(integrationConfigSchema),
  notificationPreferences: notificationPreferencesSchema,
  displaySettings: displaySettingsSchema,
  security: securitySchema
}).refine(
  (data) => {
    // Ensure at least one notification method is enabled
    const { emailNotifications, pushNotifications, slackNotifications } = 
      data.notificationPreferences;
    return emailNotifications.enabled || 
           pushNotifications.enabled || 
           slackNotifications.enabled;
  },
  { message: 'At least one notification method must be enabled' }
);