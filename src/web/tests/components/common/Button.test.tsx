import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import Button, { ButtonProps } from '@components/common/Button';
import { LoadingState } from '../types/common.types';

// Default props for testing
const defaultProps: ButtonProps = {
  variant: 'primary',
  size: 'medium',
  isLoading: false,
  disabled: false,
  fullWidth: false,
  type: 'button',
  children: 'Test Button',
  className: '',
  onClick: jest.fn(),
};

// Helper function to render Button with merged props
const renderButton = (props: Partial<ButtonProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(<Button {...mergedProps} />);
};

// Setup function for common test scenarios
const setupButtonTest = async (props: Partial<ButtonProps> = {}) => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  const utils = renderButton({ onClick, ...props });
  const button = screen.getByRole('button');
  return {
    ...utils,
    user,
    button,
    onClick,
  };
};

describe('Button Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button', 'button--primary', 'button--medium');
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('applies correct variant styles', () => {
      const variants = ['primary', 'secondary', 'text'] as const;
      variants.forEach((variant) => {
        const { rerender } = renderButton({ variant });
        expect(screen.getByRole('button')).toHaveClass(`button--${variant}`);
        rerender(<Button {...defaultProps} variant={variant} />);
      });
    });

    it('applies correct size styles', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach((size) => {
        const { rerender } = renderButton({ size });
        expect(screen.getByRole('button')).toHaveClass(`button--${size}`);
        rerender(<Button {...defaultProps} size={size} />);
      });
    });

    it('handles fullWidth prop', () => {
      renderButton({ fullWidth: true });
      expect(screen.getByRole('button')).toHaveClass('button--full-width');
    });

    it('renders children correctly', () => {
      renderButton({ children: <span data-testid="child">Child Content</span> });
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderButton({ className: 'custom-class' });
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Interaction', () => {
    it('handles click events', async () => {
      const { button, onClick, user } = await setupButtonTest();
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      const { button, onClick, user } = await setupButtonTest({ disabled: true });
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('prevents click when loading', async () => {
      const { button, onClick, user } = await setupButtonTest({ isLoading: true });
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('shows loading indicator', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Test Button')).toHaveClass('button__text--hidden');
    });

    it('handles keyboard navigation', async () => {
      const { button, onClick, user } = await setupButtonTest();
      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard('{enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('shows focus states', async () => {
      const { button, user } = await setupButtonTest();
      await user.tab();
      expect(button).toHaveFocus();
      expect(button).toHaveClass('button--focused');
    });

    it('handles ripple effect', async () => {
      const { button, user } = await setupButtonTest();
      await user.click(button);
      const ripple = within(button).getByTestId('ripple');
      expect(ripple).toBeInTheDocument();
      await waitFor(() => {
        expect(ripple).toHaveClass('ripple--active');
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderButton({ ariaLabel: 'Test Button Label' });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test Button Label');
    });

    it('maintains focus order', async () => {
      const { user } = await setupButtonTest();
      const tabOrder = ['button1', 'button2', 'button3'].map((id) => 
        renderButton({ testId: id }).getByTestId(id)
      );
      
      for (const element of tabOrder) {
        await user.tab();
        expect(element).toHaveFocus();
      }
    });

    it('announces loading state', () => {
      renderButton({ isLoading: true });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-live', 'polite');
    });

    it('announces disabled state', () => {
      renderButton({ disabled: true });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports keyboard activation', async () => {
      const { button, onClick, user } = await setupButtonTest();
      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard('{enter}');
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles onClick errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const errorOnClick = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const { button, user } = await setupButtonTest({ onClick: errorOnClick });
      await user.click(button);

      expect(errorOnClick).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        'Button click handler error:',
        expect.any(Error)
      );
      expect(button).not.toHaveAttribute('aria-busy', 'true');

      consoleError.mockRestore();
    });

    it('validates required props', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // @ts-expect-error - Testing missing required props
      render(<Button />);
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('warns on invalid prop combinations', () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      renderButton({ isLoading: true, disabled: true });
      
      expect(consoleWarn).toHaveBeenCalledWith(
        'Button should not have both isLoading and disabled props set to true'
      );
      
      consoleWarn.mockRestore();
    });
  });
});