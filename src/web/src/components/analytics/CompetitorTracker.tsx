import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, IconButton, Typography, Skeleton, LinearProgress } from '@mui/material';
import { VirtualList } from 'react-window';

import Card from '../common/Card';
import { MarketService } from '../../services/market.service';
import ErrorBoundary from '../common/ErrorBoundary';
import {
  Competitor,
  CompetitorActivity,
  MarketTrend,
  ActivityType,
  ImpactLevel,
  TimeframeType,
  SentimentType
} from '../../types/market.types';

// Styled components
const ActivityContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

const TrendBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
  },
}));

interface CompetitorTrackerProps {
  refreshInterval?: number;
  timeframe?: TimeframeType;
  className?: string;
}

const CompetitorTracker: React.FC<CompetitorTrackerProps> = ({
  refreshInterval = 300000, // 5 minutes
  timeframe = TimeframeType.DAILY,
  className
}) => {
  // State management
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [activities, setActivities] = useState<CompetitorActivity[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch competitor data with error handling
  const fetchCompetitorData = useCallback(async () => {
    try {
      setLoading(true);
      const competitorData = await MarketService.getCompetitors();
      setCompetitors(competitorData);
      
      // Fetch activities for each competitor
      const activitiesPromises = competitorData.map(competitor =>
        MarketService.getCompetitorActivities(competitor.id, timeframe)
      );
      const allActivities = await Promise.all(activitiesPromises);
      setActivities(allActivities.flat());

      // Fetch market trends
      const trendData = await MarketService.getMarketTrends(timeframe);
      setTrends(trendData);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch market intelligence data');
      console.error('CompetitorTracker error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Set up periodic refresh
  useEffect(() => {
    fetchCompetitorData();
    const interval = setInterval(fetchCompetitorData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchCompetitorData, refreshInterval]);

  // Memoized activity feed renderer
  const renderActivityFeed = useMemo(() => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Skeleton 
          key={`skeleton-${index}`}
          variant="rectangular"
          height={80}
          sx={{ mb: 2, borderRadius: 1 }}
        />
      ));
    }

    const ActivityItem = ({ activity }: { activity: CompetitorActivity }) => {
      const competitor = competitors.find(c => c.id === activity.competitorId);
      const impactColor = {
        [ImpactLevel.HIGH]: 'error.main',
        [ImpactLevel.MEDIUM]: 'warning.main',
        [ImpactLevel.LOW]: 'success.main',
      }[activity.impactLevel];

      return (
        <ActivityContainer>
          <Typography variant="subtitle1" fontWeight="medium">
            {competitor?.name}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {activity.description}
          </Typography>
          <Typography 
            variant="caption" 
            color={impactColor}
            sx={{ mt: 1, display: 'block' }}
          >
            {activity.type} - {activity.impactLevel} Impact
          </Typography>
        </ActivityContainer>
      );
    };

    return (
      <VirtualList
        height={400}
        width="100%"
        itemCount={activities.length}
        itemSize={100}
      >
        {({ index, style }) => (
          <div style={style}>
            <ActivityItem activity={activities[index]} />
          </div>
        )}
      </VirtualList>
    );
  }, [loading, activities, competitors]);

  // Memoized trend metrics renderer
  const renderMetrics = useMemo(() => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Skeleton 
          key={`metric-skeleton-${index}`}
          variant="rectangular"
          height={60}
          sx={{ mb: 2, borderRadius: 1 }}
        />
      ));
    }

    return trends.map(trend => {
      const sentimentColor = {
        [SentimentType.POSITIVE]: 'success.main',
        [SentimentType.NEUTRAL]: 'info.main',
        [SentimentType.NEGATIVE]: 'error.main',
      }[trend.sentiment];

      return (
        <div key={trend.id} style={{ marginBottom: 16 }}>
          <Typography variant="subtitle2">
            {trend.keyword}
          </Typography>
          <TrendBar
            variant="determinate"
            value={(trend.mentionCount / 100) * 100}
            sx={{ 
              '& .MuiLinearProgress-bar': {
                backgroundColor: sentimentColor
              }
            }}
          />
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {trend.mentionCount} mentions • {trend.sentiment.toLowerCase()} sentiment
          </Typography>
        </div>
      );
    });
  }, [loading, trends]);

  return (
    <ErrorBoundary>
      <Card
        className={className}
        header={
          <Typography variant="h6" component="h2">
            Market Intelligence
          </Typography>
        }
      >
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <Typography variant="subtitle1" gutterBottom>
              Competitor Activity Feed
            </Typography>
            {renderActivityFeed}
          </div>
          <div>
            <Typography variant="subtitle1" gutterBottom>
              Market Trends
            </Typography>
            {renderMetrics}
          </div>
        </div>
      </Card>
    </ErrorBoundary>
  );
};

export default CompetitorTracker;