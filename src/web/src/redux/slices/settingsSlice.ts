import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^2.0.0
import { 
  SettingsState, 
  UserSettings, 
  IntegrationConfig, 
  NotificationPreferences,
  DisplaySettings
} from '../../types/settings.types';
import { settingsService } from '../../services/settings.service';
import { LoadingState } from '../../types/common.types';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 300000;
const RETRY_ATTEMPTS = 3;

// Initial state with proper typing
const initialState: SettingsState = {
  settings: {} as UserSettings,
  loading: false,
  error: null,
  cache: {
    timestamp: 0,
    lastUpdated: null
  }
};

/**
 * Async thunk for fetching user settings with caching
 */
export const fetchUserSettings = createAsyncThunk(
  'settings/fetchUserSettings',
  async (userId: string, { rejectWithValue, getState }) => {
    try {
      // Check cache validity
      const state = getState() as { settings: SettingsState };
      const { cache } = state.settings;
      
      if (cache.timestamp && Date.now() - cache.timestamp < CACHE_DURATION) {
        return state.settings.settings;
      }

      const settings = await settingsService.getUserSettings(userId);
      return settings;
    } catch (error) {
      console.error('[Settings Slice] fetchUserSettings error:', error);
      return rejectWithValue('Failed to fetch user settings');
    }
  }
);

/**
 * Async thunk for updating user settings
 */
export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async ({ userId, settings }: { userId: string; settings: Partial<UserSettings> }, 
    { rejectWithValue }) => {
    try {
      const updatedSettings = await settingsService.updateUserSettings(userId, settings);
      return updatedSettings;
    } catch (error) {
      console.error('[Settings Slice] updateSettings error:', error);
      return rejectWithValue('Failed to update settings');
    }
  }
);

/**
 * Async thunk for updating integration configuration
 */
export const updateIntegrationConfig = createAsyncThunk(
  'settings/updateIntegrationConfig',
  async ({ userId, config }: { userId: string; config: IntegrationConfig }, 
    { rejectWithValue }) => {
    try {
      const result = await settingsService.testIntegrationConnection(
        config.type,
        config
      );
      
      if (result.success) {
        const updatedSettings = await settingsService.updateUserSettings(userId, {
          integrations: [config]
        });
        return updatedSettings;
      }
      
      return rejectWithValue('Integration connection failed');
    } catch (error) {
      console.error('[Settings Slice] updateIntegrationConfig error:', error);
      return rejectWithValue('Failed to update integration configuration');
    }
  }
);

/**
 * Settings slice with enhanced caching and error handling
 */
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null;
    },
    invalidateCache: (state) => {
      state.cache.timestamp = 0;
    },
    updateThemeSettings: (state, action: PayloadAction<DisplaySettings>) => {
      state.settings.displaySettings = action.payload;
      state.cache.lastUpdated = new Date().toISOString();
    },
    updateNotificationPreferences: (state, action: PayloadAction<NotificationPreferences>) => {
      state.settings.notificationPreferences = action.payload;
      state.cache.lastUpdated = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings cases
      .addCase(fetchUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loading = false;
        state.error = null;
        state.cache = {
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString()
        };
      })
      .addCase(fetchUserSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update settings cases
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loading = false;
        state.error = null;
        state.cache.lastUpdated = new Date().toISOString();
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update integration cases
      .addCase(updateIntegrationConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIntegrationConfig.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loading = false;
        state.error = null;
        state.cache.lastUpdated = new Date().toISOString();
      })
      .addCase(updateIntegrationConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { 
  clearSettingsError, 
  invalidateCache, 
  updateThemeSettings,
  updateNotificationPreferences 
} = settingsSlice.actions;

// Selectors
export const selectSettings = (state: { settings: SettingsState }) => state.settings.settings;
export const selectThemeSettings = (state: { settings: SettingsState }) => 
  state.settings.settings.displaySettings;
export const selectNotificationPreferences = (state: { settings: SettingsState }) => 
  state.settings.settings.notificationPreferences;
export const selectIntegrations = (state: { settings: SettingsState }) => 
  state.settings.settings.integrations;
export const selectSettingsError = (state: { settings: SettingsState }) => state.settings.error;
export const selectSettingsLoading = (state: { settings: SettingsState }) => state.settings.loading;
export const selectCacheStatus = (state: { settings: SettingsState }) => state.settings.cache;

// Export reducer
export default settingsSlice.reducer;