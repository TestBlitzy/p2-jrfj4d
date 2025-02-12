/**
 * @fileoverview Lead Validation Module
 * @version 1.0.0
 * 
 * Implements comprehensive validation logic for lead-related data structures
 * and operations in the AI-driven sales platform. Ensures data integrity and
 * business rule compliance for lead management features.
 */

import Joi, { ValidationError } from 'joi'; // ^17.0.0
import { ILead } from '../interfaces/leads.interface';
import { LeadStatus } from '../constants/lead-status';
import { LeadScoreFactors } from '../types/leads.types';

// Validation Constants
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const MAX_STRING_LENGTH = 255;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const MAX_TAGS = 20;
const MAX_METADATA_SIZE = 5000; // bytes

/**
 * Schema for validating company-related data
 */
const companySchema = Joi.object({
    name: Joi.string().trim().max(MAX_STRING_LENGTH).required(),
    size: Joi.string().valid('1-10', '11-50', '51-200', '201-1000', '1000+'),
    industry: Joi.string().max(MAX_STRING_LENGTH),
    website: Joi.string().uri(),
    revenue: Joi.string(),
    employees: Joi.number().integer().min(1)
});

/**
 * Schema for validating metadata
 */
const metadataSchema = Joi.object({
    source: Joi.string().max(MAX_STRING_LENGTH),
    campaign: Joi.string().max(MAX_STRING_LENGTH),
    customFields: Joi.object().unknown(true),
    lastInteraction: Joi.date().iso(),
    notes: Joi.string().max(1000)
}).max(MAX_METADATA_SIZE);

/**
 * Schema for validating new lead data
 */
const newLeadSchema = Joi.object({
    email: Joi.string().pattern(EMAIL_REGEX).required()
        .messages({
            'string.pattern.base': 'Email must be in a valid format',
            'any.required': 'Email is required'
        }),
    firstName: Joi.string().trim().max(MAX_STRING_LENGTH).required(),
    lastName: Joi.string().trim().max(MAX_STRING_LENGTH).required(),
    company: companySchema.required(),
    title: Joi.string().max(MAX_STRING_LENGTH),
    phone: Joi.string().pattern(PHONE_REGEX)
        .messages({
            'string.pattern.base': 'Phone number must be in E.164 format'
        }),
    status: Joi.string().valid(...Object.values(LeadStatus))
        .default(LeadStatus.NEW),
    tags: Joi.array().items(Joi.string().max(50)).max(MAX_TAGS),
    metadata: metadataSchema
});

/**
 * Schema for validating lead scoring data
 */
const leadScoreSchema = Joi.object({
    leadId: Joi.string().required(),
    score: Joi.number().min(MIN_SCORE).max(MAX_SCORE).required(),
    factors: Joi.object({
        engagement: Joi.number().min(0).max(100).required(),
        companyFit: Joi.number().min(0).max(100).required(),
        intentScore: Joi.number().min(0).max(100).required(),
        behavioralScore: Joi.number().min(0).max(100).required(),
        marketSegment: Joi.number().min(0).max(100),
        technicalFit: Joi.number().min(0).max(100)
    }).required(),
    confidence: Joi.number().min(0).max(1).required(),
    timestamp: Joi.date().iso().max('now').required(),
    modelVersion: Joi.string().required()
});

/**
 * Schema for validating BANT qualification data
 */
const qualificationSchema = Joi.object({
    leadId: Joi.string().required(),
    budget: Joi.object({
        amount: Joi.number().min(0),
        currency: Joi.string().length(3),
        qualified: Joi.boolean().required()
    }).required(),
    authority: Joi.object({
        decisionMaker: Joi.boolean(),
        level: Joi.string().valid('C-Level', 'VP', 'Director', 'Manager', 'Individual'),
        qualified: Joi.boolean().required()
    }).required(),
    needs: Joi.object({
        identified: Joi.boolean(),
        urgency: Joi.number().min(1).max(5),
        qualified: Joi.boolean().required()
    }).required(),
    timeline: Joi.object({
        duration: Joi.string(),
        startDate: Joi.date().iso(),
        qualified: Joi.boolean().required()
    }).required(),
    qualificationStatus: Joi.string().valid(...Object.values(LeadStatus)).required(),
    timestamp: Joi.date().iso().max('now').required()
});

/**
 * Validates data for a new lead with enhanced validation for phone, company, and metadata
 * @param leadData - The lead data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ValidationError if fails
 */
export async function validateNewLead(leadData: Partial<ILead>): Promise<boolean> {
    try {
        await newLeadSchema.validateAsync(leadData, { abortEarly: false });
        return true;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new ValidationError(
                'Lead validation failed',
                error.details,
                error
            );
        }
        throw error;
    }
}

/**
 * Validates enhanced lead scoring data with additional factors
 * @param scoreData - The lead scoring data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ValidationError if fails
 */
export async function validateLeadScore(scoreData: any): Promise<boolean> {
    try {
        await leadScoreSchema.validateAsync(scoreData, { abortEarly: false });
        return true;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new ValidationError(
                'Lead score validation failed',
                error.details,
                error
            );
        }
        throw error;
    }
}

/**
 * Validates lead qualification criteria with BANT framework
 * @param qualificationData - The qualification data to validate
 * @returns Promise<boolean> - Returns true if validation passes, throws ValidationError if fails
 */
export async function validateLeadQualification(qualificationData: any): Promise<boolean> {
    try {
        await qualificationSchema.validateAsync(qualificationData, { abortEarly: false });
        return true;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new ValidationError(
                'Lead qualification validation failed',
                error.details,
                error
            );
        }
        throw error;
    }
}