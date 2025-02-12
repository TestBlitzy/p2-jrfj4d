import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import Icon from '../common/Icon';
import ErrorBoundary from '../common/ErrorBoundary';
import { useLeads } from '../../hooks/useLeads';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AnalyticsMetricType } from '../../types/analytics.types';

/**
 * QuickActions component that provides quick access buttons for common actions
 * in the dashboard with enhanced accessibility and error handling.
 */
const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Initialize hooks with required configurations
  const { createLead, isCreating } = useLeads();
  const { refresh, isLoading: isAnalyticsLoading } = useAnalytics(
    AnalyticsMetricType.REVENUE,
    'last_30_days',
    { enableRealTime: true }
  );

  /**
   * Handles creation of a new lead with loading state and error handling
   */
  const handleCreateLead = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, create: true }));
      await navigate('/leads/new');
    } catch (error) {
      console.error('Failed to navigate to lead creation:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, create: false }));
    }
  }, [navigate]);

  /**
   * Handles navigation to analytics view with data refresh
   */
  const handleViewAnalytics = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, analytics: true }));
      await refresh();
      navigate('/analytics');
    } catch (error) {
      console.error('Failed to navigate to analytics:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [navigate, refresh]);

  /**
   * Handles navigation to market intelligence view
   */
  const handleViewMarket = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, market: true }));
      navigate('/market-intelligence');
    } catch (error) {
      console.error('Failed to navigate to market intelligence:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, market: false }));
    }
  }, [navigate]);

  return (
    <ErrorBoundary>
      <div className="quick-actions" data-testid="quick-actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create Lead Button */}
          <Button
            variant="primary"
            size="large"
            onClick={handleCreateLead}
            isLoading={isLoading.create || isCreating}
            className="quick-actions__button"
            testId="create-lead-button"
            ariaLabel="Create new lead"
          >
            <Icon name="add" size="md" className="mr-2" />
            Create Lead
          </Button>

          {/* View Analytics Button */}
          <Button
            variant="secondary"
            size="large"
            onClick={handleViewAnalytics}
            isLoading={isLoading.analytics || isAnalyticsLoading}
            className="quick-actions__button"
            testId="view-analytics-button"
            ariaLabel="View analytics dashboard"
          >
            <Icon name="chart" size="md" className="mr-2" />
            View Analytics
          </Button>

          {/* Market Intelligence Button */}
          <Button
            variant="outline"
            size="large"
            onClick={handleViewMarket}
            isLoading={isLoading.market}
            className="quick-actions__button"
            testId="view-market-button"
            ariaLabel="View market intelligence"
          >
            <Icon name="trend" size="md" className="mr-2" />
            Market Intelligence
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default QuickActions;