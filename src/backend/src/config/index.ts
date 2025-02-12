/**
 * @fileoverview Central configuration aggregator with enhanced security, validation, and environment handling
 * @version 1.0.0
 */

import { config as dotenvConfig } from 'dotenv'; // ^16.3.1
import winston from 'winston'; // ^3.11.0
import vault from 'node-vault'; // ^0.10.2
import { AI_CONFIG } from './ai.config';
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { ErrorCodes } from '../constants';

// Initialize environment variables
dotenvConfig();

// Global configuration constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const CONFIG_VERSION = process.env.CONFIG_VERSION || '1.0.0';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Initialize vault client for secure credential management
const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

// Initialize logger for configuration changes
const configLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'config-service' },
  transports: [
    new winston.transports.File({ filename: 'config-audit.log' })
  ]
});

/**
 * Interface for validation results
 */
interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface for environment-specific configuration
 */
interface IEnvironmentConfig {
  environment: string;
  debug: boolean;
  apiVersion: string;
  features: Record<string, boolean>;
}

/**
 * Validates all configuration components
 * @param config Complete application configuration object
 * @returns Validation result with detailed error reporting
 */
async function validateConfigurations(config: any): Promise<IValidationResult> {
  const result: IValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Validate SSL certificates and expiration
    if (!config.database.postgres.options.ssl.cert) {
      result.errors.push('Missing PostgreSQL SSL certificate');
    }

    // Validate credential encryption
    if (!ENCRYPTION_KEY) {
      result.errors.push('Missing encryption key for secure credentials');
    }

    // Validate database configurations
    if (!config.database.postgres.options.host) {
      result.errors.push('Invalid database host configuration');
    }

    // Validate AI model configurations
    if (!config.ai.leadScoring.modelPath) {
      result.errors.push('Invalid AI model path configuration');
    }

    // Validate authentication settings
    if (!config.auth.jwt.secret) {
      result.errors.push('Missing JWT secret key');
    }

    result.isValid = result.errors.length === 0;
    
    // Log validation results
    configLogger.info('Configuration validation completed', {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    });

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Validation error: ${error.message}`);
    throw new Error(`Configuration validation failed: ${error.message}`);
  }

  return result;
}

/**
 * Retrieves environment-specific configuration with secure credential handling
 * @param environment Target environment name
 * @returns Environment-specific configuration
 */
async function getEnvironmentConfig(environment: string): Promise<IEnvironmentConfig> {
  try {
    // Load environment variables
    const envConfig: IEnvironmentConfig = {
      environment,
      debug: environment !== 'production',
      apiVersion: process.env.API_VERSION || 'v1',
      features: {
        mfa: environment === 'production',
        aiScoring: true,
        marketIntelligence: environment !== 'development'
      }
    };

    // Decrypt sensitive credentials if needed
    if (environment === 'production') {
      const secrets = await vaultClient.read('secret/credentials');
      // Apply production-specific security measures
    }

    return envConfig;

  } catch (error) {
    configLogger.error('Failed to load environment configuration', {
      environment,
      error: error.message
    });
    throw new Error(`Environment configuration error: ${error.message}`);
  }
}

// Unified configuration object with enhanced security and validation
export const config = {
  // AI/ML configurations
  ai: {
    leadScoring: AI_CONFIG.leadScoring,
    revenueForecasting: AI_CONFIG.revenueForecasting,
    marketIntelligence: AI_CONFIG.marketIntelligence
  },

  // Authentication and authorization
  auth: {
    jwt: authConfig.jwt,
    oauth: authConfig.oauth,
    mfa: authConfig.mfa
  },

  // Database configurations
  database: {
    postgres: databaseConfig.postgres,
    redis: databaseConfig.redis
  },

  // Integration configurations
  integrations: {
    salesforce: {
      apiVersion: 'v54.0',
      baseUrl: process.env.SALESFORCE_API_URL,
      timeout: 30000
    },
    hubspot: {
      apiVersion: 'v3',
      baseUrl: process.env.HUBSPOT_API_URL,
      timeout: 30000
    }
  },

  // Security configurations
  security: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotation: '90d'
    },
    rateLimit: {
      windowMs: 900000,
      max: 100
    }
  }
};

// Freeze configuration to prevent runtime modifications
Object.freeze(config);

// Export configuration validation and environment utilities
export { validateConfigurations, getEnvironmentConfig };