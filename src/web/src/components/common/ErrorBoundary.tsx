import React from 'react';
import { ErrorState } from '../../types/common.types';
import Notification from './Notification';

/**
 * Props interface for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to be rendered */
  children: React.ReactNode;
  /** Custom fallback UI component */
  fallback?: React.ReactNode;
  /** Error callback for external error handling */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback function for retry attempts */
  onRetry?: () => void;
  /** Flag to enable error monitoring integration */
  enableMonitoring?: boolean;
}

/**
 * State interface for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Current error state */
  error: ErrorState | null;
  /** Flag indicating if a retry attempt is in progress */
  isRetrying: boolean;
}

/**
 * Enhanced React Error Boundary component that provides comprehensive error handling,
 * monitoring integration, and accessibility support for the Sales & Intelligence Platform.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      isRetrying: false
    };
  }

  /**
   * Static method to derive error state from caught errors
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Format error into ErrorState structure
    const errorState: ErrorState = {
      message: error.message,
      code: error.name,
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      retryable: true // Allow retry by default
    };

    return {
      error: errorState,
      isRetrying: false
    };
  }

  /**
   * Lifecycle method for handling caught errors with monitoring integration
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error in development environment
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', {
        error,
        errorInfo,
        component: errorInfo.componentStack
      });
    }

    // Send error to monitoring service if enabled
    if (this.props.enableMonitoring) {
      const monitoringData = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      };

      // Sanitize sensitive information before sending
      const sanitizedData = this.sanitizeErrorData(monitoringData);

      // Send to monitoring service (implementation would depend on monitoring solution)
      this.sendToMonitoring(sanitizedData);
    }

    // Call external error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Sanitizes error data to remove sensitive information
   */
  private sanitizeErrorData(data: any): any {
    // Remove potential sensitive information from stack traces
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /credential/i
    ];

    const sanitized = JSON.parse(JSON.stringify(data));
    
    if (sanitized.error?.stack) {
      sensitivePatterns.forEach(pattern => {
        sanitized.error.stack = sanitized.error.stack.replace(
          new RegExp(`${pattern.source}[^\\s]*\\s*=\\s*[^\\s]*`, 'g'),
          '$1=REDACTED'
        );
      });
    }

    return sanitized;
  }

  /**
   * Sends error data to monitoring service
   */
  private sendToMonitoring(data: any): void {
    // Implementation would depend on chosen monitoring solution
    // This is a placeholder for the actual implementation
    try {
      // Example: Send to monitoring service
      console.info('Sending to monitoring:', data);
    } catch (error) {
      console.warn('Failed to send error to monitoring:', error);
    }
  }

  /**
   * Handles retry attempts for recoverable errors
   */
  private handleRetry = (): void => {
    this.setState({ isRetrying: true }, () => {
      // Reset error state
      this.setState({ error: null }, () => {
        // Call external retry handler if provided
        if (this.props.onRetry) {
          this.props.onRetry();
        }
        // Reset retry flag
        this.setState({ isRetrying: false });
      });
    });
  };

  render(): React.ReactNode {
    const { error, isRetrying } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      // If custom fallback is provided, render it
      if (fallback) {
        return fallback;
      }

      // Default error UI with accessibility support
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="error-boundary"
        >
          <Notification
            notification={{
              id: error.code,
              type: 'ERROR',
              priority: 'HIGH',
              category: 'SYSTEM',
              title: 'An error occurred',
              message: error.message,
              timestamp: new Date(),
              read: false
            }}
            onDismiss={() => {}} // Notification can't be dismissed in error state
          />
          
          {error.retryable && (
            <button
              onClick={this.handleRetry}
              disabled={isRetrying}
              className="error-boundary__retry-button"
              aria-label="Retry"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      );
    }

    // Render children if no error
    return children;
  }
}

export default ErrorBoundary;