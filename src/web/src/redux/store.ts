import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'; // v2.0.0
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import analyticsReducer from './slices/analyticsSlice';

/**
 * Configure and create the Redux store with enhanced middleware, performance optimizations,
 * and development tools for the Sales & Intelligence Platform
 */
const configureAppStore = () => {
  // Configure enhanced middleware with custom serialization checks
  const middleware = getDefaultMiddleware({
    // Customize serialization to ignore specific paths and actions
    serializableCheck: {
      // Ignore Redux-Persist actions
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      // Ignore non-serializable data in specific paths
      ignoredPaths: [
        'analytics.historicalData.rawData',
        'analytics.revenueForecast.modelMetadata',
        'auth.tokens.expiresAt'
      ]
    },
    // Enable immutability checks in development
    immutableCheck: process.env.NODE_ENV === 'development',
    // Configure thunk with extra argument if needed
    thunk: {
      extraArgument: undefined
    }
  });

  // Create store with optimized configuration
  const store = configureStore({
    reducer: {
      theme: themeReducer,
      auth: authReducer,
      analytics: analyticsReducer
    },
    middleware,
    // Enable Redux DevTools in development only
    devTools: process.env.NODE_ENV === 'development',
    // Preloaded state if needed
    preloadedState: undefined,
    // Enhance store with additional capabilities
    enhancers: []
  });

  // Enable hot module replacement for reducers in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./slices/themeSlice', () => {
      store.replaceReducer(themeReducer);
    });
    module.hot.accept('./slices/authSlice', () => {
      store.replaceReducer(authReducer);
    });
    module.hot.accept('./slices/analyticsSlice', () => {
      store.replaceReducer(analyticsReducer);
    });
  }

  return store;
};

// Create the store instance
export const store = configureAppStore();

// Export types for global usage
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store instance as default
export default store;