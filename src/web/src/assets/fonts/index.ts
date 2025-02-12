/**
 * @fileoverview Font configuration and management for Sales & Intelligence Platform
 * @version 1.0.0
 * 
 * This module centralizes font assets and configurations, ensuring consistent
 * typography across all components with enhanced type safety, performance
 * optimization, and accessibility features.
 */

// @fontsource/inter v5.0.0 - Primary font family
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

// @fontsource/roboto v5.0.0 - Secondary font family
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';

/**
 * Font family configuration interface defining primary, secondary, and fallback fonts
 */
export interface FontFamilyConfig {
  primary: string;
  secondary: string;
  fallback: string;
}

/**
 * Font weight configuration interface for consistent typography
 */
export interface FontWeightConfig {
  regular: number;
  medium: number;
  bold: number;
}

/**
 * Font family configurations with fallback chain
 */
export const fontFamilies: FontFamilyConfig = {
  primary: 'Inter',
  secondary: 'Roboto',
  fallback: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif'
};

/**
 * Standardized font weights across the application
 */
export const fontWeights: FontWeightConfig = {
  regular: 400,
  medium: 500,
  bold: 600
};

/**
 * Tracks the loading status of font families
 */
const fontLoadingStatus = {
  inter: false,
  roboto: false
};

/**
 * Loads required font families with performance optimization and error handling
 * @returns Promise that resolves when fonts are loaded or rejects with error details
 */
export const loadFonts = async (): Promise<void> => {
  try {
    const startTime = performance.now();

    // Load Inter font family
    const interFontPromise = document.fonts.load(`${fontWeights.regular}px ${fontFamilies.primary}`)
      .then(() => document.fonts.load(`${fontWeights.medium}px ${fontFamilies.primary}`))
      .then(() => document.fonts.load(`${fontWeights.bold}px ${fontFamilies.primary}`))
      .then(() => { fontLoadingStatus.inter = true; });

    // Load Roboto font family
    const robotoFontPromise = document.fonts.load(`${fontWeights.regular}px ${fontFamilies.secondary}`)
      .then(() => document.fonts.load(`${fontWeights.medium}px ${fontFamilies.secondary}`))
      .then(() => document.fonts.load(`${fontWeights.bold}px ${fontFamilies.secondary}`))
      .then(() => { fontLoadingStatus.roboto = true; });

    // Wait for all fonts to load
    await Promise.all([interFontPromise, robotoFontPromise]);

    const loadTime = performance.now() - startTime;
    console.debug(`Fonts loaded in ${loadTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('Error loading fonts:', error);
    // Fallback to system fonts if loading fails
    document.documentElement.style.setProperty('font-family', fontFamilies.fallback);
    throw new Error('Font loading failed, falling back to system fonts');
  }
};

/**
 * Preloads critical font weights for optimal performance
 */
export const preloadCriticalFonts = (): void => {
  const createPreloadLink = (family: string, weight: number): void => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = `/@fontsource/${family}/${weight}.css`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  };

  // Preload primary font critical weights
  createPreloadLink('inter', fontWeights.regular);
  createPreloadLink('inter', fontWeights.medium);

  // Set font-display strategy
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: ${fontFamilies.primary};
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};