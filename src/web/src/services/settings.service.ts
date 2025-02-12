/**
 * Settings Service for Sales & Intelligence Platform
 * Version: 1.0.0
 * 
 * Manages user settings, integration configurations, notification preferences,
 * and display settings with enhanced caching and validation capabilities.
 */

import axios from 'axios'; // ^1.6.0
import { apiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import { 
  UserSettings, 
  IntegrationType, 
  IntegrationConfig, 
  IntegrationStatus 
} from '../types/settings.types';
import { ApiResponse } from '../types/common.types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

// Integration test timeout
const INTEGRATION_TEST_TIMEOUT = 30000; // 30 seconds

interface RetryConfig {
  maxAttempts: number;
  backoffFactor: number;
  statusCodes: number[];
}

interface ConnectionTestResult {
  success: boolean;
  status: IntegrationStatus;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export class SettingsService {
  private cachedSettings: Map<string, { data: UserSettings; timestamp: number }> = new Map();
  private retryConfigs: Map<string, RetryConfig> = new Map();

  constructor() {
    this.initializeRetryConfigs();
  }

  /**
   * Initializes retry configurations for different operations
   */
  private initializeRetryConfigs(): void {
    this.retryConfigs.set('getUserSettings', {
      maxAttempts: MAX_RETRY_ATTEMPTS,
      backoffFactor: 2,
      statusCodes: [500, 502, 503, 504]
    });
  }

  /**
   * Retrieves user settings with caching support
   * @param userId User identifier
   * @returns Promise resolving to user settings
   */
  public async getUserSettings(userId: string): Promise<UserSettings> {
    // Check cache
    const cached = this.cachedSettings.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await apiClient.get<ApiResponse<UserSettings>>(
        `${API_ENDPOINTS.SETTINGS}/${userId}`
      );

      if (response.success && response.data) {
        // Update cache
        this.cachedSettings.set(userId, {
          data: response.data,
          timestamp: Date.now()
        });
        return response.data;
      }

      throw new Error('Failed to fetch user settings');
    } catch (error) {
      console.error('[SettingsService] getUserSettings error:', error);
      throw error;
    }
  }

  /**
   * Updates user settings with validation
   * @param settings Partial settings update
   * @returns Promise resolving to updated settings
   */
  public async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    try {
      const response = await apiClient.put<ApiResponse<UserSettings>>(
        `${API_ENDPOINTS.SETTINGS}/${userId}`,
        settings
      );

      if (response.success && response.data) {
        // Update cache with new settings
        this.cachedSettings.set(userId, {
          data: response.data,
          timestamp: Date.now()
        });

        // Emit settings change event
        this.emitSettingsChanged(userId, response.data);
        return response.data;
      }

      throw new Error('Failed to update user settings');
    } catch (error) {
      console.error('[SettingsService] updateUserSettings error:', error);
      throw error;
    }
  }

  /**
   * Tests integration connection with comprehensive health check
   * @param integrationType Type of integration to test
   * @param config Integration configuration
   * @returns Promise resolving to connection test results
   */
  public async testIntegrationConnection(
    integrationType: IntegrationType,
    config: IntegrationConfig
  ): Promise<ConnectionTestResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INTEGRATION_TEST_TIMEOUT);

      const response = await apiClient.post<ApiResponse<ConnectionTestResult>>(
        `${API_ENDPOINTS.INTEGRATIONS}/${integrationType}/test`,
        config,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.success && response.data) {
        return {
          success: true,
          status: response.data.status,
          message: response.data.message,
          details: response.data.details,
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('Integration test failed');
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return {
          success: false,
          status: IntegrationStatus.ERROR,
          message: 'Integration test timed out',
          timestamp: new Date().toISOString()
        };
      }

      console.error('[SettingsService] testIntegrationConnection error:', error);
      throw error;
    }
  }

  /**
   * Invalidates the settings cache for a user
   * @param userId User identifier
   */
  public invalidateCache(userId: string): void {
    this.cachedSettings.delete(userId);
  }

  /**
   * Emits a settings changed event
   * @param userId User identifier
   * @param settings Updated settings
   */
  private emitSettingsChanged(userId: string, settings: UserSettings): void {
    const event = new CustomEvent('settingsChanged', {
      detail: { userId, settings }
    });
    window.dispatchEvent(event);
  }

  /**
   * Validates integration configuration
   * @param config Integration configuration to validate
   * @returns boolean indicating if config is valid
   */
  private validateIntegrationConfig(config: IntegrationConfig): boolean {
    if (!config.type || !Object.values(IntegrationType).includes(config.type)) {
      return false;
    }

    if (!config.credentials || Object.keys(config.credentials).length === 0) {
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const settingsService = new SettingsService();