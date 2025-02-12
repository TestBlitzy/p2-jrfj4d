import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';

import DashboardCard from '../../components/dashboard/DashboardCard';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import analyticsService from '../../services/analytics.service';
import { leadService } from '../../services/lead.service';
import { AnalyticsMetricType, AnalyticsDataPoint, AnalyticsInsight } from '../../types/analytics.types';
import { LeadScoreMetrics } from '../../types/lead.types';
import { LoadingState } from '../../types/common.types';
import { ANALYTICS_TIME_RANGES, ANALYTICS_THRESHOLDS } from '../../constants/analytics.constants';

interface DashboardState {
  leadScoring: {
    data: LeadScoreMetrics | null;
    loading: LoadingState;
    error: string | null;
  };
  pipelineStatus: {
    data: AnalyticsDataPoint[] | null;
    loading: LoadingState;
    error: string | null;
  };
  aiInsights: {
    data: AnalyticsInsight[] | null;
    loading: LoadingState;
    error: string | null;
  };
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    leadScoring: {
      data: null,
      loading: LoadingState.IDLE,
      error: null
    },
    pipelineStatus: {
      data: null,
      loading: LoadingState.IDLE,
      error: null
    },
    aiInsights: {
      data: null,
      loading: LoadingState.IDLE,
      error: null
    }
  });

  // Fetch dashboard data with error handling and retry logic
  const fetchDashboardData = useCallback(async () => {
    try {
      // Update loading states
      setDashboardState(prev => ({
        ...prev,
        leadScoring: { ...prev.leadScoring, loading: LoadingState.LOADING },
        pipelineStatus: { ...prev.pipelineStatus, loading: LoadingState.LOADING },
        aiInsights: { ...prev.aiInsights, loading: LoadingState.LOADING }
      }));

      // Fetch lead scoring data
      const leadScorePromise = leadService.getLeadScore('aggregate');
      
      // Fetch pipeline status data
      const pipelinePromise = analyticsService.getHistoricalData(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        true
      );

      // Fetch AI insights
      const insightsPromise = analyticsService.getAnalyticsInsights(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
      );

      // Wait for all promises to resolve
      const [leadScoreResponse, pipelineResponse, insightsResponse] = await Promise.all([
        leadScorePromise,
        pipelinePromise,
        insightsPromise
      ]);

      // Update state with fetched data
      setDashboardState({
        leadScoring: {
          data: leadScoreResponse.data,
          loading: LoadingState.SUCCESS,
          error: null
        },
        pipelineStatus: {
          data: await pipelineResponse.toPromise(),
          loading: LoadingState.SUCCESS,
          error: null
        },
        aiInsights: {
          data: insightsResponse,
          loading: LoadingState.SUCCESS,
          error: null
        }
      });

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setDashboardState(prev => ({
        leadScoring: {
          ...prev.leadScoring,
          loading: LoadingState.ERROR,
          error: 'Failed to load lead scoring data'
        },
        pipelineStatus: {
          ...prev.pipelineStatus,
          loading: LoadingState.ERROR,
          error: 'Failed to load pipeline status'
        },
        aiInsights: {
          ...prev.aiInsights,
          loading: LoadingState.ERROR,
          error: 'Failed to load AI insights'
        }
      }));
    }
  }, []);

  // Setup real-time data subscriptions
  const setupRealTimeSubscriptions = useCallback(() => {
    const subscriptions = [
      analyticsService.subscribeToRealTimeUpdates(AnalyticsMetricType.REVENUE),
      leadService.subscribeToLeadUpdates()
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    };
  }, []);

  // Initialize dashboard data and subscriptions
  useEffect(() => {
    fetchDashboardData();
    const cleanup = setupRealTimeSubscriptions();
    
    // Refresh data periodically
    const refreshInterval = setInterval(fetchDashboardData, 300000); // 5 minutes

    return () => {
      cleanup();
      clearInterval(refreshInterval);
    };
  }, [fetchDashboardData, setupRealTimeSubscriptions]);

  // Memoized card content renderers
  const renderLeadScoringCard = useMemo(() => (
    <DashboardCard
      title={t('dashboard.leadScoring.title')}
      content={
        <div className="lead-scoring-metrics">
          <div className="metric">
            <span className="label">{t('dashboard.leadScoring.qualified')}</span>
            <span className="value">{dashboardState.leadScoring.data?.companyFit || 0}%</span>
          </div>
          <div className="metric">
            <span className="label">{t('dashboard.leadScoring.engagement')}</span>
            <span className="value">{dashboardState.leadScoring.data?.engagement || 0}%</span>
          </div>
        </div>
      }
      variant="metrics"
      loading={dashboardState.leadScoring.loading === LoadingState.LOADING}
      actionLabel={t('dashboard.leadScoring.viewAll')}
      icon="financial"
      testId="lead-scoring-card"
    />
  ), [dashboardState.leadScoring, t]);

  const renderPipelineCard = useMemo(() => (
    <DashboardCard
      title={t('dashboard.pipeline.title')}
      content={
        <div className="pipeline-status">
          <div className="metric">
            <span className="label">{t('dashboard.pipeline.activeValue')}</span>
            <span className="value">
              ${dashboardState.pipelineStatus.data?.[0]?.value.toLocaleString() || 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">{t('dashboard.pipeline.conversion')}</span>
            <span className="value">60%</span>
          </div>
        </div>
      }
      variant="pipeline"
      loading={dashboardState.pipelineStatus.loading === LoadingState.LOADING}
      actionLabel={t('dashboard.pipeline.viewDetails')}
      icon="info"
      testId="pipeline-status-card"
    />
  ), [dashboardState.pipelineStatus, t]);

  const renderInsightsCard = useMemo(() => (
    <DashboardCard
      title={t('dashboard.insights.title')}
      content={
        <div className="ai-insights">
          {dashboardState.aiInsights.data?.slice(0, 3).map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="severity">{insight.severity}</span>
              <p className="description">{insight.description}</p>
            </div>
          ))}
        </div>
      }
      variant="insights"
      loading={dashboardState.aiInsights.loading === LoadingState.LOADING}
      actionLabel={t('dashboard.insights.viewAll')}
      icon="help"
      testId="ai-insights-card"
    />
  ), [dashboardState.aiInsights, t]);

  const handleHelpClick = useCallback(() => {
    // Implement help documentation display logic
    console.log('Help clicked');
  }, []);

  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <DashboardHeader
          title={t('dashboard.title')}
          onHelpClick={handleHelpClick}
          className="dashboard-header"
        />
        
        <div className="dashboard-grid">
          {renderLeadScoringCard}
          {renderPipelineCard}
          {renderInsightsCard}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;