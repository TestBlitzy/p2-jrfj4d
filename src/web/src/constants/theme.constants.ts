import type { ThemeOptions } from '@mui/material'; // v5.0.0

/**
 * Theme mode constants for light and dark themes
 */
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark'
} as const;

/**
 * Core color palette definitions for the application
 * Following Material Design color system guidelines
 */
export const COLORS = {
  PRIMARY: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff'
  },
  SECONDARY: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff'
  },
  SUCCESS: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#ffffff'
  },
  ERROR: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#ffffff'
  },
  WARNING: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#ffffff'
  },
  INFO: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#ffffff'
  },
  GREY: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
} as const;

/**
 * Typography settings for consistent text styling across the application
 * Using system fonts optimized for digital reading
 */
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    primary: "'Inter', sans-serif",
    secondary: "'Roboto', sans-serif",
    monospace: "'Roboto Mono', monospace"
  },
  FONT_SIZE: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    md: '1rem',       // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    xxl: '1.5rem',    // 24px
    display: '2rem'   // 32px
  },
  FONT_WEIGHT: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  LINE_HEIGHT: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
} as const;

/**
 * Spacing constants for consistent layout spacing
 * Based on 8px grid system
 */
export const SPACING = {
  UNIT: 8,
  SIZES: {
    xs: 4,   // 4px
    sm: 8,   // 8px
    md: 16,  // 16px
    lg: 24,  // 24px
    xl: 32,  // 32px
    xxl: 48  // 48px
  }
} as const;

/**
 * Breakpoint definitions for responsive design
 * Following Material-UI's default breakpoint system
 */
export const BREAKPOINTS = {
  values: {
    xs: 0,     // mobile
    sm: 600,   // tablet
    md: 960,   // small laptop
    lg: 1280,  // desktop
    xl: 1920   // large screens
  }
} as const;

/**
 * Z-index constants for consistent layering
 * Following Material-UI's z-index system
 */
export const Z_INDEX = {
  modal: 1300,
  drawer: 1200,
  appBar: 1100,
  tooltip: 1500,
  snackbar: 1400,
  dropdown: 1000
} as const;

// Type definitions for better TypeScript support
export type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];
export type ColorPalette = typeof COLORS;
export type Typography = typeof TYPOGRAPHY;
export type Spacing = typeof SPACING;
export type Breakpoints = typeof BREAKPOINTS;
export type ZIndex = typeof Z_INDEX;