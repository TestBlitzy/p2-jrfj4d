/**
 * @fileoverview A React component for displaying lead information in a card format
 * with AI-driven lead scoring, status indicators, and quick action buttons.
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { Lead } from '../../types/lead.types';
import Card from '../common/Card';
import LeadScore from './LeadScore';
import LeadStatus from './LeadStatus';
import ErrorBoundary from '../common/ErrorBoundary';
import useMonitoring from '@monitoring/react';
import useA11y from '@accessibility/react';

// Styled components for enhanced visual presentation
const LeadCardContainer = styled(Card)(({ theme }) => ({
  position: 'relative',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const LeadHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const LeadName = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
}));

const LeadCompany = styled('div')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
}));

const LeadContent = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const LeadActions = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1),
}));

// Props interface with strict typing
interface LeadCardProps {
  /** Lead data object */
  lead: Lead;
  /** Selection state */
  isSelected?: boolean;
  /** Selection handler */
  onSelect?: (id: string) => void;
  /** Edit handler */
  onEdit?: (id: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state indicator */
  isError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Accessibility labels */
  ariaLabels?: Record<string, string>;
}

/**
 * LeadCard component that displays lead information with AI scoring and status
 * Implements F-201 AI Lead Scoring and F-202 Automated Qualification visualization
 */
const LeadCard: React.FC<LeadCardProps> = React.memo(({
  lead,
  isSelected = false,
  onSelect,
  onEdit,
  className,
  isLoading = false,
  isError = false,
  errorMessage = '',
  ariaLabels = {},
}) => {
  // Hooks for monitoring and accessibility
  const { trackEvent } = useMonitoring();
  const { setAriaLive } = useA11y();

  // Memoized event handlers
  const handleSelect = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(lead.id);
      trackEvent('lead_selected', { leadId: lead.id });
      setAriaLive(`Lead ${lead.firstName} ${lead.lastName} selected`);
    }
  }, [lead.id, lead.firstName, lead.lastName, onSelect, trackEvent, setAriaLive]);

  const handleEdit = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    if (onEdit) {
      onEdit(lead.id);
      trackEvent('lead_edit_clicked', { leadId: lead.id });
      setAriaLive(`Editing lead ${lead.firstName} ${lead.lastName}`);
    }
  }, [lead.id, lead.firstName, lead.lastName, onEdit, trackEvent, setAriaLive]);

  // Memoized card header
  const renderHeader = useMemo(() => (
    <LeadHeader>
      <div>
        <LeadName>
          {lead.firstName} {lead.lastName}
        </LeadName>
        <LeadCompany>{lead.company}</LeadCompany>
      </div>
      <LeadStatus 
        status={lead.status}
        size="small"
        testId={`lead-status-${lead.id}`}
      />
    </LeadHeader>
  ), [lead.firstName, lead.lastName, lead.company, lead.status, lead.id]);

  // Memoized card content
  const renderContent = useMemo(() => (
    <LeadContent>
      <div>{lead.email}</div>
      <LeadScore
        score={lead.score}
        showDetails
        testId={`lead-score-${lead.id}`}
      />
    </LeadContent>
  ), [lead.email, lead.score, lead.id]);

  // Memoized card footer with actions
  const renderFooter = useMemo(() => (
    <LeadActions>
      <IconButton
        onClick={handleEdit}
        aria-label={ariaLabels.edit || 'Edit lead'}
        disabled={isLoading}
        size="small"
      >
        <Icon name="edit" size="sm" />
      </IconButton>
      <IconButton
        onClick={handleSelect}
        aria-label={ariaLabels.select || 'Select lead'}
        aria-pressed={isSelected}
        disabled={isLoading}
        size="small"
      >
        <Icon name={isSelected ? 'checkCircle' : 'circle'} size="sm" />
      </IconButton>
    </LeadActions>
  ), [handleEdit, handleSelect, isSelected, isLoading, ariaLabels]);

  return (
    <ErrorBoundary
      fallback={<div role="alert">{errorMessage || 'Error loading lead card'}</div>}
    >
      <LeadCardContainer
        variant="outlined"
        interactive
        className={className}
        header={renderHeader}
        footer={renderFooter}
        testId={`lead-card-${lead.id}`}
        role="article"
        aria-label={`Lead: ${lead.firstName} ${lead.lastName}`}
        aria-busy={isLoading}
        aria-invalid={isError}
      >
        {renderContent}
      </LeadCardContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
LeadCard.displayName = 'LeadCard';

export default LeadCard;