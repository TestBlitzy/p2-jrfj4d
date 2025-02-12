/**
 * @fileoverview Core AI utility functions for data preprocessing, model interaction,
 * and AI-related operations across lead scoring, revenue forecasting, and market intelligence features.
 * @version 1.0.0
 */

import { AI_CONFIG } from '../config/ai.config';
import { ErrorCodes } from '../constants';
import * as tf from '@tensorflow/tfjs';
import * as np from 'numpy';
import { AutoTokenizer, TFBertModel } from '@huggingface/transformers';

// Type definitions for AI processing
interface ProcessedData {
  features: number[][];
  labels?: number[];
  metadata: {
    processingTime: number;
    confidenceScore: number;
    validationStatus: boolean;
  };
}

interface MarketInsight {
  trend: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
  sourceData: any;
}

/**
 * Preprocesses lead data for AI model input with enhanced validation
 * @version 2.14.0 tensorflow
 * @param leadData Raw lead data for processing
 * @returns Processed data ready for model consumption
 * @throws {Error} with ErrorCodes.DATA_PREPROCESSING_ERROR if validation fails
 */
export async function preprocessLeadData(leadData: any): Promise<ProcessedData> {
  try {
    const startTime = Date.now();
    
    // Validate input structure
    if (!leadData || typeof leadData !== 'object') {
      throw new Error('Invalid lead data structure');
    }

    // Extract and normalize features
    const numericalFeatures = normalizeNumericalFeatures(leadData);
    const categoricalFeatures = encodeCategoricalFeatures(leadData);
    
    // Combine features
    const combinedFeatures = tf.concat([numericalFeatures, categoricalFeatures], 1);
    
    // Apply feature scaling based on model requirements
    const scaledFeatures = await applyFeatureScaling(
      combinedFeatures,
      AI_CONFIG.leadScoring.frameworkConfig.tensorflow
    );

    return {
      features: await scaledFeatures.array(),
      metadata: {
        processingTime: Date.now() - startTime,
        confidenceScore: calculateConfidenceScore(scaledFeatures),
        validationStatus: true
      }
    };
  } catch (error) {
    throw new Error(`Lead data preprocessing failed: ${error.message}`);
  }
}

/**
 * Analyzes market data using BERT model for intelligence insights
 * @version 4.30.0 transformers
 * @param marketData Raw market data for analysis
 * @returns Processed market insights with confidence scores
 * @throws {Error} with ErrorCodes.AI_PROCESSING_ERROR if analysis fails
 */
export async function analyzeMarketData(marketData: any): Promise<MarketInsight[]> {
  try {
    // Initialize BERT tokenizer and model
    const tokenizer = await AutoTokenizer.from_pretrained(
      AI_CONFIG.marketIntelligence.frameworkConfig.bert.modelType
    );
    
    const model = await TFBertModel.from_pretrained(
      AI_CONFIG.marketIntelligence.frameworkConfig.bert.modelType
    );

    // Preprocess market data
    const encodedData = await tokenizer(marketData.text, {
      maxLength: AI_CONFIG.marketIntelligence.frameworkConfig.bert.maxSequenceLength,
      padding: true,
      truncation: true
    });

    // Generate BERT embeddings
    const outputs = await model(encodedData);
    
    // Extract insights from embeddings
    const insights = await extractMarketInsights(outputs, marketData);
    
    return insights.map(insight => ({
      ...insight,
      confidence: calculateInsightConfidence(insight),
      recommendations: generateRecommendations(insight)
    }));
  } catch (error) {
    throw new Error(`Market data analysis failed: ${error.message}`);
  }
}

/**
 * Preprocesses revenue data for forecasting
 * @param revenueData Historical revenue data
 * @returns Processed revenue data ready for model input
 */
