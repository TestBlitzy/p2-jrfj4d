/**
 * @fileoverview Constants for lead management in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import { LeadStatus, LeadSortOption } from '../types/lead.types';
import { DateRange } from '../types/common.types';

/**
 * Score thresholds for AI-based lead prioritization
 * Maps to F-201 AI Lead Scoring feature requirements
 */
export const LEAD_SCORE_THRESHOLDS = {
  /** Threshold for high priority leads (80-100) */
  HIGH_PRIORITY: 80,
  /** Threshold for medium priority leads (50-79) */
  MEDIUM_PRIORITY: 50,
  /** Threshold for low priority leads (0-49) */
  LOW_PRIORITY: 30
} as const;

/**
 * WCAG 2.1 AA compliant color mappings for lead status visualization
 * Ensures accessible color contrast ratios while maintaining visual hierarchy
 */
export const LEAD_STATUS_COLORS = {
  [LeadStatus.NEW]: '#4A90E2',        // Blue - indicates fresh leads
  [LeadStatus.QUALIFIED]: '#7ED321',   // Green - indicates positive qualification
  [LeadStatus.IN_PROGRESS]: '#F5A623', // Orange - indicates active engagement
  [LeadStatus.CONVERTED]: '#50E3C2',   // Teal - indicates successful conversion
  [LeadStatus.DISQUALIFIED]: '#D0021B' // Red - indicates negative qualification
} as const;

/**
 * Default filter configuration for lead management views
 * Optimized for common use cases and AI-driven qualification workflow
 */
export const DEFAULT_LEAD_FILTERS = {
  /** Default visible statuses */
  status: [
    LeadStatus.NEW,
    LeadStatus.QUALIFIED,
    LeadStatus.IN_PROGRESS
  ],
  /** Full score range for comprehensive view */
  scoreRange: [0, 100] as [number, number],
  /** Default to last 30 days of leads */
  dateRange: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: 'LAST_30_DAYS'
  } as DateRange
} as const;

/**
 * Table configuration for lead management interface
 * Supports responsive design and optimal data presentation
 */
export const LEAD_TABLE_CONFIG = {
  /** Number of leads per page */
  pageSize: 25,
  /** Default sorting by AI score descending */
  defaultSort: {
    field: 'score',
    direction: 'desc'
  } as LeadSortOption,
  /** Responsive breakpoints aligned with design system */
  responsiveBreakpoints: {
    mobile: 768,   // Mobile devices up to 768px
    tablet: 1024,  // Tablet devices up to 1024px
    desktop: 1200  // Desktop devices 1200px and above
  },
  /** Column visibility configuration for responsive design */
  columnConfig: {
    mobile: ['name', 'score', 'status'],
    tablet: ['name', 'company', 'score', 'status', 'lastActivity'],
    desktop: ['name', 'company', 'email', 'score', 'status', 'lastActivity', 'actions']
  }
} as const;

/**
 * Score range configuration for lead filtering
 * Supports granular lead segmentation based on AI scoring
 */
export const LEAD_SCORE_RANGES = {
  /** Score ranges for filtering */
  ranges: [
    { min: 0, max: 29, label: 'Low Potential' },
    { min: 30, max: 49, label: 'Moderate Potential' },
    { min: 50, max: 79, label: 'High Potential' },
    { min: 80, max: 100, label: 'Very High Potential' }
  ],
  /** Step size for score range slider */
  step: 5,
  /** Minimum possible score */
  min: 0,
  /** Maximum possible score */
  max: 100
} as const;

/**
 * Configuration for lead list refresh intervals
 * Optimizes real-time updates while managing system load
 */
export const LEAD_REFRESH_CONFIG = {
  /** Auto-refresh interval in milliseconds */
  refreshInterval: 300000, // 5 minutes
  /** Minimum refresh interval allowed */
  minRefreshInterval: 60000, // 1 minute
  /** Maximum refresh interval allowed */
  maxRefreshInterval: 3600000, // 1 hour
  /** Whether auto-refresh is enabled by default */
  defaultAutoRefresh: true
} as const;