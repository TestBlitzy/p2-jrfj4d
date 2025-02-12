/**
 * Market Intelligence Redux Slice
 * Version: 1.0.0
 * Dependencies:
 * - @reduxjs/toolkit@2.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import {
  Competitor,
  CompetitorActivity,
  MarketTrend,
  PriceAlert,
  MarketState,
  ErrorState,
  TimeframeType,
  ActivityType,
  ImpactLevel
} from '../../types/market.types';
import {
  ACTIVITY_TYPES,
  IMPACT_LEVELS,
  MARKET_REFRESH_INTERVAL,
  COMPETITOR_TRACKING_CONFIG
} from '../../constants/market.constants';
import { MarketService } from '../../services/market.service';
import { LoadingState } from '../../types/common.types';

// Initial state interface
interface MarketSliceState {
  competitors: Competitor[];
  activities: CompetitorActivity[];
  trends: MarketTrend[];
  priceAlerts: PriceAlert[];
  loading: LoadingState;
  error: ErrorState | null;
  lastUpdated: string | null;
  selectedTimeframe: TimeframeType;
  cache: {
    timestamp: number;
    data: any;
  };
}

// Initial state
const initialState: MarketSliceState = {
  competitors: [],
  activities: [],
  trends: [],
  priceAlerts: [],
  loading: LoadingState.IDLE,
  error: null,
  lastUpdated: null,
  selectedTimeframe: TimeframeType.WEEKLY,
  cache: {
    timestamp: 0,
    data: null
  }
};

// Async thunks
export const fetchCompetitors = createAsyncThunk(
  'market/fetchCompetitors',
  async (_, { rejectWithValue }) => {
    try {
      const competitors = await MarketService.getCompetitors();
      return competitors;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: 'FETCH_COMPETITORS_ERROR',
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const fetchMarketTrends = createAsyncThunk(
  'market/fetchMarketTrends',
  async (timeframe: TimeframeType, { rejectWithValue }) => {
    try {
      const trends = await MarketService.getMarketTrends(timeframe);
      return trends;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: 'FETCH_TRENDS_ERROR',
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const createAlert = createAsyncThunk(
  'market/createAlert',
  async (alertData: Omit<PriceAlert, 'id'>, { rejectWithValue }) => {
    try {
      const alert = await MarketService.createPriceAlert(alertData);
      return alert;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: 'CREATE_ALERT_ERROR',
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Market slice
const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setTimeframe(state, action: PayloadAction<TimeframeType>) {
      state.selectedTimeframe = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    updateCache(state, action: PayloadAction<{ data: any; timestamp: number }>) {
      state.cache = action.payload;
    },
    resetState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch competitors
      .addCase(fetchCompetitors.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(fetchCompetitors.fulfilled, (state, action) => {
        state.competitors = action.payload;
        state.loading = LoadingState.SUCCESS;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchCompetitors.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.payload as ErrorState;
      })
      // Fetch market trends
      .addCase(fetchMarketTrends.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(fetchMarketTrends.fulfilled, (state, action) => {
        state.trends = action.payload;
        state.loading = LoadingState.SUCCESS;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchMarketTrends.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.payload as ErrorState;
      })
      // Create price alert
      .addCase(createAlert.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(createAlert.fulfilled, (state, action) => {
        state.priceAlerts.push(action.payload);
        state.loading = LoadingState.SUCCESS;
        state.error = null;
      })
      .addCase(createAlert.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.payload as ErrorState;
      });
  }
});

// Selectors
export const selectMarketState = (state: { market: MarketSliceState }) => state.market;

export const selectCompetitorsByImpact = createSelector(
  [selectMarketState],
  (market) => {
    return market.competitors.reduce((acc, competitor) => {
      const activities = market.activities.filter(a => a.competitorId === competitor.id);
      const highImpactCount = activities.filter(a => a.impactLevel === ImpactLevel.HIGH).length;
      return {
        ...acc,
        [competitor.id]: {
          ...competitor,
          highImpactActivities: highImpactCount,
          recentActivities: activities.slice(0, COMPETITOR_TRACKING_CONFIG.MAX_ACTIVITIES)
        }
      };
    }, {} as Record<string, Competitor & { highImpactActivities: number; recentActivities: CompetitorActivity[] }>);
  }
);

export const selectTrendsByTimeframe = createSelector(
  [selectMarketState, (state: { market: MarketSliceState }) => state.market.selectedTimeframe],
  (market, timeframe) => {
    return market.trends.filter(trend => trend.timeframe === timeframe)
      .sort((a, b) => b.mentionCount - a.mentionCount);
  }
);

export const selectActivePriceAlerts = createSelector(
  [selectMarketState],
  (market) => market.priceAlerts.filter(alert => alert.isActive)
);

// Export actions and reducer
export const { setTimeframe, clearError, updateCache, resetState } = marketSlice.actions;
export default marketSlice.reducer;

// Export middleware
export const marketMiddleware = () => (next: any) => (action: any) => {
  const result = next(action);
  
  if (fetchCompetitors.fulfilled.match(action) || fetchMarketTrends.fulfilled.match(action)) {
    // Setup refresh interval for real-time updates
    setTimeout(() => {
      if (action.type === fetchCompetitors.fulfilled.type) {
        next(fetchCompetitors());
      } else {
        next(fetchMarketTrends(action.meta.arg));
      }
    }, MARKET_REFRESH_INTERVAL);
  }
  
  return result;
};