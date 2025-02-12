import { createTheme, ThemeOptions } from '@mui/material'; // v5.0.0
import { THEME_MODES, COLORS } from '../constants/theme.constants';
import type { ThemeMode } from '../types/common.types';

/**
 * Generates comprehensive theme options based on the current theme mode
 * @param mode - Current theme mode (light/dark)
 * @returns Complete theme configuration object for Material-UI
 */
export const getThemeOptions = (mode: ThemeMode): ThemeOptions => {
  const isDark = mode === THEME_MODES.DARK;

  return {
    palette: {
      mode,
      primary: COLORS.PRIMARY,
      secondary: COLORS.SECONDARY,
      background: {
        default: isDark ? COLORS.GREY[900] : COLORS.GREY[50],
        paper: isDark ? COLORS.GREY[800] : '#ffffff',
      },
      text: {
        primary: isDark ? COLORS.GREY[100] : COLORS.GREY[900],
        secondary: isDark ? COLORS.GREY[300] : COLORS.GREY[700],
      },
      error: COLORS.ERROR,
      warning: COLORS.WARNING,
      info: COLORS.INFO,
      success: COLORS.SUCCESS,
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
        '@media (max-width:600px)': {
          fontSize: '2rem',
        },
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        '@media (max-width:600px)': {
          fontSize: '1.75rem',
        },
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
        '@media (max-width:600px)': {
          fontSize: '1.5rem',
        },
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    breakpoints: {
      values: {
        xs: 0,    // Mobile
        sm: 768,  // Tablet
        md: 1024, // Small laptop
        lg: 1200, // Desktop
        xl: 1536, // Large screens
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark 
              ? '0px 4px 8px rgba(0, 0, 0, 0.4)'
              : '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isDark ? COLORS.GREY[800] : COLORS.GREY[200]}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? COLORS.GREY[700] : COLORS.GREY[800],
            fontSize: '0.75rem',
            padding: '8px 12px',
            borderRadius: 4,
          },
        },
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.05)',
      '0px 4px 8px rgba(0, 0, 0, 0.1)',
      '0px 8px 16px rgba(0, 0, 0, 0.1)',
      '0px 16px 24px rgba(0, 0, 0, 0.1)',
      ...Array(20).fill('none'), // Fill remaining shadows
    ],
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    zIndex: {
      modal: 1300,
      drawer: 1200,
      appBar: 1100,
      tooltip: 1500,
      snackbar: 1400,
    },
  };
};

/**
 * Creates an optimized Material-UI theme instance with all custom configurations
 * @param mode - Current theme mode (light/dark)
 * @returns Fully configured Material-UI theme instance
 */
export const createAppTheme = (mode: ThemeMode) => {
  const themeOptions = getThemeOptions(mode);
  return createTheme(themeOptions);
};