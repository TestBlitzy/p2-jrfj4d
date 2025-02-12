import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v2.0.0
import { THEME_MODES } from '../../constants/theme.constants';

// Type definitions
type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];

interface ThemeState {
  mode: ThemeMode;
  error?: string;
}

/**
 * Retrieves initial theme from localStorage with fallback to light mode
 * @returns {ThemeMode} The initial theme mode
 */
const getInitialTheme = (): ThemeMode => {
  try {
    const storedTheme = localStorage.getItem('theme');
    return (storedTheme as ThemeMode) || THEME_MODES.LIGHT;
  } catch (error) {
    console.warn('Failed to access localStorage for theme preference:', error);
    return THEME_MODES.LIGHT;
  }
};

// Initial state with persisted theme preference
const initialState: ThemeState = {
  mode: getInitialTheme(),
  error: undefined
};

/**
 * Redux slice for managing application theme state
 */
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Toggles between light and dark theme modes
     */
    toggleTheme: (state) => {
      try {
        const newMode = state.mode === THEME_MODES.LIGHT 
          ? THEME_MODES.DARK 
          : THEME_MODES.LIGHT;
        
        localStorage.setItem('theme', newMode);
        state.mode = newMode;
        state.error = undefined;
      } catch (error) {
        state.error = 'Failed to persist theme preference';
        console.error('Theme toggle error:', error);
      }
    },

    /**
     * Sets a specific theme mode with validation
     */
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      try {
        const newMode = action.payload;
        
        // Validate theme mode
        if (!Object.values(THEME_MODES).includes(newMode)) {
          throw new Error('Invalid theme mode');
        }

        localStorage.setItem('theme', newMode);
        state.mode = newMode;
        state.error = undefined;
      } catch (error) {
        state.error = 'Failed to set theme mode';
        console.error('Theme set error:', error);
      }
    }
  }
});

// Action creators
export const { toggleTheme, setThemeMode } = themeSlice.actions;

/**
 * Selector for accessing current theme mode
 * @param {RootState} state - The root state of the Redux store
 * @returns {ThemeMode} The current theme mode
 */
export const selectThemeMode = (state: { theme: ThemeState }): ThemeMode => state.theme.mode;

/**
 * Selector for accessing theme error state
 * @param {RootState} state - The root state of the Redux store
 * @returns {string | undefined} The current theme error if any
 */
export const selectThemeError = (state: { theme: ThemeState }): string | undefined => state.theme.error;

// Export reducer
export default themeSlice.reducer;