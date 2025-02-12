/**
 * @fileoverview AI/ML services configuration including model parameters, training settings,
 * and infrastructure configurations for lead scoring, revenue forecasting, and market intelligence models.
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { ErrorCodes } from '../constants';

/**
 * Interface defining the structure of AI model configuration
 */
interface AIModelConfig {
    modelPath: string;
    modelVersion: string;
    minTrainingData: number;
    updateFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    frameworkConfig: Record<string, any>;
}

// Load environment variables
config();

/**
 * AI configuration constants for different model types
 */
export const AI_CONFIG: Record<string, AIModelConfig> = {
    leadScoring: {
        modelPath: process.env.LEAD_SCORING_MODEL_PATH || './models/lead-scoring',
        modelVersion: process.env.LEAD_SCORING_MODEL_VERSION || '1.0.0',
        minTrainingData: 10000, // Minimum 10,000 historical leads required
        updateFrequency: 'monthly',
        frameworkConfig: {
            tensorflow: {
                version: '2.14.0',
                gpu: process.env.AI_USE_GPU === 'true',
                batchSize: Number(process.env.LEAD_SCORING_BATCH_SIZE) || 32,
                epochs: Number(process.env.LEAD_SCORING_EPOCHS) || 100,
                confidenceThreshold: Number(process.env.LEAD_SCORING_CONFIDENCE_THRESHOLD) || 0.8
            }
        }
    },
    revenueForecasting: {
        modelPath: process.env.REVENUE_FORECAST_MODEL_PATH || './models/revenue-forecast',
        modelVersion: process.env.REVENUE_FORECAST_MODEL_VERSION || '1.0.0',
        minTrainingData: 12, // Minimum 12 months of historical data
        updateFrequency: 'quarterly',
        frameworkConfig: {
            scikit: {
                version: '1.3.0',
                randomState: 42,
                testSize: 0.2,
                crossValidationFolds: 5
            }
        }
    },
    marketIntelligence: {
        modelPath: process.env.MARKET_INTELLIGENCE_MODEL_PATH || './models/market-intelligence',
        modelVersion: process.env.MARKET_INTELLIGENCE_MODEL_VERSION || '1.0.0',
        minTrainingData: 1000, // Minimum news articles/data points
        updateFrequency: 'weekly',
        frameworkConfig: {
            bert: {
                version: process.env.BERT_MODEL_VERSION || '1.0.0',
                maxSequenceLength: Number(process.env.BERT_MAX_SEQUENCE_LENGTH) || 512,
                modelType: 'bert-base-uncased',
                vocabSize: 30522,
                hiddenSize: 768,
                numAttentionHeads: 12,
                intermediateSize: 3072,
                hiddenDropoutProb: 0.1,
                attentionProbDropout: 0.1
            }
        }
    }
};

/**
 * Retrieves and validates AI configuration based on environment settings
 * @returns Validated AI configuration object with type safety
 * @throws {Error} If configuration validation fails
 */
export function getAIConfig(): Record<string, AIModelConfig> {
    try {
        const validatedConfig = validateAIConfig(AI_CONFIG);
        if (validatedConfig) {
            return AI_CONFIG;
        }
        throw new Error('AI configuration validation failed');
    } catch (error) {
        throw new Error(`AI configuration error: ${error.message}`);
    }
}

/**
 * Validates AI configuration parameters and throws errors for invalid settings
 * @param config AI configuration object to validate
 * @returns true if configuration is valid
 * @throws {Error} with ErrorCodes.AI_PROCESSING_ERROR if validation fails
 */
export function validateAIConfig(config: Record<string, AIModelConfig>): boolean {
    const requiredModels = ['leadScoring', 'revenueForecasting', 'marketIntelligence'];
    
    // Check for required configuration keys
    for (const model of requiredModels) {
        if (!config[model]) {
            throw new Error(`Missing configuration for ${model} model`);
        }
    }

    // Validate each model configuration
    for (const [modelName, modelConfig] of Object.entries(config)) {
        // Validate model path
        if (!modelConfig.modelPath) {
            throw new Error(`Invalid model path for ${modelName}`);
        }

        // Validate version format (semver)
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(modelConfig.modelVersion)) {
            throw new Error(`Invalid version format for ${modelName}`);
        }

        // Validate minimum training data requirements
        if (modelConfig.minTrainingData <= 0) {
            throw new Error(`Invalid minimum training data for ${modelName}`);
        }

        // Validate update frequency
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
        if (!validFrequencies.includes(modelConfig.updateFrequency)) {
            throw new Error(`Invalid update frequency for ${modelName}`);
        }

        // Validate framework-specific configurations
        if (!modelConfig.frameworkConfig) {
            throw new Error(`Missing framework configuration for ${modelName}`);
        }
    }

    return true;
}