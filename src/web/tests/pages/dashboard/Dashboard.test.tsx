import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import Dashboard from '../../../../src/pages/dashboard/Dashboard';
import { analyticsService } from '../../../../src/services/analytics.service';
import { leadService } from '../../../../src/services/lead.service';
import { LoadingState } from '../../../../src/types/common.types';
import { AnalyticsMetricType } from '../../../../src/types/analytics.types';
import { ANALYTICS_TIME_RANGES, ANALYTICS_THRESHOLDS } from '../../../../src/constants/analytics.constants';

// Mock all required services
jest.mock('../../../../src/services/analytics.service');
jest.mock('../../../../src/services/lead.service');

describe('Dashboard Component', () => {
  // Setup mock data
  const mockLeadScoreData = {
    engagement: 85,
    companyFit: 92,
    budget: 78,
    timing: 88,
    industryAlignment: 90,
    technicalFit: 85,
    decisionMakerEngagement: 82
  };

  const mockAnalyticsData = [
    { timestamp: new Date(), value: 1200000, metricType: AnalyticsMetricType.REVENUE },
    { timestamp: new Date(), value: 1500000, metricType: AnalyticsMetricType.REVENUE }
  ];

  const mockAIInsights = [
    {
      type: 'trend',
      description: 'Positive revenue trend detected',
      confidence: 0.95,
      severity: 'high',
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    (analyticsService.getHistoricalData as jest.Mock).mockResolvedValue({
      data: mockAnalyticsData,
      success: true
    });

    (analyticsService.getAnalyticsInsights as jest.Mock).mockResolvedValue({
      data: mockAIInsights,
      success: true
    });

    (leadService.getLeadScore as jest.Mock).mockResolvedValue({
      data: mockLeadScoreData,
      success: true
    });

    // Mock IntersectionObserver
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;

    // Mock ResizeObserver
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders dashboard layout correctly', async () => {
    render(<Dashboard />);

    // Verify main layout elements
    expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Verify all three cards are present
    await waitFor(() => {
      expect(screen.getByTestId('lead-scoring-card')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-status-card')).toBeInTheDocument();
      expect(screen.getByTestId('ai-insights-card')).toBeInTheDocument();
    });

    // Verify accessibility landmarks
    expect(screen.getByRole('region', { name: /lead scoring/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /pipeline status/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /ai insights/i })).toBeInTheDocument();
  });

  it('handles real-time data updates correctly', async () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    (analyticsService.subscribeToUpdates as jest.Mock).mockReturnValue(mockSubscription);

    render(<Dashboard />);

    // Verify initial data load
    await waitFor(() => {
      expect(analyticsService.getHistoricalData).toHaveBeenCalledWith(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        true
      );
    });

    // Simulate real-time update
    const updatedData = [...mockAnalyticsData, {
      timestamp: new Date(),
      value: 1800000,
      metricType: AnalyticsMetricType.REVENUE
    }];

    (analyticsService.getHistoricalData as jest.Mock).mockResolvedValueOnce({
      data: updatedData,
      success: true
    });

    // Trigger update
    await waitFor(() => {
      const pipelineValue = screen.getByText(/\$1,800,000/);
      expect(pipelineValue).toBeInTheDocument();
    });

    // Verify subscription cleanup on unmount
    const { unmount } = render(<Dashboard />);
    unmount();
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('manages error states comprehensively', async () => {
    // Mock service error
    const mockError = new Error('Failed to fetch analytics data');
    (analyticsService.getHistoricalData as jest.Mock).mockRejectedValueOnce(mockError);

    render(<Dashboard />);

    // Verify error state
    await waitFor(() => {
      expect(screen.getByText(/Failed to load pipeline status/i)).toBeInTheDocument();
    });

    // Verify retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry
    (analyticsService.getHistoricalData as jest.Mock).mockResolvedValueOnce({
      data: mockAnalyticsData,
      success: true
    });

    // Trigger retry
    fireEvent.click(retryButton);

    // Verify recovery
    await waitFor(() => {
      expect(screen.queryByText(/Failed to load pipeline status/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('pipeline-status-card')).toBeInTheDocument();
    });
  });

  it('validates accessibility requirements', async () => {
    render(<Dashboard />);

    // Verify ARIA labels and roles
    await waitFor(() => {
      expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Dashboard header');
      expect(screen.getByTestId('lead-scoring-card')).toHaveAttribute('role', 'region');
      expect(screen.getByTestId('pipeline-status-card')).toHaveAttribute('role', 'region');
      expect(screen.getByTestId('ai-insights-card')).toHaveAttribute('role', 'region');
    });

    // Verify keyboard navigation
    const user = userEvent.setup();
    const actionButtons = screen.getAllByRole('button');
    
    for (const button of actionButtons) {
      await user.tab();
      expect(button).toHaveFocus();
    }
  });

  it('handles loading states correctly', async () => {
    render(<Dashboard />);

    // Verify initial loading states
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);

    // Verify loading state transitions
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('updates metrics in real-time with correct formatting', async () => {
    render(<Dashboard />);

    // Verify initial metrics
    await waitFor(() => {
      const leadScoreCard = screen.getByTestId('lead-scoring-card');
      expect(within(leadScoreCard).getByText('92%')).toBeInTheDocument(); // Company fit
      expect(within(leadScoreCard).getByText('85%')).toBeInTheDocument(); // Engagement
    });

    // Simulate metric update
    const updatedLeadScore = {
      ...mockLeadScoreData,
      companyFit: 95,
      engagement: 88
    };

    (leadService.getLeadScore as jest.Mock).mockResolvedValueOnce({
      data: updatedLeadScore,
      success: true
    });

    // Trigger refresh
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    // Verify updated metrics
    await waitFor(() => {
      const leadScoreCard = screen.getByTestId('lead-scoring-card');
      expect(within(leadScoreCard).getByText('95%')).toBeInTheDocument();
      expect(within(leadScoreCard).getByText('88%')).toBeInTheDocument();
    });
  });
});