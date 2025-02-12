/**
 * @fileoverview Data Transfer Objects for external service integrations
 * Handles request/response data validation and transformation between API layer and service layer
 * @version 1.0.0
 */

import { 
    IsString, 
    IsEnum, 
    IsNumber, 
    IsOptional, 
    IsDate, 
    IsNotEmpty, 
    ValidateNested,
    IsUrl,
    Min
} from 'class-validator';
import { 
    Exclude, 
    Transform, 
    Type 
} from 'class-transformer';
import { 
    IntegrationType,
    IntegrationAuthType,
    IntegrationStatus 
} from '../constants/integration-types';

/**
 * DTO for creating a new integration with validation
 * Enforces required fields and data types for integration setup
 */
export class CreateIntegrationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(IntegrationType)
    type: IntegrationType;

    @ValidateNested()
    @Type(() => IntegrationConfigDto)
    config: IntegrationConfigDto;

    @ValidateNested()
    @Type(() => IntegrationCredentialsDto)
    credentials: IntegrationCredentialsDto;
}

/**
 * DTO for updating an existing integration with validation
 * Allows partial updates with optional fields
 */
export class UpdateIntegrationDto {
    @IsString()
    @IsOptional()
    name?: string;

    @ValidateNested()
    @IsOptional()
    @Type(() => IntegrationConfigDto)
    config?: IntegrationConfigDto;

    @ValidateNested()
    @IsOptional()
    @Type(() => IntegrationCredentialsDto)
    credentials?: IntegrationCredentialsDto;

    @IsEnum(IntegrationStatus)
    @IsOptional()
    status?: IntegrationStatus;
}

/**
 * DTO for integration configuration settings with validation
 * Defines core integration parameters and constraints
 */
export class IntegrationConfigDto {
    @IsString()
    @IsNotEmpty()
    apiVersion: string;

    @IsString()
    @IsUrl()
    baseUrl: string;

    @IsEnum(IntegrationAuthType)
    authType: IntegrationAuthType;

    @IsNumber()
    @Min(1)
    rateLimit: number;
}

/**
 * DTO for integration authentication credentials with validation and security
 * Handles sensitive authentication data with appropriate exclusion policies
 */
export class IntegrationCredentialsDto {
    @IsString()
    @IsOptional()
    @Exclude({ toPlainOnly: true })
    clientId?: string;

    @IsString()
    @IsOptional()
    @Exclude({ toPlainOnly: true })
    clientSecret?: string;

    @IsString()
    @IsOptional()
    @Exclude({ toPlainOnly: true })
    apiKey?: string;

    @IsString()
    @IsOptional()
    @Exclude({ toPlainOnly: true })
    accessToken?: string;

    @IsString()
    @IsOptional()
    @Exclude({ toPlainOnly: true })
    refreshToken?: string;

    @IsDate()
    @IsOptional()
    @Transform(({ value }) => new Date(value))
    expiresAt?: Date;
}