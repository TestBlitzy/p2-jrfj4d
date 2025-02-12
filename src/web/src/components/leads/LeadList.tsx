/**
 * @fileoverview A virtualized, accessible list component for displaying leads with real-time updates
 * Implements F-201 AI Lead Scoring and F-202 Automated Qualification visualization
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';
import LeadCard from './LeadCard';
import ErrorBoundary from '../common/ErrorBoundary';
import useWebSocket from '../../hooks/useWebSocket';
import { Lead, LeadFilters, LeadSortOption } from '../../types/lead.types';
import { LEAD_TABLE_CONFIG, LEAD_REFRESH_CONFIG } from '../../constants/lead.constants';

// Styled components for enhanced visual presentation
const ListContainer = styled('div')(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
}));

const VirtualList = styled('div')({
  position: 'relative',
  width: '100%',
  height: '100%',
});

const LoadingOverlay = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 1,
}));

// Props interface with strict typing
interface LeadListProps {
  /** Array of leads to display */
  leads: Lead[];
  /** Active filters */
  filters: LeadFilters;
  /** Current sort configuration */
  sortConfig: LeadSortOption;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Selected lead IDs */
  selectedLeads?: string[];
  /** Callback for lead selection */
  onLeadSelect?: (id: string) => void;
  /** Callback for lead editing */
  onLeadEdit?: (id: string) => void;
  /** Callback for filter changes */
  onFilterChange?: (filters: LeadFilters) => void;
  /** Callback for sort changes */
  onSortChange?: (sortConfig: LeadSortOption) => void;
  /** Optional CSS class name */
  className?: string;
  /** Virtualization options */
  virtualizeOptions?: {
    overscan?: number;
    itemSize?: number;
  };
}

/**
 * Custom hook for handling real-time lead updates via WebSocket
 */
const useLeadUpdates = (leads: Lead[], onUpdate: (updatedLeads: Lead[]) => void) => {
  const { isConnected, lastMessage, error } = useWebSocket('/ws/leads', {
    autoConnect: true,
    reconnect: true,
    heartbeatInterval: LEAD_REFRESH_CONFIG.refreshInterval,
  });

  useEffect(() => {
    if (lastMessage?.type === 'LEAD_UPDATE') {
      const updatedLead = lastMessage.data;
      const updatedLeads = leads.map(lead => 
        lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
      );
      onUpdate(updatedLeads);
    }
  }, [lastMessage, leads, onUpdate]);

  return { isConnected, error };
};

/**
 * LeadList component that displays a virtualized, accessible list of leads
 * with real-time updates and enhanced interaction features
 */
const LeadList: React.FC<LeadListProps> = ({
  leads,
  filters,
  sortConfig,
  isLoading = false,
  error,
  selectedLeads = [],
  onLeadSelect,
  onLeadEdit,
  onFilterChange,
  onSortChange,
  className,
  virtualizeOptions = {
    overscan: 5,
    itemSize: 120,
  },
}) => {
  // Local state for optimistic updates
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  // Set up virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: localLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => virtualizeOptions.itemSize,
    overscan: virtualizeOptions.overscan,
  });

  // Set up real-time updates
  const handleLeadUpdate = useCallback((updatedLeads: Lead[]) => {
    setLocalLeads(updatedLeads);
  }, []);

  const { isConnected: wsConnected, error: wsError } = useLeadUpdates(localLeads, handleLeadUpdate);

  // Update local leads when prop changes
  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // Memoized handlers
  const handleSelect = useCallback((id: string) => {
    onLeadSelect?.(id);
  }, [onLeadSelect]);

  const handleEdit = useCallback((id: string) => {
    onLeadEdit?.(id);
  }, [onLeadEdit]);

  // Render virtualized items
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <ErrorBoundary
      fallback={<div role="alert">{error || 'Error loading leads'}</div>}
    >
      <ListContainer
        ref={parentRef}
        className={className}
        role="list"
        aria-label="Leads list"
        aria-busy={isLoading}
      >
        {isLoading && (
          <LoadingOverlay>
            <div role="status">Loading leads...</div>
          </LoadingOverlay>
        )}

        <VirtualList
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
          }}
        >
          {virtualItems.map(virtualItem => {
            const lead = localLeads[virtualItem.index];
            return (
              <div
                key={lead.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <LeadCard
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  className="lead-list-item"
                  testId={`lead-card-${lead.id}`}
                />
              </div>
            );
          })}
        </VirtualList>

        {/* Accessibility announcements */}
        <div className="visually-hidden" role="status" aria-live="polite">
          {wsConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}
          {wsError && `Connection error: ${wsError}`}
        </div>
      </ListContainer>
    </ErrorBoundary>
  );
};

// Display name for debugging
LeadList.displayName = 'LeadList';

export default LeadList;