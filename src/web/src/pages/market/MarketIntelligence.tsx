import React, { useEffect, useCallback, useRef } from 'react';
import { Grid, Box, Typography, CircularProgress, Alert, Skeleton } from '@mui/material';
import { debounce } from 'lodash';

// Internal imports
import CompetitorActivity from '../../components/market/CompetitorActivity';
import MarketTrends from '../../components/market/MarketTrends';
import PriceAlerts from '../../components/market/PriceAlerts';
import { useMarket } from '../../hooks/useMarket';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Constants
const REFRESH_DEBOUNCE = 500;

/**
 * Market Intelligence Dashboard
 * Provides comprehensive market analysis, competitor tracking, and price monitoring
 */
const MarketIntelligence: React.FC = () => {
  // Market intelligence state management
  const {
    competitors,
    marketTrends,
    loading,
    error,
    selectedTimeframe,
    fetchCompetitors,
    fetchMarketTrends,
    createPriceAlert,
    trackCompetitor,
    setTimeframe,
    clearError
  } = useMarket();

  // WebSocket connection ref for real-time updates
  const wsRef = useRef<WebSocket | null>(null);

  // Debounced refresh handler
  const handleRefreshData = useCallback(
    debounce(async () => {
      try {
        await Promise.all([
          fetchCompetitors(),
          fetchMarketTrends(selectedTimeframe)
        ]);
      } catch (error) {
        console.error('Failed to refresh market data:', error);
      }
    }, REFRESH_DEBOUNCE),
    [fetchCompetitors, fetchMarketTrends, selectedTimeframe]
  );

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(process.env.VITE_WS_URL as string);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MARKET_UPDATE') {
        handleRefreshData();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [handleRefreshData]);

  // Initial data fetch
  useEffect(() => {
    handleRefreshData();
  }, [handleRefreshData]);

  // Loading state with skeleton screens
  if (loading === 'LOADING' && !competitors.length) {
    return (
      <Box p={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box p={3} role="main" aria-label="Market Intelligence Dashboard">
        {error && (
          <Alert 
            severity="error" 
            onClose={clearError}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        <Typography variant="h4" component="h1" gutterBottom>
          Market Intelligence
        </Typography>

        <Grid container spacing={3}>
          {/* Competitor Activity Feed */}
          <Grid item xs={12} md={8}>
            <CompetitorActivity
              className="competitor-activity-section"
              onActivitySelect={async (activity) => {
                if (activity.competitorId) {
                  await trackCompetitor(activity.competitorId);
                }
              }}
            />
          </Grid>

          {/* Price Alerts Section */}
          <Grid item xs={12} md={4}>
            <PriceAlerts
              alerts={competitors.map(comp => comp.priceAlerts).flat()}
              onAddAlert={createPriceAlert}
              onEditAlert={async (id, alert) => {
                // Implementation handled by parent component
                console.log('Edit alert:', id, alert);
              }}
              onDeleteAlert={async (id) => {
                // Implementation handled by parent component
                console.log('Delete alert:', id);
              }}
              onToggleAlert={async (id, isActive) => {
                // Implementation handled by parent component
                console.log('Toggle alert:', id, isActive);
              }}
            />
          </Grid>

          {/* Market Trends Analysis */}
          <Grid item xs={12}>
            <MarketTrends
              className="market-trends-section"
              initialTimeframe={selectedTimeframe}
            />
          </Grid>
        </Grid>

        {loading === 'LOADING' && (
          <Box
            position="fixed"
            bottom={24}
            right={24}
            zIndex={1000}
          >
            <CircularProgress size={32} />
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default MarketIntelligence;