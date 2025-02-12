import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from '../redux/hooks';
import { useErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { useCache } from 'react-cache-manager'; // ^2.1.0
import { useWebSocket } from 'react-use-websocket'; // ^3.0.0

import { 
  selectLeadsWithFilters,
  fetchLeadsWithCache,
  updateLeadScore,
  bulkUpdateLeads,
  setFilters,
  clearCache
} from '../redux/slices/leadSlice';

import leadService from '../services/lead.service';
import { 
  Lead, 
  LeadStatus, 
  LeadFilters, 
  LeadScoreMetrics 
} from '../types/lead.types';
import { LoadingState } from '../types/common.types';

// WebSocket endpoint for real-time updates
const WS_ENDPOINT = `${process.env.VITE_WS_BASE_URL}/leads`;

// Cache configuration
interface CacheConfig {
  ttl: number;
  maxSize: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
};

/**
 * Enhanced custom hook for managing leads with caching and real-time updates
 * Implements F-201 AI Lead Scoring and F-202 Automated Qualification features
 */
export const useLeads = (
  initialFilters?: Partial<LeadFilters>,
  cacheConfig: CacheConfig = DEFAULT_CACHE_CONFIG
) => {
  // Redux hooks
  const dispatch = useDispatch();
  const leads = useSelector(selectLeadsWithFilters);

  // Local state for granular loading states
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Error boundary integration
  const { showBoundary } = useErrorBoundary();

  // Cache initialization
  const { getCache, setCache, invalidateCache } = useCache('leads', cacheConfig);

  // WebSocket setup for real-time updates
  const { lastMessage, readyState } = useWebSocket(WS_ENDPOINT, {
    shouldReconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000
  });

  /**
   * Fetches leads based on current filters with cache support
   */
  const fetchLeads = useCallback(async (
    filters: Partial<LeadFilters> = {},
    bypassCache: boolean = false
  ) => {
    try {
      setLoadingStates(prev => ({ ...prev, fetch: LoadingState.LOADING }));

      const cacheKey = JSON.stringify(filters);
      const cachedData = !bypassCache && await getCache(cacheKey);

      if (cachedData) {
        dispatch(setFilters(filters));
        return cachedData;
      }

      const response = await dispatch(fetchLeadsWithCache({ filters, forceRefresh: bypassCache })).unwrap();
      await setCache(cacheKey, response);

      setLoadingStates(prev => ({ ...prev, fetch: LoadingState.SUCCESS }));
      return response;

    } catch (error) {
      setLoadingStates(prev => ({ ...prev, fetch: LoadingState.ERROR }));
      setErrors(prev => ({ ...prev, fetch: error.message }));
      showBoundary(error);
    }
  }, [dispatch, getCache, setCache, showBoundary]);

  /**
   * Updates lead status with optimistic updates
   */
  const updateStatus = useCallback(async (
    leadId: string,
    newStatus: LeadStatus
  ) => {
    try {
      setLoadingStates(prev => ({ ...prev, update: LoadingState.LOADING }));

      // Optimistic update
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      );
      dispatch(setFilters({})); // Trigger rerender with optimistic data

      await leadService.updateLead(leadId, { status: newStatus });
      invalidateCache(); // Invalidate cache after successful update

      setLoadingStates(prev => ({ ...prev, update: LoadingState.SUCCESS }));

    } catch (error) {
      setLoadingStates(prev => ({ ...prev, update: LoadingState.ERROR }));
      setErrors(prev => ({ ...prev, update: error.message }));
      await fetchLeads({}, true); // Refresh data on error
      showBoundary(error);
    }
  }, [leads, dispatch, invalidateCache, fetchLeads, showBoundary]);

  /**
   * Retrieves and manages AI-generated lead score with polling
   */
  const getLeadScore = useCallback(async (
    leadId: string,
    enablePolling: boolean = false
  ): Promise<LeadScoreMetrics> => {
    try {
      setLoadingStates(prev => ({ ...prev, score: LoadingState.LOADING }));

      const cacheKey = `score-${leadId}`;
      const cachedScore = await getCache(cacheKey);

      if (cachedScore) {
        return cachedScore;
      }

      const response = await dispatch(updateLeadScore(leadId)).unwrap();
      await setCache(cacheKey, response);

      if (enablePolling) {
        const pollInterval = setInterval(async () => {
          const updatedScore = await dispatch(updateLeadScore(leadId)).unwrap();
          await setCache(cacheKey, updatedScore);
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(pollInterval);
      }

      setLoadingStates(prev => ({ ...prev, score: LoadingState.SUCCESS }));
      return response;

    } catch (error) {
      setLoadingStates(prev => ({ ...prev, score: LoadingState.ERROR }));
      setErrors(prev => ({ ...prev, score: error.message }));
      showBoundary(error);
      return { engagement: 0, confidence: 0 };
    }
  }, [dispatch, getCache, setCache, showBoundary]);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        if (update.type === 'LEAD_UPDATE') {
          invalidateCache();
          fetchLeads({}, true);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    }
  }, [lastMessage, invalidateCache, fetchLeads]);

  // Initial fetch on mount or filter change
  useEffect(() => {
    if (initialFilters) {
      fetchLeads(initialFilters);
    }
  }, [initialFilters, fetchLeads]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearCache());
    };
  }, [dispatch]);

  return {
    leads,
    loading: loadingStates,
    errors,
    fetchLeads,
    updateStatus,
    getLeadScore,
    connectionState: readyState,
    cacheStats: {
      enabled: cacheConfig.ttl > 0,
      maxSize: cacheConfig.maxSize
    }
  };
};

export default useLeads;