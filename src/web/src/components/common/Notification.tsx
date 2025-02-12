import React, { useCallback, useEffect, useMemo } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0

import { Notification as NotificationData, NotificationType, NotificationPriority } from '../../types/notification.types';
import Icon from './Icon';
import useTheme from '../../hooks/useTheme';

interface NotificationProps {
  /** The notification data object */
  notification: NotificationData;
  /** Callback function when notification is dismissed */
  onDismiss: (id: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Whether to auto-dismiss the notification */
  autoClose?: boolean;
  /** Custom duration for auto-dismiss in milliseconds */
  duration?: number;
}

/**
 * Custom hook for generating notification styles based on type and theme
 */
const useNotificationStyles = (type: NotificationType, theme: any) => {
  return useMemo(() => {
    const colors = {
      [NotificationType.SUCCESS]: theme.palette.success,
      [NotificationType.ERROR]: theme.palette.error,
      [NotificationType.WARNING]: theme.palette.warning,
      [NotificationType.INFO]: theme.palette.info,
    };

    const color = colors[type];

    return {
      container: {
        backgroundColor: theme.palette.mode === 'dark' 
          ? `${color.dark}1A` // 10% opacity
          : `${color.light}1A`,
        border: `1px solid ${color.main}`,
        color: theme.palette.text.primary,
      },
      icon: {
        color: color.main,
      },
    };
  }, [type, theme]);
};

/**
 * Hook to handle automatic notification dismissal
 */
const useAutoDismiss = (
  priority: NotificationPriority,
  autoClose: boolean = true,
  duration: number = 5000,
  onDismiss: (id: string) => void,
  id: string
) => {
  useEffect(() => {
    if (!autoClose) return;

    // Adjust duration based on priority
    const dismissDuration = {
      [NotificationPriority.LOW]: duration,
      [NotificationPriority.MEDIUM]: duration * 1.5,
      [NotificationPriority.HIGH]: duration * 2,
    }[priority];

    const timer = setTimeout(() => {
      onDismiss(id);
    }, dismissDuration);

    return () => clearTimeout(timer);
  }, [autoClose, duration, id, onDismiss, priority]);
};

/**
 * Enterprise-grade notification component with accessibility and animations
 */
const Notification: React.FC<NotificationProps> = React.memo(({
  notification,
  onDismiss,
  className,
  style,
  autoClose = true,
  duration = 5000,
}) => {
  const { theme } = useTheme();
  const styles = useNotificationStyles(notification.type, theme);

  // Set up auto-dismiss
  useAutoDismiss(
    notification.priority,
    autoClose,
    duration,
    onDismiss,
    notification.id
  );

  // Memoized dismiss handler
  const handleDismiss = useCallback(() => {
    onDismiss(notification.id);
  }, [onDismiss, notification.id]);

  // Keyboard handler for accessibility
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }, [handleDismiss]);

  const iconMap = {
    [NotificationType.SUCCESS]: 'checkCircle',
    [NotificationType.ERROR]: 'error',
    [NotificationType.WARNING]: 'warning',
    [NotificationType.INFO]: 'info',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className={classNames(
          'notification',
          `notification--${notification.type.toLowerCase()}`,
          `notification--${notification.priority.toLowerCase()}`,
          className
        )}
        style={{
          ...styles.container,
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1],
          marginBottom: theme.spacing(1),
          maxWidth: '600px',
          width: '100%',
        }}
        role="alert"
        aria-live={notification.priority === NotificationPriority.HIGH ? 'assertive' : 'polite'}
      >
        <div className="notification__icon" style={{ marginRight: theme.spacing(2) }}>
          <Icon
            name={iconMap[notification.type]}
            size="md"
            style={styles.icon}
            aria-hidden="true"
          />
        </div>

        <div className="notification__content" style={{ flex: 1 }}>
          {notification.title && (
            <div 
              className="notification__title"
              style={{
                fontWeight: theme.typography.fontWeightMedium,
                marginBottom: theme.spacing(0.5),
              }}
            >
              {notification.title}
            </div>
          )}
          <div className="notification__message">
            {notification.message}
          </div>
        </div>

        <button
          className="notification__close"
          onClick={handleDismiss}
          onKeyPress={handleKeyPress}
          style={{
            background: 'none',
            border: 'none',
            padding: theme.spacing(1),
            cursor: 'pointer',
            marginLeft: theme.spacing(2),
            color: theme.palette.text.secondary,
          }}
          aria-label="Close notification"
        >
          <Icon
            name="close"
            size="sm"
            aria-hidden="true"
          />
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

Notification.displayName = 'Notification';

export default Notification;