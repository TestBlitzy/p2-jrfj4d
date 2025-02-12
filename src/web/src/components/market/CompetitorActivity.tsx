import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Typography, IconButton, Tooltip, Badge, Skeleton, Modal } from '@mui/material';
import { NotificationsActive, FilterList, ErrorOutline } from '@mui/icons-material';
import { VirtualList } from 'react-window';

import Card from '../common/Card';
import ErrorBoundary from '../common/ErrorBoundary';
import { CompetitorActivity, ActivityType, ImpactLevel, WebSocketMessage } from '../../types/market.types';
import { MarketService } from '../../services/market.service';

// Constants for component configuration
const ACTIVITY_REFRESH_INTERVAL = 60000; // 1 minute
const VIRTUAL_LIST_ITEM_SIZE = 72;
const VIRTUAL_LIST_HEIGHT = 600;

interface CompetitorActivityProps {
  className?: string;
  onActivitySelect?: (activity: CompetitorActivity) => void;
}

interface ActivityFilter {
  types: ActivityType[];
  impactLevels: ImpactLevel[];
  dateRange: [Date | null, Date | null];
}

const CompetitorActivityComponent: React.FC<CompetitorActivityProps> = ({
  className,
  onActivitySelect
}) => {
  // State management
  const [activities, setActivities] = useState<CompetitorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilter>({
    types: Object.values(ActivityType),
    impactLevels: Object.values(ImpactLevel),
    dateRange: [null, null]
  });
  const [selectedActivity, setSelectedActivity] = useState<CompetitorActivity | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const activitiesCache = useRef<Map<string, CompetitorActivity>>(new Map());

  // WebSocket connection management
  const setupWebSocket = useCallback(() => {
    try {
      const ws = MarketService.subscribeToUpdates();
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.info('WebSocket connected for competitor activities');
      };

      ws.onmessage = (event: MessageEvent) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleActivityUpdate(message);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Real-time updates connection failed');
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      return () => {
        ws.close();
        wsRef.current = null;
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setError('Failed to initialize real-time updates');
    }
  }, []);

  // Fetch initial activities
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MarketService.getCompetitors();
      setActivities(data);
      // Update cache
      data.forEach(activity => {
        activitiesCache.current.set(activity.id, activity);
      });
      setError(null);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setError('Failed to load competitor activities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback((message: WebSocketMessage) => {
    setActivities(prevActivities => {
      const updatedActivities = [...prevActivities];
      const activityIndex = updatedActivities.findIndex(a => a.id === message.data.id);

      if (activityIndex >= 0) {
        updatedActivities[activityIndex] = message.data;
      } else {
        updatedActivities.unshift(message.data);
      }

      // Update cache
      activitiesCache.current.set(message.data.id, message.data);
      return updatedActivities;
    });
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const typeMatch = filters.types.includes(activity.type);
      const impactMatch = filters.impactLevels.includes(activity.impactLevel);
      const [startDate, endDate] = filters.dateRange;
      const dateMatch = (!startDate || activity.date >= startDate) &&
                       (!endDate || activity.date <= endDate);
      return typeMatch && impactMatch && dateMatch;
    });
  }, [activities, filters]);

  // Activity row renderer for virtual list
  const renderActivity = useCallback(({ index, style }) => {
    const activity = filteredActivities[index];
    return (
      <div style={style} className="competitor-activity-item">
        <Card
          variant="outlined"
          interactive
          onClick={() => {
            setSelectedActivity(activity);
            onActivitySelect?.(activity);
          }}
          aria-label={`Competitor activity: ${activity.description}`}
        >
          <div className="activity-content">
            <Typography variant="subtitle1" component="h3">
              {activity.type}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {activity.description}
            </Typography>
            <Badge
              color={activity.impactLevel === ImpactLevel.HIGH ? 'error' : 
                     activity.impactLevel === ImpactLevel.MEDIUM ? 'warning' : 'info'}
              variant="dot"
            >
              <Typography variant="caption">
                {new Date(activity.date).toLocaleDateString()}
              </Typography>
            </Badge>
          </div>
        </Card>
      </div>
    );
  }, [filteredActivities, onActivitySelect]);

  // Effect hooks
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, ACTIVITY_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  useEffect(() => {
    const cleanup = setupWebSocket();
    return cleanup;
  }, [setupWebSocket]);

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={VIRTUAL_LIST_ITEM_SIZE}
            style={{ marginBottom: 8 }}
          />
        ))}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        {/* Header */}
        <div className="competitor-activity-header">
          <Typography variant="h6" component="h2">
            Competitor Activities
            {wsConnected && (
              <Tooltip title="Real-time updates active">
                <IconButton size="small" color="primary">
                  <NotificationsActive />
                </IconButton>
              </Tooltip>
            )}
          </Typography>
          
          <IconButton
            onClick={() => {/* Implement filter dialog */}}
            aria-label="Filter activities"
          >
            <FilterList />
          </IconButton>
        </div>

        {/* Error state */}
        {error && (
          <Card variant="outlined" className="error-card">
            <ErrorOutline color="error" />
            <Typography color="error">{error}</Typography>
          </Card>
        )}

        {/* Activities list */}
        <VirtualList
          height={VIRTUAL_LIST_HEIGHT}
          width="100%"
          itemCount={filteredActivities.length}
          itemSize={VIRTUAL_LIST_ITEM_SIZE}
        >
          {renderActivity}
        </VirtualList>

        {/* Activity detail modal */}
        <Modal
          open={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          aria-labelledby="activity-detail-modal"
        >
          <Card className="activity-detail-modal">
            {selectedActivity && (
              <>
                <Typography variant="h6" id="activity-detail-modal">
                  Activity Details
                </Typography>
                <Typography variant="body1">
                  {selectedActivity.description}
                </Typography>
                {/* Add more activity details as needed */}
              </>
            )}
          </Card>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(CompetitorActivityComponent);