/**
 * @fileoverview TypeScript type definitions for lead management in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { SortDirection } from '../types/common.types';
// typescript ^5.0.0

/**
 * Enum defining possible lead statuses in the sales pipeline
 */
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  IN_PROGRESS = 'IN_PROGRESS',
  CONVERTED = 'CONVERTED',
  DISQUALIFIED = 'DISQUALIFIED'
}

/**
 * Core lead interface containing essential lead information
 */
export interface Lead {
  /** Unique identifier for the lead */
  id: string;
  /** Lead's first name */
  firstName: string;
  /** Lead's last name */
  lastName: string;
  /** Lead's email address */
  email: string;
  /** Lead's company name */
  company: string;
  /** Current status in the sales pipeline */
  status: LeadStatus;
  /** AI-calculated lead score (0-100) */
  score: number;
  /** Timestamp of lead creation */
  createdAt: Date;
  /** Timestamp of last update */
  updatedAt: Date;
}

/**
 * Comprehensive interface for AI-driven lead scoring metrics
 * Maps to F-201 AI Lead Scoring feature
 */
export interface LeadScoreMetrics {
  /** Overall engagement score (0-100) */
  engagement: number;
  /** Company fit score based on ideal customer profile (0-100) */
  companyFit: number;
  /** Budget alignment score (0-100) */
  budget: number;
  /** Purchase timing indicator score (0-100) */
  timing: number;
  /** Industry alignment score (0-100) */
  industryAlignment: number;
  /** Technical requirements fit score (0-100) */
  technicalFit: number;
  /** Decision maker engagement level (0-100) */
  decisionMakerEngagement: number;
}

/**
 * Detailed interface for tracking lead engagement metrics
 * Supports F-203 Engagement Tracking feature
 */
export interface LeadEngagement {
  /** Number of email opens */
  emailOpens: number;
  /** Number of email link clicks */
  emailClicks: number;
  /** Number of website visits */
  websiteVisits: number;
  /** Number of content downloads */
  contentDownloads: number;
  /** Number of meetings scheduled */
  meetingsScheduled: number;
  /** Number of product demonstrations attended */
  productDemos: number;
  /** Number of social media interactions */
  socialInteractions: number;
  /** Date of last interaction */
  lastInteractionDate: Date;
}

/**
 * Enhanced interface for advanced lead filtering options
 * Supports lead management workflow and qualification process
 */
export interface LeadFilters {
  /** Filter by one or more lead statuses */
  status: LeadStatus[];
  /** Filter by score range [min, max] */
  scoreRange: [number, number];
  /** Filter by date range */
  dateRange: DateRange;
  /** Filter by minimum engagement level */
  engagementLevel: number;
  /** Filter by industry types */
  industry: string[];
  /** Filter by company size categories */
  companySize: string[];
}

/**
 * Interface for lead sorting options
 * Supports consistent sorting behavior across lead management views
 */
export interface LeadSortOption {
  /** Field to sort by */
  field: keyof Lead;
  /** Sort direction */
  direction: SortDirection;
}