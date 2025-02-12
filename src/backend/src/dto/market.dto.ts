/**
 * @fileoverview Data Transfer Objects for market intelligence functionality
 * @version 1.0.0
 * @license MIT
 */

import {
  IsString,
  IsNumber,
  IsDate,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
  IsUrl,
  Min,
  Max,
  Length,
  IsUUID,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ActivityType,
  ImpactLevel,
  SentimentType,
  TimeframeType,
  AlertCondition
} from '../types/market.types';

/**
 * DTO for creating a new competitor record
 * @class CreateCompetitorDto
 */
export class CreateCompetitorDto {
  @IsString({ message: 'Name must be a valid string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsString({ message: 'Website must be a valid URL' })
  website: string;

  @IsString({ message: 'Description must be a valid string' })
  @Length(10, 1000, { message: 'Description must be between 10 and 1000 characters' })
  description: string;

  @IsNumber({}, { message: 'Market share must be a valid number' })
  @Min(0, { message: 'Market share must be non-negative' })
  @Max(100, { message: 'Market share must not exceed 100' })
  @Transform(({ value }) => parseFloat(value))
  marketShare: number;
}

/**
 * DTO for logging a new competitor activity
 * @class CreateCompetitorActivityDto
 */
export class CreateCompetitorActivityDto {
  @IsUUID('4', { message: 'Invalid competitor ID format' })
  competitorId: string;

  @IsEnum(ActivityType, { message: 'Invalid activity type' })
  type: ActivityType;

  @IsString({ message: 'Description must be a valid string' })
  @Length(10, 500, { message: 'Description must be between 10 and 500 characters' })
  description: string;

  @IsEnum(ImpactLevel, { message: 'Invalid impact level' })
  impactLevel: ImpactLevel;

  @IsDate({ message: 'Invalid date format' })
  @Transform(({ value }) => new Date(value))
  date: Date;
}

/**
 * DTO for creating a new market trend tracking entry
 * @class CreateMarketTrendDto
 */
export class CreateMarketTrendDto {
  @IsString({ message: 'Keyword must be a valid string' })
  @Length(2, 50, { message: 'Keyword must be between 2 and 50 characters' })
  keyword: string;

  @IsNumber({}, { message: 'Mention count must be a valid number' })
  @Min(0, { message: 'Mention count must be non-negative' })
  @Transform(({ value }) => parseInt(value))
  mentionCount: number;

  @IsEnum(SentimentType, { message: 'Invalid sentiment type' })
  sentiment: SentimentType;

  @IsEnum(TimeframeType, { message: 'Invalid timeframe type' })
  timeframe: TimeframeType;

  @IsArray({ message: 'Sources must be an array' })
  @IsString({ each: true, message: 'Each source must be a valid string' })
  sources: string[];
}

/**
 * DTO for creating a new price alert
 * @class CreatePriceAlertDto
 */
export class CreatePriceAlertDto {
  @IsUUID('4', { message: 'Invalid competitor product ID format' })
  competitorProductId: string;

  @IsEnum(AlertCondition, { message: 'Invalid alert condition' })
  condition: AlertCondition;

  @IsNumber({}, { message: 'Threshold must be a valid number' })
  @Min(0, { message: 'Threshold must be non-negative' })
  @Transform(({ value }) => parseFloat(value))
  threshold: number;

  @IsBoolean({ message: 'isActive must be a boolean value' })
  @IsOptional()
  isActive: boolean = true;
}

/**
 * DTO for updating an existing competitor
 * @class UpdateCompetitorDto
 */
export class UpdateCompetitorDto extends CreateCompetitorDto {
  @IsUUID('4', { message: 'Invalid competitor ID format' })
  id: string;

  @IsOptional()
  @IsString({ message: 'Name must be a valid string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  website?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a valid string' })
  @Length(10, 1000, { message: 'Description must be between 10 and 1000 characters' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Market share must be a valid number' })
  @Min(0, { message: 'Market share must be non-negative' })
  @Max(100, { message: 'Market share must not exceed 100' })
  @Transform(({ value }) => parseFloat(value))
  marketShare?: number;
}