export async function preprocessRevenueData(revenueData: any): Promise<ProcessedData> {
  try {
    // Validate minimum data requirements
    if (!Array.isArray(revenueData) || revenueData.length < AI_CONFIG.revenueForecasting.minTrainingData) {
      throw new Error('Insufficient historical revenue data');
    }

    // Convert to numerical array and handle missing values
    const numericalData = tf.tensor2d(
      revenueData.map(entry => [
        entry.revenue || 0,
        entry.timeStamp || Date.now()
      ])
    );

    // Normalize data
    const normalizedData = await normalizeTimeSeriesData(numericalData);

    return {
      features: await normalizedData.array(),
      metadata: {
        processingTime: Date.now(),
        confidenceScore: calculateTimeSeriesConfidence(normalizedData),
        validationStatus: true
      }
    };
  } catch (error) {
    throw new Error(`Revenue data preprocessing failed: ${error.message}`);
  }
}

/**
 * Calculates lead score using TensorFlow model
 * @param processedData Preprocessed lead data
 * @returns Lead score with confidence metrics
 */
export async function calculateLeadScore(processedData: ProcessedData): Promise<number> {
  try {
    const model = await tf.loadLayersModel(AI_CONFIG.leadScoring.modelPath);
    const prediction = model.predict(tf.tensor2d(processedData.features));
    const score = await (prediction as tf.Tensor).data();
    
    return Math.round(score[0] * 100);
  } catch (error) {
    throw new Error(`Lead score calculation failed: ${error.message}`);
  }
}

/**
 * Generates revenue forecast using processed data
 * @param processedData Processed revenue data
 * @returns Revenue forecast with confidence intervals
 */
export async function generateRevenueForecast(processedData: ProcessedData): Promise<any> {
  try {
    const model = await tf.loadLayersModel(AI_CONFIG.revenueForecasting.modelPath);
    const prediction = model.predict(tf.tensor2d(processedData.features));
    
    return {
      forecast: await (prediction as tf.Tensor).data(),
      confidence: calculateForecastConfidence(prediction as tf.Tensor),
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Revenue forecast generation failed: ${error.message}`);
  }
}

// Private helper functions

function normalizeNumericalFeatures(data: any): tf.Tensor {
  return tf.tidy(() => {
    const features = Object.values(data).filter(val => typeof val === 'number');
    return tf.tensor2d(features, [1, features.length]);
  });
}

function encodeCategoricalFeatures(data: any): tf.Tensor {
  return tf.tidy(() => {
    const categoricalValues = Object.values(data).filter(val => typeof val === 'string');
    const encoded = categoricalValues.map(val => hashString(val));
    return tf.tensor2d(encoded, [1, encoded.length]);
  });
}

function hashString(str: string): number {
  return Array.from(str).reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
}

async function applyFeatureScaling(
  features: tf.Tensor,
  config: any
): Promise<tf.Tensor> {
  return tf.tidy(() => {
    const mean = features.mean(0);
    const std = features.std(0);
    return features.sub(mean).div(std);
  });
}

function calculateConfidenceScore(features: tf.Tensor): number {
  return Math.min(
    features.norm().dataSync()[0] / features.size,
    AI_CONFIG.leadScoring.frameworkConfig.tensorflow.confidenceThreshold
  );
}

async function normalizeTimeSeriesData(data: tf.Tensor): Promise<tf.Tensor> {
  return tf.tidy(() => {
    const min = data.min(0);
    const max = data.max(0);
    return data.sub(min).div(max.sub(min));
  });
}

function calculateTimeSeriesConfidence(data: tf.Tensor): number {
  return data.std().dataSync()[0];
}

function calculateForecastConfidence(prediction: tf.Tensor): number {
  return prediction.std().dataSync()[0];
}

async function extractMarketInsights(
  bertOutputs: any,
  marketData: any
): Promise<MarketInsight[]> {
  // Implementation of market insight extraction using BERT embeddings
  const embeddings = bertOutputs.last_hidden_state;
  // Additional implementation details...
  return [];
}

function calculateInsightConfidence(insight: any): number {
  // Implementation of confidence calculation for market insights
  return 0.85; // Placeholder
}

function generateRecommendations(insight: any): string[] {
  // Implementation of recommendation generation based on insights
  return []; // Placeholder
}