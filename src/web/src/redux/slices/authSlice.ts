import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AuthService from '../../services/auth.service';
import type { AuthState, LoginCredentials, AuthTokens } from '../../types/auth.types';

// Generate device fingerprint using crypto for enhanced security
const generateDeviceFingerprint = (): string => {
  return crypto.randomUUID();
};

// Initial state with enhanced security features
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  loading: false,
  error: null,
  operationStates: {
    loginInProgress: false,
    mfaVerificationInProgress: false,
    tokenRefreshInProgress: false,
    logoutInProgress: false
  },
  lastActivity: Date.now(),
  deviceFingerprint: generateDeviceFingerprint()
};

// Enhanced async thunk for secure login with MFA support
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue, getState }) => {
    try {
      const { deviceFingerprint } = (getState() as { auth: AuthState }).auth;
      const enhancedCredentials = {
        ...credentials,
        deviceFingerprint
      };

      const tokens = await AuthService.login(enhancedCredentials);
      return tokens;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Enhanced async thunk for secure logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Enhanced async thunk for token refresh
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = await AuthService.refreshToken();
      return tokens;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Enhanced async thunk for session validation
export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { getState, dispatch }) => {
    const { lastActivity, deviceFingerprint } = (getState() as { auth: AuthState }).auth;
    const inactivityTimeout = 1800000; // 30 minutes in milliseconds

    // Check session timeout
    if (Date.now() - lastActivity > inactivityTimeout) {
      await dispatch(logout());
      return false;
    }

    try {
      await AuthService.validateSession();
      return true;
    } catch (error) {
      await dispatch(logout());
      return false;
    }
  }
);

// Enhanced auth slice with comprehensive security features
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    resetError: (state) => {
      state.error = null;
    },
    updateDeviceFingerprint: (state) => {
      state.deviceFingerprint = generateDeviceFingerprint();
    }
  },
  extraReducers: (builder) => {
    builder
      // Login action handlers
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operationStates.loginInProgress = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.tokens = action.payload;
        state.user = AuthService.getCurrentUser();
        state.loading = false;
        state.lastActivity = Date.now();
        state.operationStates.loginInProgress = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as any;
        state.operationStates.loginInProgress = false;
      })
      // Logout action handlers
      .addCase(logout.pending, (state) => {
        state.operationStates.logoutInProgress = true;
      })
      .addCase(logout.fulfilled, (state) => {
        return {
          ...initialState,
          deviceFingerprint: state.deviceFingerprint
        };
      })
      .addCase(logout.rejected, (state, action) => {
        state.error = action.payload as any;
        state.operationStates.logoutInProgress = false;
      })
      // Token refresh handlers
      .addCase(refreshToken.pending, (state) => {
        state.operationStates.tokenRefreshInProgress = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
        state.lastActivity = Date.now();
        state.operationStates.tokenRefreshInProgress = false;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload as any;
        state.operationStates.tokenRefreshInProgress = false;
      })
      // Session validation handlers
      .addCase(validateSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.lastActivity = Date.now();
        }
      });
  }
});

// Export actions and selectors
export const { updateLastActivity, resetError, updateDeviceFingerprint } = authSlice.actions;

// Enhanced auth state selector with memoization potential
export const selectAuth = (state: { auth: AuthState }) => state.auth;

// Security state selector for monitoring
export const selectSecurityState = (state: { auth: AuthState }) => ({
  isAuthenticated: state.auth.isAuthenticated,
  operationStates: state.auth.operationStates,
  lastActivity: state.auth.lastActivity,
  deviceFingerprint: state.auth.deviceFingerprint
});

export default authSlice.reducer;