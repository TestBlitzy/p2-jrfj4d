import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';

import LeadCard from '../../src/components/leads/LeadCard';
import { Lead, LeadStatus } from '../../src/types/lead.types';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock theme for testing
const mockTheme = {
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    text: { primary: '#000000', secondary: '#666666' },
  },
  spacing: (factor: number) => `${factor * 8}px`,
  transitions: {
    create: () => 'all 0.3s ease',
  },
  shadows: ['none', '0px 2px 4px rgba(0,0,0,0.1)'],
};

// Mock lead data
const mockLead: Lead = {
  id: 'test-lead-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  company: 'Test Company',
  status: LeadStatus.NEW,
  score: 85,
  lastContact: new Date('2024-01-20T10:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-20T10:00:00Z'),
};

// Mock handlers
const mockHandlers = {
  onSelect: jest.fn(),
  onEdit: jest.fn(),
};

// Helper function to render with theme
const renderWithTheme = (ui: React.ReactNode, options = {}) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {ui}
    </ThemeProvider>,
    options
  );
};

describe('LeadCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders all lead information correctly', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      // Verify name and company
      expect(screen.getByText(`${mockLead.firstName} ${mockLead.lastName}`)).toBeInTheDocument();
      expect(screen.getByText(mockLead.company)).toBeInTheDocument();
      
      // Verify email
      expect(screen.getByText(mockLead.email)).toBeInTheDocument();
      
      // Verify score
      expect(screen.getByTestId(`lead-score-${mockLead.id}`)).toBeInTheDocument();
      
      // Verify status
      expect(screen.getByTestId(`lead-status-${mockLead.id}`)).toBeInTheDocument();
    });

    it('displays loading skeleton during data fetch', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          isLoading={true}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
    });

    it('shows error state when data fails', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          isError={true}
          errorMessage="Failed to load lead"
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load lead');
    });
  });

  describe('Interactions', () => {
    it('handles selection with proper visual feedback', async () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const selectButton = screen.getByRole('button', { name: /select lead/i });
      fireEvent.click(selectButton);

      expect(mockHandlers.onSelect).toHaveBeenCalledWith(mockLead.id);
      await waitFor(() => {
        expect(selectButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('triggers edit mode correctly', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit lead/i });
      fireEvent.click(editButton);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockLead.id);
    });

    it('supports keyboard navigation', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const card = screen.getByRole('article');
      const editButton = screen.getByRole('button', { name: /edit lead/i });
      const selectButton = screen.getByRole('button', { name: /select lead/i });

      // Test tab navigation
      editButton.focus();
      fireEvent.keyDown(editButton, { key: 'Tab' });
      expect(selectButton).toHaveFocus();

      // Test keyboard activation
      fireEvent.keyDown(editButton, { key: 'Enter' });
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockLead.id);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 requirements', async () => {
      const { container } = renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides appropriate ARIA labels', () => {
      renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Lead: ${mockLead.firstName} ${mockLead.lastName}`);
    });
  });

  describe('Theming', () => {
    it('applies theme colors correctly', () => {
      const { container } = renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({
        backgroundColor: mockTheme.palette.background.paper,
        color: mockTheme.palette.text.primary,
      });
    });

    it('handles theme changes dynamically', () => {
      const darkTheme = {
        ...mockTheme,
        palette: {
          ...mockTheme.palette,
          mode: 'dark',
        },
      };

      const { rerender } = renderWithTheme(
        <LeadCard 
          lead={mockLead}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      rerender(
        <ThemeProvider theme={darkTheme}>
          <LeadCard 
            lead={mockLead}
            onSelect={mockHandlers.onSelect}
            onEdit={mockHandlers.onEdit}
          />
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: darkTheme.palette.background.paper,
        color: darkTheme.palette.text.primary,
      });
    });
  });

  describe('Error Handling', () => {
    it('catches and displays render errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithTheme(
        <ErrorBoundary>
          <LeadCard 
            lead={{ ...mockLead, status: 'INVALID_STATUS' as LeadStatus }}
            onSelect={mockHandlers.onSelect}
            onEdit={mockHandlers.onEdit}
          />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      consoleError.mockRestore();
    });

    it('handles missing data gracefully', () => {
      renderWithTheme(
        <LeadCard 
          lead={{ ...mockLead, company: undefined }}
          onSelect={mockHandlers.onSelect}
          onEdit={mockHandlers.onEdit}
        />
      );

      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });
  });
});