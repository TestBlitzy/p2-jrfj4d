/**
 * Lead Management Page Component
 * Implements F-201 AI Lead Scoring and F-202 Automated Qualification features
 * with enhanced accessibility and real-time updates
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Container, Button, Modal, useMediaQuery } from '@mui/material';
import LeadList from '../../components/leads/LeadList';
import LeadForm from '../../components/leads/LeadForm';
import useLeads from '../../hooks/useLeads';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Lead, LeadStatus } from '../../types/lead.types';
import { LoadingState } from '../../types/common.types';

// Styled components for enhanced visual presentation
const StyledContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
}));

const ActionBar = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}));

const FormModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const FormContainer = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
}));

/**
 * Lead Management page component implementing comprehensive lead management features
 */
const LeadManagement: React.FC = () => {
  // Hooks initialization
  const {
    leads,
    loading,
    errors,
    fetchLeads,
    updateStatus,
    getLeadScore,
    connectionState
  } = useLeads();

  const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

  // Local state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState({
    status: [LeadStatus.NEW, LeadStatus.QUALIFIED],
    scoreRange: [0, 100],
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    }
  });

  // Effect for real-time updates status
  useEffect(() => {
    if (connectionState === 'Open') {
      console.info('Real-time lead updates active');
    }
  }, [connectionState]);

  // Handlers
  const handleLeadSelect = useCallback(async (leadId: string) => {
    try {
      const score = await getLeadScore(leadId);
      setSelectedLead(leads.find(lead => lead.id === leadId) || null);
    } catch (error) {
      console.error('Failed to get lead score:', error);
    }
  }, [leads, getLeadScore]);

  const handleLeadEdit = useCallback((leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setIsFormModalOpen(true);
    }
  }, [leads]);

  const handleFormSubmit = useCallback(async (leadData: Lead) => {
    try {
      if (selectedLead) {
        await updateStatus(leadData.id, leadData.status);
      }
      setIsFormModalOpen(false);
      setSelectedLead(null);
      await fetchLeads(filters);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  }, [selectedLead, updateStatus, fetchLeads, filters]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    fetchLeads(newFilters);
  }, [fetchLeads]);

  return (
    <ErrorBoundary>
      <StyledContainer maxWidth="xl">
        <ActionBar>
          <h1>Lead Management</h1>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsFormModalOpen(true)}
            startIcon={<span aria-hidden="true">+</span>}
            aria-label="Add new lead"
          >
            {isMobile ? 'Add' : 'Add Lead'}
          </Button>
        </ActionBar>

        <LeadList
          leads={leads}
          filters={filters}
          isLoading={loading.fetchLeads === LoadingState.LOADING}
          error={errors.fetchLeads}
          selectedLeads={selectedLead ? [selectedLead.id] : []}
          onLeadSelect={handleLeadSelect}
          onLeadEdit={handleLeadEdit}
          onFilterChange={handleFilterChange}
          className="lead-list-container"
        />

        <FormModal
          open={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedLead(null);
          }}
          aria-labelledby="lead-form-title"
        >
          <FormContainer>
            <LeadForm
              initialData={selectedLead}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormModalOpen(false);
                setSelectedLead(null);
              }}
              isEdit={!!selectedLead}
              csrfToken={document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''}
            />
          </FormContainer>
        </FormModal>

        {/* Accessibility announcements */}
        <div className="visually-hidden" role="status" aria-live="polite">
          {loading.fetchLeads === LoadingState.LOADING && 'Loading leads...'}
          {errors.fetchLeads && `Error: ${errors.fetchLeads}`}
          {connectionState === 'Open' && 'Real-time updates active'}
        </div>
      </StyledContainer>
    </ErrorBoundary>
  );
};

export default LeadManagement;