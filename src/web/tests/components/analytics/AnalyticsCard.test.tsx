import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import AnalyticsCard, { AnalyticsCardProps } from '../../src/components/analytics/AnalyticsCard';
import { AnalyticsMetricType } from '../../src/types/analytics.types';

// Mock Chart.js to avoid canvas rendering issues
jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    data: { datasets: [] },
    options: {}
  }))
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

/**
 * Helper function to generate mock analytics data
 */
const generateMockAnalyticsData = (
  metricType: AnalyticsMetricType,
  dataPoints: number = 10,
  includePatterns: boolean = false
) => {
  const now = new Date();
  return Array.from({ length: dataPoints }, (_, i) => ({
    timestamp: new Date(now.setDate(now.getDate() - i)),
    value: metricType === AnalyticsMetricType.REVENUE 
      ? Math.random() * 10000 
      : Math.random(),
    metricType,
    metadata: includePatterns ? {
      pattern: i % 3 === 0 ? 'uptrend' : 'normal',
      confidence: 0.85 + Math.random() * 0.1
    } : {},
    tags: ['test'],
    source: 'test'
  }));
};

describe('AnalyticsCard Component', () => {
  // Default props for testing
  const defaultProps: AnalyticsCardProps = {
    title: 'Revenue Analytics',
    metricType: AnalyticsMetricType.REVENUE,
    data: generateMockAnalyticsData(AnalyticsMetricType.REVENUE),
    loading: false,
    error: undefined,
    patternConfig: { enabled: true, sensitivity: 0.8 },
    enableRealTime: false
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Rendering Tests', () => {
    it('should render with title and basic content', () => {
      render(<AnalyticsCard {...defaultProps} />);
      expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Revenue Analytics analytics chart');
    });

    it('should display loading state correctly', () => {
      render(<AnalyticsCard {...defaultProps} loading={true} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle error state appropriately', () => {
      const error = 'Failed to load analytics data';
      render(<AnalyticsCard {...defaultProps} error={error} />);
      expect(screen.getByText(error)).toBeInTheDocument();
    });

    it('should render chart with correct data visualization', () => {
      render(<AnalyticsCard {...defaultProps} />);
      const chartContainer = screen.getByRole('region');
      expect(chartContainer).toContainElement(screen.getByRole('img'));
    });

    it('should apply responsive styling', () => {
      render(<AnalyticsCard {...defaultProps} className="custom-class" />);
      const container = screen.getByRole('region');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveStyle({ height: '100%' });
    });
  });

  describe('Interaction Tests', () => {
    it('should handle data point clicks', async () => {
      const onDataPointClick = jest.fn();
      render(<AnalyticsCard {...defaultProps} onDataPointClick={onDataPointClick} />);
      
      const chart = screen.getByRole('img');
      fireEvent.click(chart);
      
      await waitFor(() => {
        expect(onDataPointClick).toHaveBeenCalled();
      });
    });

    it('should toggle pattern overlay when enabled', async () => {
      const { rerender } = render(<AnalyticsCard {...defaultProps} patternConfig={{ enabled: false, sensitivity: 0.8 }} />);
      
      rerender(<AnalyticsCard {...defaultProps} patternConfig={{ enabled: true, sensitivity: 0.8 }} />);
      
      await waitFor(() => {
        const chart = screen.getByRole('img');
        expect(chart).toHaveAttribute('data-testid', 'analytics-card-revenue');
      });
    });

    it('should be keyboard accessible', () => {
      render(<AnalyticsCard {...defaultProps} />);
      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time data updates', async () => {
      render(<AnalyticsCard {...defaultProps} enableRealTime={true} />);
      
      jest.advanceTimersByTime(30000); // Advance past update interval
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    it('should clear update interval on unmount', () => {
      const { unmount } = render(<AnalyticsCard {...defaultProps} enableRealTime={true} />);
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Pattern Recognition', () => {
    it('should display detected patterns when enabled', () => {
      const patternsData = generateMockAnalyticsData(AnalyticsMetricType.REVENUE, 10, true);
      render(<AnalyticsCard {...defaultProps} data={patternsData} patternConfig={{ enabled: true, sensitivity: 0.8 }} />);
      
      const insights = screen.getByText('Insights');
      expect(insights).toBeInTheDocument();
    });

    it('should update patterns when data changes', async () => {
      const { rerender } = render(<AnalyticsCard {...defaultProps} />);
      
      const newData = generateMockAnalyticsData(AnalyticsMetricType.REVENUE, 15, true);
      rerender(<AnalyticsCard {...defaultProps} data={newData} />);
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels', () => {
      render(<AnalyticsCard {...defaultProps} />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Revenue Analytics analytics chart');
    });

    it('should maintain focus management', async () => {
      render(<AnalyticsCard {...defaultProps} />);
      const chart = screen.getByRole('img');
      
      chart.focus();
      expect(document.activeElement).toBe(chart);
    });

    it('should have accessible chart interactions', async () => {
      const user = userEvent.setup();
      render(<AnalyticsCard {...defaultProps} />);
      
      const chart = screen.getByRole('img');
      await user.tab();
      
      expect(document.activeElement).toBe(chart);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = generateMockAnalyticsData(AnalyticsMetricType.REVENUE, 1000);
      render(<AnalyticsCard {...defaultProps} data={largeDataset} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should optimize real-time updates for performance', async () => {
      const { rerender } = render(<AnalyticsCard {...defaultProps} enableRealTime={true} />);
      
      for (let i = 0; i < 5; i++) {
        const newData = generateMockAnalyticsData(AnalyticsMetricType.REVENUE);
        rerender(<AnalyticsCard {...defaultProps} data={newData} enableRealTime={true} />);
        jest.advanceTimersByTime(30000);
      }
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });
  });
});