import { useDispatch, useSelector } from 'react-redux'; // v8.0.0
import { useCallback } from 'react'; // v18.2.0
import type { Theme } from '@mui/material'; // v5.0.0

import { THEME_MODES } from '../constants/theme.constants';
import { createAppTheme } from '../config/theme.config';
import { themeActions, selectThemeMode } from '../redux/slices/themeSlice';

/**
 * Interface for theme hook return value with strict typing
 */
interface UseThemeReturn {
  theme: Theme;
  themeMode: typeof THEME_MODES[keyof typeof THEME_MODES];
  toggleTheme: () => void;
  setThemeMode: (mode: typeof THEME_MODES[keyof typeof THEME_MODES]) => void;
}

/**
 * Enhanced custom hook for managing theme state and operations
 * Provides theme switching functionality with error handling and performance optimizations
 * @returns {UseThemeReturn} Theme management utilities and current theme state
 */
const useTheme = (): UseThemeReturn => {
  // Initialize Redux dispatch with type safety
  const dispatch = useDispatch();

  // Get current theme mode from Redux store using memoized selector
  const themeMode = useSelector(selectThemeMode);

  // Validate theme mode
  if (!Object.values(THEME_MODES).includes(themeMode)) {
    console.error('Invalid theme mode detected:', themeMode);
    // Fallback to light theme if invalid mode detected
    dispatch(themeActions.setThemeMode(THEME_MODES.LIGHT));
  }

  /**
   * Memoized theme toggle handler with error boundary
   */
  const toggleTheme = useCallback(() => {
    try {
      dispatch(themeActions.toggleTheme());
    } catch (error) {
      console.error('Failed to toggle theme:', error);
      // Fallback to light theme on error
      dispatch(themeActions.setThemeMode(THEME_MODES.LIGHT));
    }
  }, [dispatch]);

  /**
   * Memoized theme mode setter with validation
   */
  const setThemeMode = useCallback((mode: typeof THEME_MODES[keyof typeof THEME_MODES]) => {
    try {
      // Validate mode before dispatch
      if (!Object.values(THEME_MODES).includes(mode)) {
        throw new Error('Invalid theme mode provided');
      }
      dispatch(themeActions.setThemeMode(mode));
    } catch (error) {
      console.error('Failed to set theme mode:', error);
      // Fallback to light theme on error
      dispatch(themeActions.setThemeMode(THEME_MODES.LIGHT));
    }
  }, [dispatch]);

  /**
   * Generate Material-UI theme based on current mode
   * Wrapped in try-catch for error handling
   */
  let theme: Theme;
  try {
    theme = createAppTheme(themeMode);
  } catch (error) {
    console.error('Failed to create theme:', error);
    // Fallback to light theme on error
    theme = createAppTheme(THEME_MODES.LIGHT);
  }

  return {
    theme,
    themeMode,
    toggleTheme,
    setThemeMode,
  };
};

export default useTheme;