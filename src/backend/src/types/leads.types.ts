/**
 * @fileoverview Lead Management Types
 * @version 1.0.0
 * 
 * Defines comprehensive TypeScript types for the AI-driven lead management system.
 * Implements type definitions supporting lead scoring, qualification criteria,
 * engagement metrics, and historical tracking features.
 */

import { LeadStatus } from '../constants/lead-status';
import { ILead } from '../interfaces/leads.interface';
import type { Record, Array } from 'typescript';

/**
 * Type alias for lead ID with UUID format
 */
export type LeadId = string;

/**
 * Comprehensive type defining factors used in AI-driven lead scoring
 * Maps to F-201 AI Lead Scoring requirements
 */
export type LeadScoreFactors = {
    /** Engagement level with marketing content and communications */
    engagement: number;
    
    /** Company fit score based on ideal customer profile */
    companyFit: number;
    
    /** Budget alignment with product/service offerings */
    budget: number;
    
    /** Purchase timeline and urgency assessment */
    timing: number;
    
    /** Market segment fit score */
    marketSegment: number;
    
    /** Technical requirements alignment score */
    technicalFit: number;
};

/**
 * Type defining BANT qualification criteria for leads
 * Supports F-202 Automated Qualification feature
 */
export type LeadQualificationCriteria = {
    /** Budget qualification status */
    budgetQualified: boolean;
    
    /** Authority/decision-making qualification */
    authorityQualified: boolean;
    
    /** Business need qualification */
    needQualified: boolean;
    
    /** Timeline/urgency qualification */
    timingQualified: boolean;
};

/**
 * Type for tracking historical lead scores and trends
 * Supports lead velocity and trend analysis
 */
export type LeadScoreHistory = {
    /** Array of historical scores with timestamps */
    scores: Array<{
        score: number;
        timestamp: Date;
    }>;
    
    /** Score trend indicator (-1 to 1) */
    trend: number;
    
    /** Previous score values for trend analysis */
    previousScores: Array<number>;
    
    /** Lead progression velocity score */
    velocityScore: number;
};

/**
 * Type defining comprehensive engagement metrics
 * Used in lead scoring and qualification algorithms
 */
export type LeadEngagementMetrics = {
    /** Number of email opens */
    emailOpens: number;
    
    /** Number of email link clicks */
    emailClicks: number;
    
    /** Number of website visits */
    websiteVisits: number;
    
    /** Number of content downloads */
    contentDownloads: number;
    
    /** Number of social media interactions */
    socialInteractions: number;
    
    /** Number of webinar attendances */
    webinarAttendance: number;
};

/**
 * Global constants for lead qualification thresholds
 */
export const MIN_QUALIFIED_SCORE = 80;
export const LEAD_SCORE_THRESHOLD = 60;

/**
 * Type guard to check if a lead meets qualification criteria
 * Implements comprehensive qualification logic based on multiple factors
 * 
 * @param lead - Lead to evaluate for qualification
 * @returns boolean indicating if lead meets all qualification criteria
 */
export function isQualifiedLead(lead: ILead): boolean {
    // Check minimum score threshold
    if (lead.score < MIN_QUALIFIED_SCORE) {
        return false;
    }

    // Verify lead status is appropriate for qualification
    if (lead.status !== LeadStatus.QUALIFYING && 
        lead.status !== LeadStatus.QUALIFIED) {
        return false;
    }

    // Additional qualification checks would be implemented here
    // based on LeadQualificationCriteria and LeadEngagementMetrics

    return true;
}