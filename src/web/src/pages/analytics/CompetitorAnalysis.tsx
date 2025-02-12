import React, { useEffect, useCallback, useMemo } from 'react';
import { Grid, Box, Typography, Paper, CircularProgress, Skeleton } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';

// Internal imports
import CompetitorTracker from '../../components/analytics/CompetitorTracker';
import CompetitorActivity from '../../components/market/CompetitorActivity';
import MarketTrends from '../../components/market/MarketTrends';
import { useMarket } from '../../hooks/useMarket';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { TimeframeType } from '../../types/market.types';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['box-shadow']),
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 400,
  padding: theme.spacing(3)
}));

/**
 * CompetitorAnalysis component for comprehensive market intelligence visualization
 * Implements real-time competitor tracking, market trends, and activity monitoring
 */
const CompetitorAnalysis: React.FC = () => {
  const theme = useTheme();
  const {
    competitors,
    marketTrends,
    loading,
    error,
    selectedTimeframe,
    fetchCompetitors,
    fetchMarketTrends,
    setTimeframe,
    clearError
  } = useMarket();

  // Initial data fetch
  useEffect(() => {
    fetchCompetitors();
    fetchMarketTrends(selectedTimeframe);
  }, [fetchCompetitors, fetchMarketTrends, selectedTimeframe]);

  // Handle timeframe changes
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeType) => {
    setTimeframe(newTimeframe);
    fetchMarketTrends(newTimeframe);
  }, [setTimeframe, fetchMarketTrends]);

  // Memoized competitor metrics
  const competitorMetrics = useMemo(() => {
    if (!competitors.length) return null;

    return {
      totalCompetitors: competitors.length,
      activeCompetitors: competitors.filter(c => c.lastUpdated > new Date(Date.now() - 86400000)).length,
      averageMarketShare: competitors.reduce((acc, curr) => acc + curr.marketShare, 0) / competitors.length
    };
  }, [competitors]);

  // Render loading state
  if (loading && !competitors.length) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} thickness={4} />
      </LoadingContainer>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Competitor Analysis
        </Typography>

        <Grid container spacing={3}>
          {/* Competitor Metrics Overview */}
          <Grid item xs={12}>
            <StyledPaper>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Typography variant="h6">Total Competitors</Typography>
                    <Typography variant="h4" color="primary">
                      {competitorMetrics?.totalCompetitors || <Skeleton width={60} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Typography variant="h6">Active Competitors</Typography>
                    <Typography variant="h4" color="secondary">
                      {competitorMetrics?.activeCompetitors || <Skeleton width={60} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Typography variant="h6">Avg. Market Share</Typography>
                    <Typography variant="h4" color="info.main">
                      {competitorMetrics?.averageMarketShare 
                        ? `${competitorMetrics.averageMarketShare.toFixed(1)}%`
                        : <Skeleton width={60} />}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          {/* Real-time Competitor Tracking */}
          <Grid item xs={12} lg={8}>
            <StyledPaper>
              <CompetitorTracker
                refreshInterval={300000}
                timeframe={selectedTimeframe}
              />
            </StyledPaper>
          </Grid>

          {/* Market Trends Analysis */}
          <Grid item xs={12} lg={4}>
            <StyledPaper>
              <MarketTrends
                initialTimeframe={selectedTimeframe}
              />
            </StyledPaper>
          </Grid>

          {/* Competitor Activity Feed */}
          <Grid item xs={12}>
            <StyledPaper>
              <CompetitorActivity
                onActivitySelect={(activity) => {
                  console.log('Selected activity:', activity);
                  // Implement activity selection handler
                }}
              />
            </StyledPaper>
          </Grid>
        </Grid>
      </Box>
    </ErrorBoundary>
  );
};

export default CompetitorAnalysis;