/**
 * @fileoverview A React component for displaying lead status with color-coded badges and accessibility support
 * @version 1.0.0
 */

import React from 'react';
import { LeadStatus as LeadStatusEnum } from '../../types/lead.types';
import { LEAD_STATUS_COLORS } from '../../constants/lead.constants';
import Badge from '../common/Badge';

/**
 * Props interface for the LeadStatus component
 */
interface LeadStatusProps {
  /** Current status of the lead */
  status: LeadStatusEnum;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Size variant of the status badge */
  size?: 'small' | 'medium' | 'large';
  /** Test ID for component testing */
  testId?: string;
}

/**
 * Maps lead status to appropriate badge variant with WCAG compliance
 * @param status - Current lead status
 * @returns Appropriate badge variant based on status
 */
const getStatusVariant = (status: LeadStatusEnum): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case LeadStatusEnum.NEW:
      return 'primary'; // Blue for new leads
    case LeadStatusEnum.QUALIFIED:
      return 'success'; // Green for qualified leads
    case LeadStatusEnum.IN_PROGRESS:
      return 'warning'; // Orange for in-progress leads
    case LeadStatusEnum.CONVERTED:
      return 'info'; // Teal for converted leads
    case LeadStatusEnum.DISQUALIFIED:
      return 'danger'; // Red for disqualified leads
    default:
      return 'primary'; // Fallback to primary variant
  }
};

/**
 * Maps lead status to human-readable text
 * @param status - Current lead status
 * @returns User-friendly status text
 */
const getStatusText = (status: LeadStatusEnum): string => {
  return status.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * A component that displays the status of a lead using a color-coded badge
 * Implements F-202 Automated Qualification feature with visual status indicators
 */
export const LeadStatus: React.FC<LeadStatusProps> = React.memo(({
  status,
  className = '',
  size = 'medium',
  testId = 'lead-status'
}) => {
  // Get the appropriate variant and text for the status
  const variant = getStatusVariant(status);
  const statusText = getStatusText(status);

  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
      testId={testId}
      rounded
      animated
      ariaLabel={`Lead status: ${statusText}`}
      style={{
        backgroundColor: LEAD_STATUS_COLORS[status],
        transition: 'background-color 0.2s ease-in-out'
      }}
    >
      {statusText}
    </Badge>
  );
});

// Display name for debugging purposes
LeadStatus.displayName = 'LeadStatus';

// Default export for convenient importing
export default LeadStatus;