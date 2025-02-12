import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { AnalyticsMetricType } from '../types/analytics.types';

/**
 * DTO for historical data analysis requests
 * Validates and transforms input data for processing historical sales data
 * @version 1.0.0
 */
export class HistoricalDataAnalysisDto {
  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate: Date;

  @IsEnum(AnalyticsMetricType)
  metricType: AnalyticsMetricType;

  @IsInt()
  @Min(1000, { message: 'Minimum 1000 data points required for accurate analysis' })
  minDataPoints: number;

  @ValidateIf((o) => o.startDate && o.endDate)
  validateDateRange(): boolean {
    const monthsDiff = (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return this.startDate < this.endDate && monthsDiff <= 24;
  }
}

/**
 * DTO for revenue forecasting requests
 * Validates and transforms input data for AI-powered revenue forecasting
 * @version 1.0.0
 */
export class RevenueForecastDto {
  @IsInt()
  @Min(1)
  @Max(24, { message: 'Forecast period cannot exceed 24 months' })
  forecastPeriod: number;

  @IsObject()
  @ValidateNested()
  modelConfig: {
    @IsString()
    modelType: string;

    @IsNumber()
    @Min(0)
    @Max(1)
    learningRate: number;

    @IsInt()
    @Min(1)
    epochs: number;
  };

  @IsNumber()
  @Min(0.8)
  @Max(0.99)
  confidenceInterval: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  dimensions: string[];

  @ValidateIf((o) => o.modelConfig)
  validateModelConfig(): boolean {
    const validModelTypes = ['lstm', 'prophet', 'arima'];
    return validModelTypes.includes(this.modelConfig.modelType);
  }
}

/**
 * Data point structure for pattern detection
 * @version 1.0.0
 */
export class DataPoint {
  @IsDate()
  @Transform(({ value }) => new Date(value))
  timestamp: Date;

  @IsNumber()
  value: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for pattern detection requests
 * Validates and transforms input data for pattern recognition in sales data
 * @version 1.0.0
 */
export class PatternDetectionDto {
  @IsString()
  patternType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataPoint)
  @ArrayMinSize(1000, { message: 'Minimum 1000 data points required for pattern detection' })
  dataPoints: DataPoint[];

  @IsNumber()
  @Min(0.85, { message: 'Minimum confidence threshold of 0.85 required' })
  @Max(1)
  confidenceThreshold: number;

  @IsObject()
  @ValidateNested()
  detectionConfig: {
    @IsString()
    algorithm: string;

    @IsObject()
    parameters: Record<string, any>;

    @IsNumber()
    @Min(0)
    @Max(1)
    sensitivity: number;
  };

  @ValidateIf((o) => o.dataPoints)
  validateDataPoints(): boolean {
    if (!this.dataPoints || this.dataPoints.length < 1000) {
      return false;
    }
    
    // Ensure timestamps are sequential
    for (let i = 1; i < this.dataPoints.length; i++) {
      if (this.dataPoints[i].timestamp <= this.dataPoints[i-1].timestamp) {
        return false;
      }
    }
    
    return true;
  }
}