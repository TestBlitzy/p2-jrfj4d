/**
 * @fileoverview Integration Settings Component for managing third-party service integrations
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Button from '../common/Button';
import { 
  IntegrationType, 
  IntegrationStatus, 
  IntegrationConfig 
} from '../../types/settings.types';
import { SettingsService } from '../../services/settings.service';

// Constants for integration management
const DEFAULT_TEST_TIMEOUT = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

interface IntegrationSettingsProps {
  integrations: IntegrationConfig[];
  onUpdateSuccess?: (config: IntegrationConfig) => void;
  onError?: (error: Error) => void;
}

interface IntegrationState {
  loading: Record<string, boolean>;
  testing: Record<string, boolean>;
  errors: Record<string, string>;
}

/**
 * Integration Settings component for managing third-party service connections
 */
export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  integrations,
  onUpdateSuccess,
  onError
}) => {
  const dispatch = useDispatch();
  const [state, setState] = useState<IntegrationState>({
    loading: {},
    testing: {},
    errors: {}
  });

  const settingsService = new SettingsService();

  /**
   * Updates integration configuration with optimistic updates and error handling
   */
  const handleIntegrationUpdate = useCallback(
    debounce(async (config: IntegrationConfig) => {
      const integrationId = config.type;
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [integrationId]: true },
        errors: { ...prev.errors, [integrationId]: '' }
      }));

      try {
        // Optimistic update
        dispatch({ type: 'UPDATE_INTEGRATION_CONFIG_OPTIMISTIC', payload: config });

        const updatedConfig = await settingsService.updateIntegrationConfig(config);

        // Success handling
        dispatch({ type: 'UPDATE_INTEGRATION_CONFIG_SUCCESS', payload: updatedConfig });
        onUpdateSuccess?.(updatedConfig);

        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, [integrationId]: false }
        }));
      } catch (error) {
        // Error handling with retry mechanism
        let retryCount = 0;
        const retryOperation = async () => {
          try {
            const updatedConfig = await settingsService.retryFailedOperation(config);
            dispatch({ type: 'UPDATE_INTEGRATION_CONFIG_SUCCESS', payload: updatedConfig });
            onUpdateSuccess?.(updatedConfig);
          } catch (retryError) {
            if (retryCount < MAX_RETRY_ATTEMPTS) {
              retryCount++;
              setTimeout(retryOperation, RETRY_DELAY * retryCount);
            } else {
              handleError(integrationId, error as Error);
            }
          }
        };

        if (retryCount < MAX_RETRY_ATTEMPTS) {
          retryOperation();
        } else {
          handleError(integrationId, error as Error);
        }
      }
    }, 300),
    [dispatch, onUpdateSuccess, onError]
  );

  /**
   * Tests integration connection with timeout handling
   */
  const handleConnectionTest = useCallback(async (integrationId: string) => {
    setState(prev => ({
      ...prev,
      testing: { ...prev.testing, [integrationId]: true },
      errors: { ...prev.errors, [integrationId]: '' }
    }));

    const timeoutId = setTimeout(() => {
      setState(prev => ({
        ...prev,
        testing: { ...prev.testing, [integrationId]: false },
        errors: { ...prev.errors, [integrationId]: 'Connection test timed out' }
      }));
    }, DEFAULT_TEST_TIMEOUT);

    try {
      const result = await settingsService.testIntegrationConnection(
        integrationId as IntegrationType,
        integrations.find(i => i.type === integrationId)!
      );

      clearTimeout(timeoutId);

      if (result.success) {
        dispatch({
          type: 'UPDATE_INTEGRATION_STATUS',
          payload: { id: integrationId, status: IntegrationStatus.CONNECTED }
        });
      } else {
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, [integrationId]: result.message }
        }));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      handleError(integrationId, error as Error);
    } finally {
      setState(prev => ({
        ...prev,
        testing: { ...prev.testing, [integrationId]: false }
      }));
    }
  }, [integrations, dispatch]);

  /**
   * Handles errors with appropriate user feedback
   */
  const handleError = (integrationId: string, error: Error) => {
    const errorMessage = error.message || 'An error occurred';
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [integrationId]: false },
      testing: { ...prev.testing, [integrationId]: false },
      errors: { ...prev.errors, [integrationId]: errorMessage }
    }));
    onError?.(error);
    dispatch({ type: 'UPDATE_INTEGRATION_ERROR', payload: { id: integrationId, error: errorMessage } });
  };

  return (
    <div className="integration-settings" data-testid="integration-settings">
      <h2 className="integration-settings__title">Integration Settings</h2>
      
      <div className="integration-settings__list">
        {integrations.map((integration) => (
          <div 
            key={integration.type}
            className="integration-settings__item"
            data-testid={`integration-${integration.type}`}
          >
            <div className="integration-settings__item-header">
              <h3>{integration.type}</h3>
              <span className={`integration-status integration-status--${integration.status.toLowerCase()}`}>
                {integration.status}
              </span>
            </div>

            <div className="integration-settings__item-content">
              {state.errors[integration.type] && (
                <div className="integration-settings__error" role="alert">
                  {state.errors[integration.type]}
                </div>
              )}

              <div className="integration-settings__actions">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => handleConnectionTest(integration.type)}
                  isLoading={state.testing[integration.type]}
                  disabled={state.loading[integration.type]}
                  testId={`test-${integration.type}`}
                >
                  Test Connection
                </Button>

                <Button
                  variant="secondary"
                  size="medium"
                  onClick={() => handleIntegrationUpdate({
                    ...integration,
                    status: integration.status === IntegrationStatus.CONNECTED
                      ? IntegrationStatus.DISCONNECTED
                      : IntegrationStatus.CONNECTED
                  })}
                  isLoading={state.loading[integration.type]}
                  disabled={state.testing[integration.type]}
                  testId={`toggle-${integration.type}`}
                >
                  {integration.status === IntegrationStatus.CONNECTED ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationSettings;