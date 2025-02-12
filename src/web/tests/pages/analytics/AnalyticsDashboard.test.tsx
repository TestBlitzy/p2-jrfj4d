import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { axe } from '@axe-core/react';
import AnalyticsDashboard from '../../src/pages/analytics/AnalyticsDashboard';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { AnalyticsService } from '../../src/services/analytics.service';
import { ANALYTICS_TIME_RANGES } from '../../constants/analytics.constants';
import { AnalyticsMetricType } from '../../types/analytics.types';
import { createMockStore } from '../../utils/test-utils';

// Mock dependencies
jest.mock('../../src/hooks/useAnalytics');
jest.mock('../../src/services/analytics.service');

// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock large dataset for performance testing
const mockLargeDataset = Array.from({ length: 1000000 }, (_, index) => ({
  timestamp: new Date(Date.now() - index * 60000),
  value: Math.random() * 10000,
  metricType: AnalyticsMetricType.REVENUE
}));

describe('AnalyticsDashboard', () => {
  let store;
  let mockAnalyticsHook;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mock store
    store = createMockStore({
      analytics: {
        selectedTimeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        selectedMetricType: AnalyticsMetricType.REVENUE
      }
    });

    // Mock WebSocket setup
    global.WebSocket = jest.fn(() => mockWebSocket);

    // Mock analytics hook
    mockAnalyticsHook = {
      loading: false,
      error: null,
      realTimeStatus: 'connected',
      fetchAnalyticsData: jest.fn(),
      fetchRevenueForecast: jest.fn(),
      fetchPatternAnalysis: jest.fn(),
      fetchMarketTrends: jest.fn()
    };
    (useAnalytics as jest.Mock).mockReturnValue(mockAnalyticsHook);

    // Mock analytics service responses
    (AnalyticsService.getHistoricalData as jest.Mock).mockResolvedValue(mockLargeDataset);
    (AnalyticsService.getRevenueForecast as jest.Mock).mockResolvedValue({
      predictions: [],
      confidenceInterval: 0.95
    });
  });

  afterEach(() => {
    // Clean up WebSocket connections
    mockWebSocket.close();
  });

  it('should render without crashing', () => {
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Sales Analytics Dashboard')).toBeInTheDocument();
  });

  it('should handle large datasets efficiently', async () => {
    const startTime = performance.now();

    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second

    // Verify data virtualization
    const revenueChart = screen.getByRole('region', { name: /Revenue Chart/i });
    expect(revenueChart).toBeInTheDocument();

    // Check memory usage
    const performanceEntries = performance.getEntriesByType('measure');
    const memoryUsage = performanceEntries.find(entry => entry.name === 'memory');
    expect(memoryUsage?.duration).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
  });

  it('should update in real-time when new data arrives', async () => {
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    // Simulate real-time update
    const mockUpdate = {
      timestamp: new Date(),
      value: 15000,
      metricType: AnalyticsMetricType.REVENUE
    };

    // Trigger WebSocket message
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(mockUpdate)
    });
    mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);

    await waitFor(() => {
      const revenueValue = screen.getByText(/\$15,000/);
      expect(revenueValue).toBeInTheDocument();
    });

    // Verify real-time status indicator
    expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
  });

  it('should handle time range changes correctly', async () => {
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    // Change time range
    const timeRangeButton = screen.getByRole('button', { name: /LAST 7 DAYS/i });
    fireEvent.click(timeRangeButton);

    // Verify data refresh calls
    expect(mockAnalyticsHook.fetchAnalyticsData).toHaveBeenCalled();
    expect(mockAnalyticsHook.fetchRevenueForecast).toHaveBeenCalled();
    expect(mockAnalyticsHook.fetchPatternAnalysis).toHaveBeenCalled();
    expect(mockAnalyticsHook.fetchMarketTrends).toHaveBeenCalled();
  });

  it('should display loading states appropriately', () => {
    mockAnalyticsHook.loading = true;
    
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should handle error states gracefully', () => {
    mockAnalyticsHook.error = 'Failed to fetch analytics data';
    
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    expect(screen.getByText(/Failed to fetch analytics data/)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Check ARIA attributes
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard');
    
    // Verify keyboard navigation
    const timeRangeButtons = screen.getAllByRole('button');
    timeRangeButtons[0].focus();
    fireEvent.keyDown(timeRangeButtons[0], { key: 'Tab' });
    expect(document.activeElement).toBe(timeRangeButtons[1]);
  });

  it('should display competitor tracking information', async () => {
    render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    const competitorTracker = screen.getByRole('region', { name: /Market Intelligence/i });
    expect(competitorTracker).toBeInTheDocument();

    // Verify competitor activities are displayed
    await waitFor(() => {
      const activities = within(competitorTracker).getAllByRole('article');
      expect(activities.length).toBeGreaterThan(0);
    });
  });

  it('should maintain state during component updates', () => {
    const { rerender } = render(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    // Change time range
    fireEvent.click(screen.getByRole('button', { name: /LAST 7 DAYS/i }));

    // Rerender component
    rerender(
      <Provider store={store}>
        <AnalyticsDashboard />
      </Provider>
    );

    // Verify state is maintained
    expect(screen.getByRole('button', { name: /LAST 7 DAYS/i })).toHaveAttribute('aria-pressed', 'true');
  });
});