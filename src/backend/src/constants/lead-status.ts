/**
 * @fileoverview Lead Status Enumeration
 * @version 1.0.0
 * 
 * Defines the possible statuses for leads in the AI-driven lead management system.
 * This enum supports both automated AI-driven status transitions and manual updates,
 * ensuring consistent status representation across all system components.
 */

/**
 * Enumeration of all possible lead statuses in the system.
 * Supports the lead lifecycle from initial creation through qualification and conversion.
 * 
 * @enum {string}
 */
export enum LeadStatus {
    /**
     * Initial status for newly created leads before any processing
     * Assigned when leads are first ingested into the system
     */
    NEW = 'NEW',

    /**
     * Lead is being evaluated by AI scoring system
     * Indicates active AI-driven qualification process
     */
    QUALIFYING = 'QUALIFYING',

    /**
     * Lead has met basic qualification criteria
     * Set after successful AI evaluation and scoring
     */
    QUALIFIED = 'QUALIFIED',

    /**
     * Lead requires additional engagement before sales readiness
     * Used for leads that need more touchpoints or score improvement
     */
    NURTURING = 'NURTURING',

    /**
     * Lead has achieved high AI score and is ready for sales engagement
     * Indicates optimal conditions for sales team handoff
     */
    SALES_READY = 'SALES_READY',

    /**
     * Lead has successfully converted to a customer
     * Final positive outcome in the lead lifecycle
     */
    CONVERTED = 'CONVERTED',

    /**
     * Lead has been disqualified or lost to competition
     * Terminal negative status for unsuccessful leads
     */
    LOST = 'LOST',

    /**
     * Lead has been archived for historical reference
     * Used for maintaining historical data while optimizing active lead management
     */
    ARCHIVED = 'ARCHIVED'
}