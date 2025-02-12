/**
 * @fileoverview Lead Management Interfaces
 * @version 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces for the AI-driven lead management system.
 * These interfaces support core lead data structures, AI-based scoring, and automated
 * qualification processes as specified in the technical requirements.
 */

import { LeadStatus } from '../constants/lead-status';

/**
 * Core interface defining the comprehensive structure of a lead entity.
 * Implements requirements from F-201 and F-202 for lead management features.
 * 
 * @interface ILead
 */
export interface ILead {
    /** Unique identifier for the lead */
    id: string;
    
    /** Primary email contact for the lead */
    email: string;
    
    /** Lead's first name */
    firstName: string;
    
    /** Lead's last name */
    lastName: string;
    
    /** Company or organization name */
    company: string;
    
    /** Professional title or position */
    title: string;
    
    /** Contact phone number */
    phone: string;
    
    /** AI-calculated lead score (0-100) */
    score: number;
    
    /** Current status in the lead lifecycle */
    status: LeadStatus;
    
    /** Timestamp of lead creation */
    createdAt: Date;
    
    /** Timestamp of last update */
    updatedAt: Date;
    
    /** Flexible metadata storage for additional attributes */
    metadata: Record<string, any>;
    
    /** Categorization and segmentation tags */
    tags: string[];
}

/**
 * Interface for AI-generated lead scoring data including comprehensive scoring factors.
 * Supports F-201 AI Lead Scoring feature requirements.
 * 
 * @interface ILeadScore
 */
export interface ILeadScore {
    /** Reference to the associated lead */
    leadId: string;
    
    /** Composite AI-calculated score */
    score: number;
    
    /** Individual scoring factors and their values */
    factors: Record<string, number>;
    
    /** Weighting applied to different scoring factors */
    weights: Record<string, number>;
    
    /** AI model confidence level (0-1) */
    confidence: number;
    
    /** Scoring timestamp */
    timestamp: Date;
    
    /** Version of AI model used for scoring */
    modelVersion: string;
    
    /** Additional scoring metadata and context */
    metadata: Record<string, any>;
}

/**
 * Interface for lead qualification data including detailed criteria tracking.
 * Supports F-202 Automated Qualification feature requirements.
 * 
 * @interface ILeadQualification
 */
export interface ILeadQualification {
    /** Reference to the associated lead */
    leadId: string;
    
    /** Current qualification status */
    qualificationStatus: LeadStatus;
    
    /** Map of qualification criteria and their satisfaction */
    criteria: Record<string, boolean>;
    
    /** Numerical qualification score (0-100) */
    qualificationScore: number;
    
    /** List of reasons if lead is disqualified */
    disqualificationReasons: string[];
    
    /** Qualification assessment timestamp */
    timestamp: Date;
    
    /** System or user ID that performed qualification */
    qualifiedBy: string;
    
    /** Additional qualification context and metadata */
    metadata: Record<string, any>;
}