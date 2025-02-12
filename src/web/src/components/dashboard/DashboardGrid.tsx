import React, { useCallback, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Grid, useTheme } from '@mui/material';
import DashboardCard from './DashboardCard';
import StatisticCard from './StatisticCard';
import AnalyticsCard from '../analytics/AnalyticsCard';
import type { BaseComponentProps } from '../../types/common.types';
import { AnalyticsMetricType } from '../../types/analytics.types';

// Styled Grid container with enhanced spacing
const StyledGridContainer = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  '& .MuiGrid-item': {
    display: 'flex',
    flexDirection: 'column',
  },
}));

// Props interface extending base component props
export interface DashboardGridProps extends BaseComponentProps {
  loading?: boolean;
  error?: string;
  isDraggable?: boolean;
  onSectionReorder?: (newOrder: string[]) => void;
  gridConfig?: {
    breakpoints: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
    };
  };
}

/**
 * DashboardGrid component that implements a responsive grid layout
 * for organizing dashboard cards with enhanced accessibility
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  loading = false,
  error,
  isDraggable = false,
  onSectionReorder,
  gridConfig,
  className,
  style,
  testId = 'dashboard-grid',
}) => {
  const theme = useTheme();
  const [sectionOrder, setSectionOrder] = useState<string[]>(['leads', 'pipeline', 'insights']);

  // Handle section reordering with animation
  const handleSectionReorder = useCallback((newOrder: string[]) => {
    setSectionOrder(newOrder);
    onSectionReorder?.(newOrder);
  }, [onSectionReorder]);

  // Responsive column sizes
  const getColumnSize = useCallback(() => ({
    xs: 12, // Full width on mobile
    sm: 6,  // Two columns on tablet
    md: 4,  // Three columns on desktop
    ...gridConfig?.breakpoints,
  }), [gridConfig?.breakpoints]);

  // Render lead scoring section
  const renderLeadSection = useCallback(() => (
    <Grid item {...getColumnSize()} key="leads">
      <DashboardCard
        title="Lead Scoring"
        icon="financial"
        variant="metrics"
        testId="lead-scoring-card"
      >
        <StatisticCard
          title="High Priority Leads"
          value={12}
          trend={0.15}
          trendType="higher-better"
          format="number"
          progress={75}
          subtitle="Active leads requiring immediate attention"
        />
      </DashboardCard>
    </Grid>
  ), [getColumnSize]);

  // Render pipeline status section
  const renderPipelineSection = useCallback(() => (
    <Grid item {...getColumnSize()} key="pipeline">
      <DashboardCard
        title="Pipeline Status"
        icon="info"
        variant="pipeline"
        testId="pipeline-status-card"
      >
        <StatisticCard
          title="Active Pipeline"
          value={1200000}
          format="currency"
          trend={0.08}
          progress={60}
          subtitle="Q3 Target Progress"
        />
      </DashboardCard>
    </Grid>
  ), [getColumnSize]);

  // Render AI insights section
  const renderInsightsSection = useCallback(() => (
    <Grid item {...getColumnSize()} key="insights">
      <DashboardCard
        title="AI Insights"
        icon="help"
        variant="insights"
        testId="ai-insights-card"
      >
        <AnalyticsCard
          title="Revenue Forecast"
          metricType={AnalyticsMetricType.REVENUE}
          data={[]} // Data would be passed from parent
          loading={loading}
          error={error}
          enableRealTime
          patternConfig={{
            enabled: true,
            sensitivity: 0.8,
          }}
        />
      </DashboardCard>
    </Grid>
  ), [getColumnSize, loading, error]);

  // Map sections to their render functions
  const sectionMap = {
    leads: renderLeadSection,
    pipeline: renderPipelineSection,
    insights: renderInsightsSection,
  };

  return (
    <StyledGridContainer
      container
      spacing={3}
      className={className}
      style={style}
      data-testid={testId}
      role="main"
      aria-label="Dashboard Grid"
    >
      {loading ? (
        <Grid item xs={12}>
          <div role="alert" aria-busy="true">
            Loading dashboard content...
          </div>
        </Grid>
      ) : error ? (
        <Grid item xs={12}>
          <div role="alert" aria-live="polite">
            {error}
          </div>
        </Grid>
      ) : (
        sectionOrder.map((section) => sectionMap[section as keyof typeof sectionMap]())
      )}
    </StyledGridContainer>
  );
};

// Default export with display name for dev tools
DashboardGrid.displayName = 'DashboardGrid';
export default DashboardGrid;