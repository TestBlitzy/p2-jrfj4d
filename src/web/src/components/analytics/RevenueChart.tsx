import React, { useCallback, useMemo } from 'react';
import { Chart } from '../common/Chart';
import { LoadingSpinner } from '@mui/material'; // v5.0.0
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatChartData, createChartOptions } from '../../utils/chart.utils';
import { 
  AnalyticsMetricType, 
  RevenueForecast, 
  AnalyticsDataPoint 
} from '../../types/analytics.types';
import { CHART_TYPES, METRIC_DISPLAY_OPTIONS } from '../../constants/analytics.constants';

interface RevenueChartProps {
  timeRange: string;
  showForecast?: boolean;
  height?: number;
  enableRealTime?: boolean;
  confidenceInterval?: boolean;
  className?: string;
}

/**
 * Enhanced revenue visualization component with real-time updates and forecast capabilities
 * Implements requirements F-101 (Historical Data Analysis) and F-102 (Revenue Forecasting)
 */
const RevenueChart: React.FC<RevenueChartProps> = React.memo(({
  timeRange,
  showForecast = true,
  height = 400,
  enableRealTime = true,
  confidenceInterval = true,
  className = ''
}) => {
  // Initialize analytics hook with revenue metric type
  const {
    loading,
    error,
    realTimeStatus,
    fetchAnalyticsData,
    fetchRevenueForecast
  } = useAnalytics(
    AnalyticsMetricType.REVENUE,
    timeRange,
    {
      enableRealTime,
      confidenceThreshold: 0.9,
      cacheResults: true,
      retryOnError: true
    }
  );

  /**
   * Format revenue data for chart visualization with forecast support
   */
  const formatRevenueData = useCallback((
    historicalData: AnalyticsDataPoint[],
    forecast?: RevenueForecast | null
  ) => {
    const chartData = formatChartData(historicalData, CHART_TYPES.LINE);

    if (showForecast && forecast) {
      // Add forecast data series
      chartData.datasets.push({
        label: 'Forecast',
        data: forecast.predictions.map(p => p.value),
        borderColor: 'rgba(75, 192, 192, 1)',
        borderDash: [5, 5],
        fill: false
      });

      // Add confidence intervals if enabled
      if (confidenceInterval) {
        const upperBound = forecast.predictions.map(p => p.value * (1 + forecast.confidenceInterval));
        const lowerBound = forecast.predictions.map(p => p.value * (1 - forecast.confidenceInterval));

        chartData.datasets.push({
          label: 'Confidence Interval',
          data: upperBound,
          fill: '+1',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 0
        });

        chartData.datasets.push({
          label: 'Confidence Interval',
          data: lowerBound,
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 0
        });
      }
    }

    return chartData;
  }, [showForecast, confidenceInterval]);

  /**
   * Create enhanced chart options for revenue visualization
   */
  const getChartOptions = useMemo(() => {
    const formatOptions = METRIC_DISPLAY_OPTIONS[AnalyticsMetricType.REVENUE];
    
    return createChartOptions(CHART_TYPES.LINE, {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
        axis: 'x'
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM D'
            }
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Revenue'
          },
          ticks: {
            callback: (value: number) => {
              return new Intl.NumberFormat(formatOptions.locale, {
                style: formatOptions.format,
                currency: 'USD'
              }).format(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              return `Revenue: ${new Intl.NumberFormat(formatOptions.locale, {
                style: formatOptions.format,
                currency: 'USD'
              }).format(value)}`;
            }
          }
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true
          }
        }
      }
    });
  }, []);

  // Handle loading and error states
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="chart-error" role="alert">
        Error loading revenue data: {error}
      </div>
    );
  }

  return (
    <div 
      className={`revenue-chart-container ${className}`}
      role="region"
      aria-label="Revenue Chart"
    >
      <Chart
        type={CHART_TYPES.LINE}
        data={formatRevenueData}
        options={getChartOptions}
        height={height}
        enableRealTimeUpdates={enableRealTime}
        accessibilityLabel="Revenue trend and forecast visualization"
        performanceMode={true}
      />
      {enableRealTime && (
        <div className="real-time-status" aria-live="polite">
          Real-time updates: {realTimeStatus}
        </div>
      )}
    </div>
  );
});

RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;