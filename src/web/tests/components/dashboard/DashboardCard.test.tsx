import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach } from '@jest/globals';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { ThemeProvider } from '@mui/material';
import DashboardCard from '../../src/components/dashboard/DashboardCard';
import { createAppTheme } from '../../src/config/theme.config';
import { THEME_MODES } from '../../src/constants/theme.constants';

expect.extend(toHaveNoViolations);

// Helper function to render DashboardCard with theme provider
const renderDashboardCard = (props = {}) => {
  const theme = createAppTheme(THEME_MODES.LIGHT);
  return render(
    <ThemeProvider theme={theme}>
      <DashboardCard {...props} />
    </ThemeProvider>
  );
};

// Test props factory
const createTestProps = (overrides = {}) => ({
  title: 'Test Dashboard Card',
  content: <div>Test Content</div>,
  icon: 'financial',
  actionLabel: 'View Details',
  onActionClick: jest.fn(),
  variant: 'metrics',
  size: 'medium',
  testId: 'test-dashboard-card',
  ...overrides
});

describe('DashboardCard Component', () => {
  describe('Rendering Tests', () => {
    it('renders without crashing', () => {
      const props = createTestProps();
      renderDashboardCard(props);
      expect(screen.getByTestId('test-dashboard-card')).toBeInTheDocument();
    });

    it('renders title with correct typography and icon', () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const title = screen.getByText('Test Dashboard Card');
      const icon = document.querySelector('[aria-hidden="true"]');
      
      expect(title).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(title).toHaveStyle({ fontWeight: 500 });
    });

    it('renders content with proper layout', () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const content = screen.getByText('Test Content');
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveStyle({ position: 'relative' });
    });

    it('renders loading skeleton when loading prop is true', () => {
      const props = createTestProps({ loading: true });
      renderDashboardCard(props);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    it('applies correct variant styles', () => {
      const props = createTestProps({ variant: 'pipeline' });
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ borderLeft: expect.stringContaining('4px solid') });
    });
  });

  describe('Interaction Tests', () => {
    it('calls onActionClick when action button is clicked', async () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const button = screen.getByText('View Details');
      
      await userEvent.click(button);
      expect(props.onActionClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onActionClick when loading', async () => {
      const props = createTestProps({ loading: true });
      renderDashboardCard(props);
      const button = screen.getByText('View Details');
      
      await userEvent.click(button);
      expect(props.onActionClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('applies hover styles on mouse enter', async () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      
      fireEvent.mouseEnter(card);
      await waitFor(() => {
        expect(card).toHaveStyle({ transform: 'translateY(-4px)' });
      });
    });
  });

  describe('Responsive Tests', () => {
    it('adapts to small size variant', () => {
      const props = createTestProps({ size: 'small' });
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ minHeight: '200px' });
    });

    it('adapts to large size variant', () => {
      const props = createTestProps({ size: 'large' });
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ minHeight: '400px' });
    });

    it('applies responsive padding based on breakpoints', () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ padding: expect.stringContaining('px') });
    });
  });

  describe('Accessibility Tests', () => {
    it('has no accessibility violations', async () => {
      const props = createTestProps();
      const { container } = renderDashboardCard(props);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      const props = createTestProps({ ariaLabel: 'Sales Metrics Card' });
      renderDashboardCard(props);
      const card = screen.getByRole('region');
      expect(card).toHaveAttribute('aria-label', 'Sales Metrics Card');
    });

    it('maintains keyboard navigation', async () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const button = screen.getByText('View Details');
      
      await userEvent.tab();
      expect(button).toHaveFocus();
    });
  });

  describe('Theme Tests', () => {
    it('applies light theme styles correctly', () => {
      const props = createTestProps();
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ background: expect.stringContaining('rgb') });
    });

    it('applies dark theme styles correctly', () => {
      const theme = createAppTheme(THEME_MODES.DARK);
      render(
        <ThemeProvider theme={theme}>
          <DashboardCard {...createTestProps()} />
        </ThemeProvider>
      );
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ background: expect.stringContaining('rgb') });
    });

    it('applies variant-specific theme styles', () => {
      const props = createTestProps({ variant: 'insights' });
      renderDashboardCard(props);
      const card = screen.getByTestId('test-dashboard-card');
      expect(card).toHaveStyle({ borderTop: expect.stringContaining('4px solid') });
    });
  });

  describe('Error Handling', () => {
    it('renders error boundary fallback on content error', () => {
      const props = createTestProps({
        content: () => { throw new Error('Test error'); }
      });
      renderDashboardCard(props);
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('disables action button when error occurs', () => {
      const props = createTestProps({ error: 'Test error' });
      renderDashboardCard(props);
      const button = screen.getByText('View Details');
      expect(button).toBeDisabled();
    });
  });
});