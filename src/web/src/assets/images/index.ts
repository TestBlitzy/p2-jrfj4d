/**
 * Central index file for managing and exporting all static image assets
 * Used across the Sales & Intelligence Platform web application
 * @version 1.0.0
 */

// Image path constants
export const DEFAULT_AVATAR = '/assets/images/default-avatar.png';
export const LOGO = '/assets/images/logo.png';
export const LOGO_DARK = '/assets/images/logo-dark.png';
export const LOGO_LIGHT = '/assets/images/logo-light.png';
export const DASHBOARD_PLACEHOLDER = '/assets/images/dashboard-placeholder.png';
export const EMPTY_STATE = '/assets/images/empty-state.png';
export const ERROR_404 = '/assets/images/404.png';
export const ERROR_500 = '/assets/images/500.png';

// Standard image dimensions for common assets
export const IMAGE_DIMENSIONS = {
  DEFAULT_AVATAR: { width: 48, height: 48 },
  LOGO: { width: 120, height: 40 },
  LOGO_DARK: { width: 120, height: 40 },
  LOGO_LIGHT: { width: 120, height: 40 },
  ERROR_404: { width: 400, height: 300 },
  ERROR_500: { width: 400, height: 300 },
  DASHBOARD_PLACEHOLDER: { width: 600, height: 400 },
  EMPTY_STATE: { width: 300, height: 200 }
} as const;

// Supported image formats with fallbacks
export const IMAGE_FORMATS = {
  DEFAULT: 'webp',
  FALLBACK: 'png'
} as const;

// Interface for image options
interface ImageOptions {
  size?: 'small' | 'medium' | 'large';
  format?: keyof typeof IMAGE_FORMATS;
  isRTL?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Helper function to get the full URL for an image asset
 * Supports responsive sizes, formats, and RTL layouts
 * @param imageName - Name of the image asset
 * @param options - Configuration options for the image
 * @returns Full URL path to the image asset
 */
export const getImageUrl = (imageName: string, options: ImageOptions = {}): string => {
  const {
    size,
    format = IMAGE_FORMATS.DEFAULT,
    isRTL = false,
    theme
  } = options;

  // Validate image name exists in constants
  if (!validateImagePath(imageName)) {
    console.error(`Invalid image path: ${imageName}`);
    return EMPTY_STATE;
  }

  // Extract base path and file name
  const basePath = imageName.substring(0, imageName.lastIndexOf('/'));
  const fileName = imageName.substring(imageName.lastIndexOf('/') + 1);
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

  // Build path components
  let finalPath = basePath;

  // Add size modifier if specified
  if (size) {
    finalPath += `/${size}`;
  }

  // Add RTL modifier if needed
  if (isRTL) {
    finalPath += '/rtl';
  }

  // Add theme variant if specified
  if (theme) {
    finalPath += `/${theme}`;
  }

  // Construct final file name with format
  const finalFileName = `${fileNameWithoutExt}.${format}`;
  
  // Combine path components
  const fullPath = `${finalPath}/${finalFileName}`;

  // Add cache busting query parameter
  const cacheBuster = process.env.NODE_ENV === 'production' 
    ? `?v=${process.env.BUILD_ID || '1.0.0'}`
    : `?t=${Date.now()}`;

  return `${fullPath}${cacheBuster}`;
};

/**
 * Internal utility to validate image path existence and format
 * @param path - Image path to validate
 * @returns Boolean indicating if the path is valid
 */
export const validateImagePath = (path: string): boolean => {
  // Check if path is defined in constants
  const isDefinedPath = Object.values({
    DEFAULT_AVATAR,
    LOGO,
    LOGO_DARK,
    LOGO_LIGHT,
    DASHBOARD_PLACEHOLDER,
    EMPTY_STATE,
    ERROR_404,
    ERROR_500
  }).includes(path);

  if (!isDefinedPath) {
    return false;
  }

  // Validate file extension
  const extension = path.split('.').pop()?.toLowerCase();
  const validExtensions = Object.values(IMAGE_FORMATS);
  
  if (!extension || !validExtensions.includes(extension as typeof validExtensions[number])) {
    return false;
  }

  // Additional validation could be added here for file size limits,
  // actual file existence checks, etc.

  return true;
};