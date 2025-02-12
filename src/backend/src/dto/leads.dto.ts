/**
 * @fileoverview Lead Management Data Transfer Objects (DTOs)
 * @version 1.0.0
 * 
 * Implements comprehensive DTOs for lead management functionality including
 * creation, updates, scoring, and qualification with enhanced validation rules.
 */

import { IsEmail, IsNotEmpty, IsNumber, IsEnum, ValidateNested, IsOptional, IsString, IsUUID, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ILead } from '../interfaces/leads.interface';
import { LeadStatus } from '../constants/lead-status';
import { LeadScoreFactors } from '../types/leads.types';

/**
 * DTO for creating a new lead in the system with comprehensive validation
 * Implements requirements from F-201 and F-202 for lead creation
 */
export class CreateLeadDto implements Pick<ILead, 'email' | 'firstName' | 'lastName' | 'company' | 'status'> {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    lastName: string;

    @IsNotEmpty()
    @IsString()
    company: string;

    @IsEnum(LeadStatus)
    status: LeadStatus = LeadStatus.NEW;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    tags?: string[];
}

/**
 * DTO for updating an existing lead with partial update support
 * Supports flexible updates while maintaining data integrity
 */
export class UpdateLeadDto implements Partial<CreateLeadDto> {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    company?: string;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    tags?: string[];
}

/**
 * DTO for lead scoring data with enhanced validation and type transformation
 * Implements F-201 AI Lead Scoring requirements
 */
export class LeadScoreDto {
    @IsNotEmpty()
    @IsUUID()
    leadId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    score: number;

    @ValidateNested()
    @Type(() => LeadScoreFactorsDto)
    factors: LeadScoreFactors;

    @IsNotEmpty()
    @IsString()
    modelVersion: string;

    @IsDate()
    @Type(() => Date)
    timestamp: Date;
}

/**
 * DTO for lead score factors with comprehensive validation
 * Supports detailed scoring component validation
 */
class LeadScoreFactorsDto implements LeadScoreFactors {
    @IsNumber()
    @Min(0)
    @Max(100)
    engagement: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    companyFit: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    budget: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    timing: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    marketSegment: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    technicalFit: number;
}

/**
 * DTO for lead qualification data with nested validation
 * Implements F-202 Automated Qualification requirements
 */
export class LeadQualificationDto {
    @IsNotEmpty()
    @IsUUID()
    leadId: string;

    @IsNotEmpty()
    @IsEnum(LeadStatus)
    qualificationStatus: LeadStatus;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    qualificationScore: number;

    @ValidateNested()
    @Type(() => QualificationCriteriaDto)
    criteria: Record<string, boolean>;

    @IsDate()
    @Type(() => Date)
    timestamp: Date;
}

/**
 * DTO for qualification criteria with boolean validation
 * Supports BANT and custom qualification criteria
 */
class QualificationCriteriaDto {
    @IsNotEmpty()
    budgetQualified: boolean;

    @IsNotEmpty()
    authorityQualified: boolean;

    @IsNotEmpty()
    needQualified: boolean;

    @IsNotEmpty()
    timingQualified: boolean;
}