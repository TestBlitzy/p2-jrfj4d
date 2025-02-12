/**
 * Lead Details Page Component
 * Implements F-201 AI Lead Scoring and F-202 Automated Qualification visualization
 * with real-time updates and accessibility support.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, Skeleton, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

import { Lead, LeadStatus } from '../../types/lead.types';
import LeadCard from '../../components/leads/LeadCard';
import useLeads from '../../hooks/useLeads';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { LoadingState } from '../../types/common.types';

// Styled components
const LeadDetailsContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1200,
  margin: '0 auto',
}));

const LeadSection = styled('section')(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const SectionTitle = styled('h2')(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

interface LeadDetailsState {
  lead: Lead | null;
  loadingState: LoadingState;
  error: string | null;
  scoreUpdateInterval: NodeJS.Timeout | null;
}

/**
 * LeadDetails component for displaying comprehensive lead information
 * with real-time updates and accessibility support
 */
const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LeadDetailsState>({
    lead: null,
    loadingState: LoadingState.IDLE,
    error: null,
    scoreUpdateInterval: null,
  });

  const { getLead, updateStatus, getLeadScore, subscribeToLeadUpdates } = useLeads();

  // Fetch lead data and set up real-time updates
  useEffect(() => {
    const fetchLeadData = async () => {
      if (!id) return;

      setState(prev => ({ ...prev, loadingState: LoadingState.LOADING }));

      try {
        const leadData = await getLead(id);
        setState(prev => ({
          ...prev,
          lead: leadData,
          loadingState: LoadingState.SUCCESS,
        }));

        // Subscribe to real-time updates
        const unsubscribe = subscribeToLeadUpdates(id, (updatedLead) => {
          setState(prev => ({ ...prev, lead: updatedLead }));
        });

        return () => unsubscribe();
      } catch (error) {
        setState(prev => ({
          ...prev,
          loadingState: LoadingState.ERROR,
          error: error instanceof Error ? error.message : 'Failed to load lead details',
        }));
      }
    };

    fetchLeadData();

    // Set up periodic score updates
    const scoreInterval = setInterval(async () => {
      if (state.lead) {
        try {
          const scoreData = await getLeadScore(state.lead.id);
          setState(prev => prev.lead ? ({
            ...prev,
            lead: { ...prev.lead, score: scoreData.score }
          }) : prev);
        } catch (error) {
          console.error('Failed to update lead score:', error);
        }
      }
    }, 30000); // Update every 30 seconds

    setState(prev => ({ ...prev, scoreUpdateInterval: scoreInterval }));

    return () => {
      if (state.scoreUpdateInterval) {
        clearInterval(state.scoreUpdateInterval);
      }
    };
  }, [id, getLead, getLeadScore, subscribeToLeadUpdates]);

  // Handle lead status updates with optimistic UI
  const handleStatusUpdate = useCallback(async (newStatus: LeadStatus) => {
    if (!state.lead) return;

    const previousLead = state.lead;

    // Optimistic update
    setState(prev => prev.lead ? ({
      ...prev,
      lead: { ...prev.lead, status: newStatus }
    }) : prev);

    try {
      await updateStatus(state.lead.id, newStatus);
    } catch (error) {
      // Revert on error
      setState(prev => ({
        ...prev,
        lead: previousLead,
        error: 'Failed to update lead status'
      }));
    }
  }, [state.lead, updateStatus]);

  // Memoized lead details content
  const leadContent = useMemo(() => {
    if (state.loadingState === LoadingState.LOADING) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
        </Grid>
      );
    }

    if (state.error) {
      return (
        <Alert 
          severity="error"
          onClose={() => setState(prev => ({ ...prev, error: null }))}
        >
          {state.error}
        </Alert>
      );
    }

    if (!state.lead) {
      return (
        <Alert severity="info">
          No lead found with the specified ID.
        </Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <LeadSection>
            <SectionTitle>Lead Information</SectionTitle>
            <LeadCard
              lead={state.lead}
              onEdit={() => {}} // Implement edit handler
              testId={`lead-details-${state.lead.id}`}
              ariaLabels={{
                edit: 'Edit lead details',
                status: 'Current lead status'
              }}
            />
          </LeadSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <LeadSection>
            <SectionTitle>Engagement Metrics</SectionTitle>
            {/* Add engagement metrics visualization component */}
          </LeadSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <LeadSection>
            <SectionTitle>AI Insights</SectionTitle>
            {/* Add AI insights component */}
          </LeadSection>
        </Grid>
      </Grid>
    );
  }, [state.lead, state.loadingState, state.error]);

  return (
    <ErrorBoundary>
      <LeadDetailsContainer>
        <h1>Lead Details</h1>
        {leadContent}
      </LeadDetailsContainer>
    </ErrorBoundary>
  );
};

export default LeadDetails;