/**
 * Lead Management Redux Slice
 * Version: 1.0.0
 * 
 * Implements state management for lead-related features including:
 * - F-201 AI Lead Scoring
 * - F-202 Automated Qualification
 * - Lead filtering and pagination
 * - Optimistic updates and caching
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Lead, LeadStatus, LeadFilters } from '../../types/lead.types';
import { LoadingState } from '../../types/common.types';
import leadService from '../../services/lead.service';

// Cache duration in milliseconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initial state interface
interface LeadState {
  leads: Lead[];
  selectedLead: Lead | null;
  filters: LeadFilters;
  loadingStates: Record<string, LoadingState>;
  errors: Record<string, string | null>;
  cache: Record<string, { data: Lead[]; timestamp: number }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// Initial state
const initialState: LeadState = {
  leads: [],
  selectedLead: null,
  filters: {
    status: [],
    scoreRange: [0, 100],
    dateRange: { startDate: new Date(), endDate: new Date() },
    engagementLevel: 0,
    industry: [],
    companySize: []
  },
  loadingStates: {},
  errors: {},
  cache: {},
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0
  }
};

// Async thunks
export const fetchLeadsWithCache = createAsyncThunk(
  'leads/fetchLeads',
  async ({ filters, forceRefresh = false }: { filters: LeadFilters; forceRefresh?: boolean }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { leads: LeadState };
      const cacheKey = JSON.stringify(filters);
      const cached = state.leads.cache[cacheKey];

      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const response = await leadService.getLeads(
        filters,
        {
          page: state.leads.pagination.page,
          pageSize: state.leads.pagination.pageSize
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createLeadWithOptimistic = createAsyncThunk(
  'leads/createLead',
  async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score'>, { dispatch, rejectWithValue }) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticLead: Lead = {
      ...leadData,
      id: tempId,
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: LeadStatus.NEW
    };

    try {
      dispatch(leadSlice.actions.addLeadOptimistic(optimisticLead));
      const response = await leadService.createLead(leadData);
      return response.data;
    } catch (error) {
      dispatch(leadSlice.actions.removeLeadOptimistic(tempId));
      return rejectWithValue(error);
    }
  }
);

export const updateLeadScore = createAsyncThunk(
  'leads/updateScore',
  async (leadId: string, { rejectWithValue }) => {
    try {
      const response = await leadService.getLeadScore(leadId);
      return { leadId, score: response.data.engagement };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const bulkUpdateLeads = createAsyncThunk(
  'leads/bulkUpdate',
  async (leads: { id: string; status: LeadStatus }[], { rejectWithValue }) => {
    try {
      await leadService.bulkUpdateLeads(leads.map(l => l.id));
      return leads;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Slice definition
const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset pagination when filters change
    },
    setSelectedLead: (state, action) => {
      state.selectedLead = action.payload;
    },
    addLeadOptimistic: (state, action) => {
      state.leads.unshift(action.payload);
    },
    removeLeadOptimistic: (state, action) => {
      state.leads = state.leads.filter(lead => lead.id !== action.payload);
    },
    clearCache: (state) => {
      state.cache = {};
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch leads
      .addCase(fetchLeadsWithCache.pending, (state) => {
        state.loadingStates['fetchLeads'] = LoadingState.LOADING;
        state.errors['fetchLeads'] = null;
      })
      .addCase(fetchLeadsWithCache.fulfilled, (state, action) => {
        state.leads = action.payload.items;
        state.pagination.total = action.payload.total;
        state.loadingStates['fetchLeads'] = LoadingState.SUCCESS;
        
        // Update cache
        const cacheKey = JSON.stringify(state.filters);
        state.cache[cacheKey] = {
          data: action.payload.items,
          timestamp: Date.now()
        };
      })
      .addCase(fetchLeadsWithCache.rejected, (state, action) => {
        state.loadingStates['fetchLeads'] = LoadingState.ERROR;
        state.errors['fetchLeads'] = action.payload as string;
      })

      // Create lead
      .addCase(createLeadWithOptimistic.fulfilled, (state, action) => {
        const index = state.leads.findIndex(lead => lead.id === `temp-${action.meta.requestId}`);
        if (index !== -1) {
          state.leads[index] = action.payload;
        }
        state.loadingStates['createLead'] = LoadingState.SUCCESS;
      })
      .addCase(createLeadWithOptimistic.rejected, (state, action) => {
        state.loadingStates['createLead'] = LoadingState.ERROR;
        state.errors['createLead'] = action.payload as string;
      })

      // Update lead score
      .addCase(updateLeadScore.fulfilled, (state, action) => {
        const lead = state.leads.find(l => l.id === action.payload.leadId);
        if (lead) {
          lead.score = action.payload.score;
        }
      })

      // Bulk update
      .addCase(bulkUpdateLeads.fulfilled, (state, action) => {
        action.payload.forEach(update => {
          const lead = state.leads.find(l => l.id === update.id);
          if (lead) {
            lead.status = update.status;
          }
        });
      });
  }
});

// Selectors
export const selectLeadsWithFilters = createSelector(
  [(state: { leads: LeadState }) => state.leads],
  (leadState) => {
    const { leads, filters } = leadState;
    return leads.filter(lead => {
      const matchesStatus = filters.status.length === 0 || filters.status.includes(lead.status);
      const matchesScore = lead.score >= filters.scoreRange[0] && lead.score <= filters.scoreRange[1];
      return matchesStatus && matchesScore;
    });
  }
);

export const selectLeadLoadingState = (state: { leads: LeadState }, operation: string) =>
  state.leads.loadingStates[operation] || LoadingState.IDLE;

// Export actions and reducer
export const { 
  setFilters, 
  setSelectedLead, 
  clearCache, 
  setPagination 
} = leadSlice.actions;

export default leadSlice.reducer;