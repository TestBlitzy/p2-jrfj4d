/// <reference types="vite/client" />

import { ID } from '../types/common.types';

/**
 * Global constants injected by Vite build process
 * @version 4.4.0
 */
declare const __APP_VERSION__: string;
declare const __API_URL__: string;

/**
 * Environment variables interface for type-safe access to Vite environment configuration
 * Extends ImportMetaEnv from Vite for additional type safety
 */
interface ImportMetaEnv {
  /** Base API URL for backend services */
  readonly VITE_API_URL: string;
  
  /** Application title used across the platform */
  readonly VITE_APP_TITLE: string;
  
  /** WebSocket endpoint for real-time updates */
  readonly VITE_WEBSOCKET_URL: string;
  
  /** Authentication domain for OAuth/SSO integration */
  readonly VITE_AUTH_DOMAIN: string;
  
  /** Analytics service API key */
  readonly VITE_ANALYTICS_KEY: string;
  
  /** AI model endpoint for ML-powered features */
  readonly VITE_AI_MODEL_ENDPOINT: string;
  
  /** Lead scoring API endpoint */
  readonly VITE_LEAD_SCORING_API: string;
  
  /** CRM integration service URL */
  readonly VITE_CRM_INTEGRATION_URL: string;
  
  /** Market intelligence API endpoint */
  readonly VITE_MARKET_INTELLIGENCE_API: string;
  
  /** Error reporting service DSN */
  readonly VITE_ERROR_REPORTING_DSN: string;
}

/**
 * Augment the global ImportMeta interface for Vite
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Type assertion for environment variables to ensure they are strings
 */
type EnvValue = string;

/**
 * Ensure all environment variables are readonly and type-safe
 */
declare module '*.env' {
  const env: Readonly<Record<string, EnvValue>>;
  export default env;
}

/**
 * Module declarations for static assets
 */
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: { [key: string]: any };
  export default content;
}

/**
 * Global window augmentation for runtime configuration
 */
declare interface Window {
  __APP_CONFIG__: {
    version: string;
    environment: string;
    apiUrl: string;
    features: Record<string, boolean>;
  };
}

export {};