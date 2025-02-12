import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.x
import { createSelector } from '@reduxjs/toolkit'; // v1.9.x
import AnalyticsService from '../../services/analytics.service';
import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  AnalyticsInsight,
  TimeRange
} from '../../types/analytics.types';
import { 
  ANALYTICS_THRESHOLDS,
  ANALYTICS_TIME_RANGES,
  PATTERN_RECOGNITION_CONFIG,
  MARKET_TREND_CONFIG
} from '../../constants/analytics.constants';
import { LoadingState } from '../../types/common.types';

// State interface
interface AnalyticsState {
  historicalData: AnalyticsDataPoint[];
  revenueForecast: RevenueForecast | null;
  patternAnalysis: AnalyticsInsight[];
  marketTrends: MarketTrend[];
  loading: LoadingState;
  error: string | null;
  selectedTimeRange: string;
  selectedMetricType: AnalyticsMetricType;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
  realTimeConfig: {
    enabled: boolean;
    updateInterval: number;
  };
}

// Initial state
const initialState: AnalyticsState = {
  historicalData: [],
  revenueForecast: null,
  patternAnalysis: [],
  marketTrends: [],
  loading: LoadingState.IDLE,
  error: null,
  selectedTimeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
  selectedMetricType: AnalyticsMetricType.REVENUE,
  pagination: {
    currentPage: 1,
    pageSize: 50,
    totalItems: 0
  },
  realTimeConfig: {
    enabled: true,
    updateInterval: 5000
  }
};

// Async thunks
export const fetchHistoricalData = createAsyncThunk(
  'analytics/fetchHistoricalData',
  async ({ 
    timeRange, 
    metricType, 
    page, 
    pageSize 
  }: {
    timeRange: string;
    metricType: AnalyticsMetricType;
    page: number;
    pageSize: number;
  }) => {
    const analyticsService = new AnalyticsService();
    const response = await analyticsService.getHistoricalData(
      metricType,
      timeRange,
      true
    );
    return response;
  }
);

export const fetchRevenueForecast = createAsyncThunk(
  'analytics/fetchRevenueForecast',
  async ({ 
    forecastPeriod, 
    confidenceLevel = ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD 
  }: {
    forecastPeriod: number;
    confidenceLevel?: number;
  }) => {
    const analyticsService = new AnalyticsService();
    return await analyticsService.getRevenueForecast(forecastPeriod, confidenceLevel);
  }
);

export const fetchPatternAnalysis = createAsyncThunk(
  'analytics/fetchPatternAnalysis',
  async ({ 
    metricType, 
    confidenceThreshold = PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD 
  }: {
    metricType: AnalyticsMetricType;
    confidenceThreshold?: number;
  }) => {
    const analyticsService = new AnalyticsService();
    return await analyticsService.getAnalyticsInsights(metricType, confidenceThreshold);
  }
);

export const fetchMarketTrends = createAsyncThunk(
  'analytics/fetchMarketTrends',
  async ({ 
    timeRange, 
    significanceThreshold = MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD 
  }: {
    timeRange: string;
    significanceThreshold?: number;
  }) => {
    const analyticsService = new AnalyticsService();
    const response = await analyticsService.getMarketTrends(timeRange, significanceThreshold);
    return response;
  }
);

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setTimeRange: (state, action: PayloadAction<string>) => {
      state.selectedTimeRange = action.payload;
    },
    setMetricType: (state, action: PayloadAction<AnalyticsMetricType>) => {
      state.selectedMetricType = action.payload;
    },
    setRealTimeConfig: (state, action: PayloadAction<{ enabled: boolean; interval?: number }>) => {
      state.realTimeConfig = {
        ...state.realTimeConfig,
        ...action.payload
      };
    },
    updatePagination: (state, action: PayloadAction<{ page?: number; pageSize?: number }>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    },
    clearAnalyticsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Historical Data
    builder
      .addCase(fetchHistoricalData.pending, (state) => {
        state.loading = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(fetchHistoricalData.fulfilled, (state, action) => {
        state.loading = LoadingState.SUCCESS;
        state.historicalData = action.payload;
      })
      .addCase(fetchHistoricalData.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.error.message || 'Failed to fetch historical data';
      })

    // Revenue Forecast
      .addCase(fetchRevenueForecast.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(fetchRevenueForecast.fulfilled, (state, action) => {
        state.loading = LoadingState.SUCCESS;
        state.revenueForecast = action.payload;
      })
      .addCase(fetchRevenueForecast.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.error.message || 'Failed to fetch revenue forecast';
      })

    // Pattern Analysis
      .addCase(fetchPatternAnalysis.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(fetchPatternAnalysis.fulfilled, (state, action) => {
        state.loading = LoadingState.SUCCESS;
        state.patternAnalysis = action.payload;
      })
      .addCase(fetchPatternAnalysis.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.error.message || 'Failed to fetch pattern analysis';
      })

    // Market Trends
      .addCase(fetchMarketTrends.pending, (state) => {
        state.loading = LoadingState.LOADING;
      })
      .addCase(fetchMarketTrends.fulfilled, (state, action) => {
        state.loading = LoadingState.SUCCESS;
        state.marketTrends = action.payload;
      })
      .addCase(fetchMarketTrends.rejected, (state, action) => {
        state.loading = LoadingState.ERROR;
        state.error = action.error.message || 'Failed to fetch market trends';
      });
  }
});

// Selectors
export const selectAnalyticsState = (state: { analytics: AnalyticsState }) => state.analytics;

export const selectFilteredAnalytics = createSelector(
  [selectAnalyticsState, (state, metricType: AnalyticsMetricType) => metricType],
  (analytics, metricType) => analytics.historicalData.filter(
    data => data.metricType === metricType
  )
);

export const selectPatternsByConfidence = createSelector(
  [selectAnalyticsState, (state, threshold: number) => threshold],
  (analytics, threshold) => analytics.patternAnalysis.filter(
    pattern => pattern.confidence >= threshold
  )
);

export const selectTrendsBySignificance = createSelector(
  [selectAnalyticsState, (state, threshold: number) => threshold],
  (analytics, threshold) => analytics.marketTrends.filter(
    trend => trend.confidence >= threshold
  )
);

// Export actions and reducer
export const { 
  setTimeRange, 
  setMetricType, 
  setRealTimeConfig, 
  updatePagination, 
  clearAnalyticsError 
} = analyticsSlice.actions;

export default analyticsSlice.reducer;