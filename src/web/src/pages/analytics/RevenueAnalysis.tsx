import React, { useCallback, useEffect, useMemo } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  useMediaQuery, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Skeleton
} from '@mui/material';
import { useTheme } from '@mui/material';
import RevenueChart from '../../components/analytics/RevenueChart';
import ConversionMetrics from '../../components/analytics/ConversionMetrics';
import { useAnalytics } from '../../hooks/useAnalytics';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { AnalyticsMetricType } from '../../types/analytics.types';
import { ANALYTICS_TIME_RANGES, ANALYTICS_THRESHOLDS } from '../../constants/analytics.constants';

/**
 * RevenueAnalysis page component that provides comprehensive revenue analytics
 * Implements requirements F-101 (Historical Data Analysis) and F-102 (Revenue Forecasting)
 */
const RevenueAnalysis: React.FC = React.memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Initialize analytics hook with revenue metric type
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
    ANALYTICS_TIME_RANGES.LAST_30_DAYS,
    {
      enableRealTime: true,
      confidenceThreshold: ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD,
      cacheResults: true,
      retryOnError: true
    }
  );

  // Time range selection handler with performance optimization
  const handleTimeRangeChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const newTimeRange = event.target.value as string;
    fetchAnalyticsData({
      timeRange: newTimeRange,
      metricType: AnalyticsMetricType.REVENUE,
      page: 1,
      pageSize: 50
    });
    fetchRevenueForecast({
      forecastPeriod: 30,
      confidenceLevel: ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
    });
  }, [fetchAnalyticsData, fetchRevenueForecast]);

  // Initialize data on component mount
  useEffect(() => {
    fetchAnalyticsData({
      timeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      metricType: AnalyticsMetricType.REVENUE,
      page: 1,
      pageSize: 50
    });
    fetchRevenueForecast({
      forecastPeriod: 30,
      confidenceLevel: ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
    });
    fetchPatternAnalysis({
      metricType: AnalyticsMetricType.REVENUE,
      confidenceThreshold: ANALYTICS_THRESHOLDS.PATTERN_DETECTION_THRESHOLD
    });
    fetchMarketTrends({
      timeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      significanceThreshold: ANALYTICS_THRESHOLDS.TREND_SIGNIFICANCE_THRESHOLD
    });
  }, [fetchAnalyticsData, fetchRevenueForecast, fetchPatternAnalysis, fetchMarketTrends]);

  // Memoized time range options
  const timeRangeOptions = useMemo(() => [
    { value: ANALYTICS_TIME_RANGES.LAST_24_HOURS, label: 'Last 24 Hours' },
    { value: ANALYTICS_TIME_RANGES.LAST_7_DAYS, label: 'Last 7 Days' },
    { value: ANALYTICS_TIME_RANGES.LAST_30_DAYS, label: 'Last 30 Days' },
    { value: ANALYTICS_TIME_RANGES.LAST_90_DAYS, label: 'Last 90 Days' }
  ], []);

  return (
    <ErrorBoundary>
      <div className="revenue-analysis" role="main" aria-label="Revenue Analysis Dashboard">
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container justifyContent="space-between" alignItems="center">
                  <Grid item>
                    <Typography variant="h4" component="h1" gutterBottom>
                      Revenue Analysis
                    </Typography>
                  </Grid>
                  <Grid item>
                    <FormControl variant="outlined" size="small">
                      <InputLabel id="time-range-select-label">Time Range</InputLabel>
                      <Select
                        labelId="time-range-select-label"
                        id="time-range-select"
                        defaultValue={ANALYTICS_TIME_RANGES.LAST_30_DAYS}
                        onChange={handleTimeRangeChange}
                        label="Time Range"
                      >
                        {timeRangeOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Chart Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                {loading ? (
                  <Skeleton variant="rectangular" height={400} animation="wave" />
                ) : (
                  <RevenueChart
                    timeRange={ANALYTICS_TIME_RANGES.LAST_30_DAYS}
                    showForecast={true}
                    height={isMobile ? 300 : 400}
                    enableRealTime={true}
                    confidenceInterval={true}
                    className="revenue-chart"
                  />
                )}
                {realTimeStatus === 'connected' && (
                  <Typography 
                    variant="caption" 
                    color="textSecondary" 
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Real-time updates enabled
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Conversion Metrics Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <ConversionMetrics
                  timeRange={ANALYTICS_TIME_RANGES.LAST_30_DAYS}
                  refreshInterval={5000}
                  onMetricsUpdate={(leadToOpp, oppToClose) => {
                    console.log('Metrics updated:', { leadToOpp, oppToClose });
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>
    </ErrorBoundary>
  );
});

RevenueAnalysis.displayName = 'RevenueAnalysis';

export default RevenueAnalysis;