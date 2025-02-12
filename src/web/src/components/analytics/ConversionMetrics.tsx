import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames'; // ^2.3.2
import debounce from 'lodash/debounce'; // ^4.0.8

import { ProgressBar } from '../common/ProgressBar';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AnalyticsMetricType } from '../../types/analytics.types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { METRIC_DISPLAY_OPTIONS } from '../../constants/analytics.constants';

interface ConversionMetricsProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** Time range for metrics data (e.g., '7d', '30d', '90d') */
  timeRange: string;
  /** Optional interval in milliseconds for data refresh */
  refreshInterval?: number;
  /** Optional callback when metrics are updated */
  onMetricsUpdate?: (leadToOpportunity: number, opportunityToClose: number) => void;
}

/**
 * Formats a decimal value as a percentage string with locale support
 */
const formatPercentage = (value: number, locale: string = 'en-US'): string => {
  if (value < 0 || value > 1) {
    console.warn('Invalid percentage value:', value);
    value = Math.max(0, Math.min(1, value));
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

/**
 * Determines progress bar color based on conversion rate
 */
const getProgressBarColor = (rate: number): 'error' | 'warning' | 'success' => {
  if (rate < 0.3) return 'error';
  if (rate < 0.5) return 'warning';
  return 'success';
};

/**
 * ConversionMetrics component displays real-time conversion metrics using progress bars
 */
const ConversionMetrics: React.FC<ConversionMetricsProps> = ({
  className,
  timeRange,
  refreshInterval = 5000,
  onMetricsUpdate
}) => {
  // Initialize analytics hook for conversion rate metrics
  const {
    loading,
    error,
    data: analyticsData,
    refetch
  } = useAnalytics(
    AnalyticsMetricType.CONVERSION_RATE,
    timeRange,
    {
      enableRealTime: true,
      confidenceThreshold: 0.9,
      cacheResults: true
    }
  );

  // Memoize conversion rates
  const { leadToOpportunity, opportunityToClose } = useMemo(() => {
    const latest = analyticsData?.[analyticsData.length - 1];
    return {
      leadToOpportunity: latest?.metadata?.leadToOpportunity ?? 0,
      opportunityToClose: latest?.metadata?.opportunityToClose ?? 0
    };
  }, [analyticsData]);

  // Debounced refresh handler
  const handleRefresh = useCallback(
    debounce(() => {
      refetch();
    }, 300),
    [refetch]
  );

  // Set up automatic refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, handleRefresh]);

  // Notify parent component of updates
  useEffect(() => {
    onMetricsUpdate?.(leadToOpportunity, opportunityToClose);
  }, [leadToOpportunity, opportunityToClose, onMetricsUpdate]);

  // Loading state
  if (loading) {
    return (
      <div className={classNames('conversion-metrics', 'conversion-metrics--loading', className)}>
        <div className="conversion-metrics__skeleton" />
      </div>
    );
  }

  // Error state is handled by ErrorBoundary

  return (
    <ErrorBoundary>
      <div className={classNames('conversion-metrics', className)}>
        <div className="conversion-metrics__header">
          <h3 className="conversion-metrics__title">Conversion Metrics</h3>
          <button
            onClick={handleRefresh}
            className="conversion-metrics__refresh"
            aria-label="Refresh metrics"
          >
            Refresh
          </button>
        </div>

        <div className="conversion-metrics__content">
          {/* Lead to Opportunity Conversion */}
          <div className="conversion-metrics__item">
            <label className="conversion-metrics__label">
              Lead to Opportunity
            </label>
            <ProgressBar
              value={leadToOpportunity}
              max={1}
              color={getProgressBarColor(leadToOpportunity)}
              showLabel
              label={formatPercentage(leadToOpportunity)}
              size="lg"
            />
          </div>

          {/* Opportunity to Close Conversion */}
          <div className="conversion-metrics__item">
            <label className="conversion-metrics__label">
              Opportunity to Close
            </label>
            <ProgressBar
              value={opportunityToClose}
              max={1}
              color={getProgressBarColor(opportunityToClose)}
              showLabel
              label={formatPercentage(opportunityToClose)}
              size="lg"
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Display name for debugging
ConversionMetrics.displayName = 'ConversionMetrics';

export default ConversionMetrics;