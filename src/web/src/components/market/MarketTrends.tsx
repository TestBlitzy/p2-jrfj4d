import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { debounce } from 'lodash';

// Internal imports
import { MarketTrend, TimeframeType, SentimentType } from '../../types/market.types';
import { useMarket } from '../../hooks/useMarket';
import Card from '../common/Card';
import Chart from '../common/Chart';
import ErrorBoundary from '../common/ErrorBoundary';

// Constants for chart configuration
const CHART_HEIGHT = 400;
const DEBOUNCE_DELAY = 500;

interface MarketTrendsProps {
  className?: string;
  initialTimeframe?: TimeframeType;
}

const MarketTrends: React.FC<MarketTrendsProps> = ({
  className,
  initialTimeframe = TimeframeType.WEEKLY
}) => {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>(initialTimeframe);
  
  // Custom hook for market data
  const { marketTrends, trackMarketTrends, isLoading, error } = useMarket();

  // Debounced tracking function
  const debouncedTrackTrends = useCallback(
    debounce((timeframe: TimeframeType) => {
      trackMarketTrends(timeframe);
    }, DEBOUNCE_DELAY),
    [trackMarketTrends]
  );

  // Handle timeframe changes
  const handleTimeframeChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const newTimeframe = event.target.value as TimeframeType;
    setSelectedTimeframe(newTimeframe);
    debouncedTrackTrends(newTimeframe);
  }, [debouncedTrackTrends]);

  // Format trend data for visualization
  const formattedTrendData = useMemo(() => {
    if (!marketTrends?.length) return null;

    return {
      labels: marketTrends.map(trend => trend.keyword),
      datasets: [
        {
          label: 'Mention Count',
          data: marketTrends.map(trend => trend.mentionCount),
          backgroundColor: marketTrends.map(trend => 
            trend.sentiment === SentimentType.POSITIVE ? 'rgba(76, 175, 80, 0.6)' :
            trend.sentiment === SentimentType.NEGATIVE ? 'rgba(244, 67, 54, 0.6)' :
            'rgba(156, 39, 176, 0.6)'
          ),
          borderWidth: 1
        }
      ]
    };
  }, [marketTrends]);

  // Initial data fetch
  useEffect(() => {
    trackMarketTrends(selectedTimeframe);
  }, [trackMarketTrends, selectedTimeframe]);

  return (
    <ErrorBoundary>
      <Card
        className={className}
        header={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h2">
              Market Trends Analysis
            </Typography>
            <Select
              value={selectedTimeframe}
              onChange={handleTimeframeChange}
              variant="outlined"
              size="small"
              disabled={isLoading}
            >
              {Object.values(TimeframeType).map((timeframe) => (
                <MenuItem key={timeframe} value={timeframe}>
                  {timeframe}
                </MenuItem>
              ))}
            </Select>
          </Box>
        }
      >
        <Box height={CHART_HEIGHT} position="relative">
          {isLoading && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message || 'Failed to load market trends'}
            </Alert>
          )}

          {!isLoading && !error && formattedTrendData && (
            <Chart
              type="bar"
              data={formattedTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const trend = marketTrends[context.dataIndex];
                        return `Mentions: ${trend.mentionCount} | Sentiment: ${trend.sentiment}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Mention Count'
                    }
                  }
                }
              }}
              height={CHART_HEIGHT}
              enableRealTimeUpdates
              accessibilityLabel="Market trends visualization"
            />
          )}
        </Box>

        {!isLoading && !error && marketTrends?.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" color="textSecondary">
              Top Trending Keywords
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              {marketTrends.slice(0, 5).map((trend) => (
                <Box
                  key={trend.id}
                  bgcolor={theme => theme.palette.background.default}
                  borderRadius={1}
                  px={1}
                  py={0.5}
                >
                  <Typography variant="body2">
                    {trend.keyword} ({trend.mentionCount})
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Card>
    </ErrorBoundary>
  );
};

export default MarketTrends;