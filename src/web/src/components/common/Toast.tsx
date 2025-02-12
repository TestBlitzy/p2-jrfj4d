import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { NotificationType } from '../../types/notification.types';
import { useNotification } from '../../hooks/useNotification';
import { 
  NOTIFICATION_COLORS,
  NOTIFICATION_ICONS,
  NOTIFICATION_ANIMATION_DURATION 
} from '../../constants/notification.constants';

/**
 * Interface for Toast component props
 */
interface IToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Type of notification (success, error, warning, info) */
  type: NotificationType;
  /** Title text for the toast */
  title: string;
  /** Detailed message content */
  message: string;
  /** Auto-dismiss duration in milliseconds */
  duration?: number;
  /** Callback function when toast is dismissed */
  onDismiss?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

/**
 * Toast animation variants for Framer Motion
 */
const toastAnimationVariants = {
  initial: { 
    opacity: 0, 
    y: -20,
    scale: 0.95 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: NOTIFICATION_ANIMATION_DURATION / 1000,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: NOTIFICATION_ANIMATION_DURATION / 1000,
      ease: 'easeIn'
    }
  }
};

/**
 * Get appropriate icon component based on notification type
 */
const getToastIcon = (type: NotificationType): JSX.Element => {
  const iconName = NOTIFICATION_ICONS[type];
  const iconColor = NOTIFICATION_COLORS[type];
  
  return (
    <span 
      className="toast-icon" 
      role="img" 
      aria-hidden="true"
      style={{ color: iconColor }}
    >
      <i className={`material-icons-outlined ${iconName}`} />
    </span>
  );
};

/**
 * Generate class names based on notification type
 */
const getToastClassName = (type: NotificationType, className?: string): string => {
  return classNames(
    'toast',
    `toast-${type.toLowerCase()}`,
    'flex items-center p-4 rounded-lg shadow-lg',
    'max-w-md w-full bg-white dark:bg-gray-800',
    'border-l-4',
    {
      'border-green-500': type === NotificationType.SUCCESS,
      'border-red-500': type === NotificationType.ERROR,
      'border-yellow-500': type === NotificationType.WARNING,
      'border-blue-500': type === NotificationType.INFO
    },
    className
  );
};

/**
 * Toast component for displaying temporary notifications
 */
export const Toast: React.FC<IToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
  className,
  testId = 'toast'
}) => {
  const { dismissNotification } = useNotification();
  const dismissTimeout = useRef<NodeJS.Timeout>();

  /**
   * Handle toast dismissal with cleanup
   */
  const handleDismiss = useCallback(() => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
    }
    dismissNotification(id);
    onDismiss?.();
  }, [id, dismissNotification, onDismiss]);

  /**
   * Set up auto-dismiss timer
   */
  useEffect(() => {
    if (duration > 0) {
      dismissTimeout.current = setTimeout(handleDismiss, duration);
    }

    return () => {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, [duration, handleDismiss]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        role="alert"
        aria-live="polite"
        data-testid={testId}
        className={getToastClassName(type, className)}
        variants={toastAnimationVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Icon Section */}
        <div className="flex-shrink-0 mr-3">
          {getToastIcon(type)}
        </div>

        {/* Content Section */}
        <div className="flex-grow">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 
                   dark:text-gray-500 dark:hover:text-gray-400 
                   focus:outline-none focus:ring-2 focus:ring-offset-2 
                   focus:ring-offset-white dark:focus:ring-offset-gray-800 
                   focus:ring-gray-400 rounded-full p-1"
          aria-label="Close notification"
        >
          <span className="sr-only">Close</span>
          <i className="material-icons-outlined text-lg">close</i>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;