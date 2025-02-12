import React, { useCallback, useEffect, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { useSelector } from 'react-redux';

import AnalyticsCard from '../../components/analytics/AnalyticsCard';
import CompetitorTracker from '../../components/analytics/CompetitorTracker';
import RevenueChart from '../../components/analytics/RevenueChart';
import { useAnalytics } from '../../hooks/useAnalytics';
import DashboardLayout from '../../layouts/DashboardLayout';
import { AnalyticsMetricType, TimeRange } from '../../types/analytics.types';
import { ANALYTICS_TIME_RANGES } from '../../constants/analytics.constants';

/**
 * Main analytics dashboard component providing comprehensive sales analytics,
 * revenue forecasts, and market intelligence with real-time updates.
 */
const AnalyticsDashboard: React.FC = () => {
  // State management
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    ANALYTICS_TIME_RANGES.LAST_30_DAYS
  );

  // Initialize analytics hook with configuration
  const {
    loading,
    error,
    realTimeStatus,
    fetchAnalyticsData,
    fetchRevenueForecast,
    fetchPatternAnalysis,
    fetchMarketTrends
  } = useAnalytics(
    AnalyticsMetricType.REVENUE,
    selectedTimeRange,
    {
      enableRealTime: true,
      confidenceThreshold: 0.9,
      cacheResults: true,
      retryOnError: true
    }
  );

  // Handle time range changes
  const handleTimeRangeChange = useCallback((newRange: string) => {
    setSelectedTimeRange(newRange);
    fetchAnalyticsData();
    fetchRevenueForecast();
    fetchPatternAnalysis();
    fetchMarketTrends();
  }, [fetchAnalyticsData, fetchRevenueForecast, fetchPatternAnalysis, fetchMarketTrends]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
    fetchRevenueForecast();
    fetchPatternAnalysis();
    fetchMarketTrends();
  }, []);

  return (
    <DashboardLayout>
      <div className="analytics-dashboard" role="main" aria-label="Analytics Dashboard">
        {/* Header Section */}
        <Typography variant="h4" component="h1" gutterBottom>
          Sales Analytics Dashboard
          {realTimeStatus === 'connected' && (
            <Typography 
              variant="caption" 
              color="success.main" 
              sx={{ ml: 2 }}
            >
              ● Real-time updates active
            </Typography>
          )}
        </Typography>

        {/* Revenue Analysis Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <AnalyticsCard
              title="Revenue Overview"
              metricType={AnalyticsMetricType.REVENUE}
              loading={loading}
              error={error}
              patternConfig={{ enabled: true, sensitivity: 0.8 }}
              enableRealTime={true}
            >
              <RevenueChart
                timeRange={selectedTimeRange}
                showForecast={true}
                height={400}
                enableRealTime={true}
                confidenceInterval={true}
              />
            </AnalyticsCard>
          </Grid>
        </Grid>

        {/* Key Metrics Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <AnalyticsCard
              title="Sales Velocity"
              metricType={AnalyticsMetricType.SALES_VELOCITY}
              loading={loading}
              error={error}
              patternConfig={{ enabled: true, sensitivity: 0.7 }}
              enableRealTime={true}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnalyticsCard
              title="Conversion Rate"
              metricType={AnalyticsMetricType.CONVERSION_RATE}
              loading={loading}
              error={error}
              patternConfig={{ enabled: true, sensitivity: 0.7 }}
              enableRealTime={true}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnalyticsCard
              title="Market Share"
              metricType={AnalyticsMetricType.MARKET_SHARE}
              loading={loading}
              error={error}
              patternConfig={{ enabled: true, sensitivity: 0.7 }}
              enableRealTime={true}
            />
          </Grid>
        </Grid>

        {/* Market Intelligence Section */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <CompetitorTracker
              refreshInterval={300000} // 5 minutes
              timeframe="DAILY"
            />
          </Grid>
        </Grid>

        {/* Time Range Selector */}
        <div className="time-range-selector" style={{ marginTop: '2rem' }}>
          <Typography variant="subtitle2" gutterBottom>
            Time Range
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(ANALYTICS_TIME_RANGES).map(([key, value]) => (
              <Grid item key={key}>
                <button
                  className={`time-range-button ${selectedTimeRange === value ? 'active' : ''}`}
                  onClick={() => handleTimeRangeChange(value)}
                  aria-pressed={selectedTimeRange === value}
                >
                  {key.replace('_', ' ')}
                </button>
              </Grid>
            ))}
          </Grid>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;