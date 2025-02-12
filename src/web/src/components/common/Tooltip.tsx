import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { BaseComponentProps } from '../../types/common.types';
import Icon from './Icon';

// Position type for tooltip placement
type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';
type TooltipSize = 'sm' | 'md' | 'lg';
type TooltipTheme = 'light' | 'dark' | 'custom';

interface TooltipProps extends BaseComponentProps {
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Content to display in the tooltip */
  content: string | React.ReactNode;
  /** Preferred tooltip position */
  position?: TooltipPosition;
  /** Size variant of the tooltip */
  size?: TooltipSize;
  /** Visual theme of tooltip */
  theme?: TooltipTheme;
  /** Whether to show help icon */
  showIcon?: boolean;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  /** Delay in ms before showing tooltip */
  delay?: number;
  /** Distance from trigger element in pixels */
  offset?: number;
  /** Custom ID for accessibility */
  'aria-describedby'?: string;
  /** Callback when tooltip shows */
  onShow?: () => void;
  /** Callback when tooltip hides */
  onHide?: () => void;
}

const getTooltipPosition = (
  triggerElement: HTMLElement,
  tooltipElement: HTMLElement,
  preferredPosition: TooltipPosition,
  offset: number
): { top: number; left: number; position: TooltipPosition } => {
  const triggerRect = triggerElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  let position = preferredPosition;
  let top = 0;
  let left = 0;

  // Calculate positions for each orientation
  const positions = {
    top: {
      top: triggerRect.top - tooltipRect.height - offset,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
    },
    bottom: {
      top: triggerRect.bottom + offset,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
    },
    left: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.left - tooltipRect.width - offset
    },
    right: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.right + offset
    }
  };

  // Check if preferred position fits in viewport
  const fits = {
    top: positions.top.top >= 0,
    bottom: positions.bottom.top + tooltipRect.height <= viewport.height,
    left: positions.left.left >= 0,
    right: positions.right.left + tooltipRect.width <= viewport.width
  };

  // Use preferred position if it fits, otherwise find best alternative
  if (!fits[preferredPosition]) {
    const opposites = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    position = fits[opposites[preferredPosition]] ? opposites[preferredPosition] : 'top';
  }

  // Get final coordinates
  ({ top, left } = positions[position]);

  // Ensure tooltip stays within viewport bounds
  left = Math.max(offset, Math.min(left, viewport.width - tooltipRect.width - offset));
  top = Math.max(offset, Math.min(top, viewport.height - tooltipRect.height - offset));

  return { top, left, position };
};

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  size = 'md',
  theme = 'light',
  showIcon = false,
  disabled = false,
  delay = 200,
  offset = 8,
  'aria-describedby': ariaDescribedBy,
  onShow,
  onHide,
  className,
  style,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, position });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const tooltipId = ariaDescribedBy || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const newPosition = getTooltipPosition(
        triggerRef.current,
        tooltipRef.current,
        position,
        offset
      );
      setTooltipPosition(newPosition);
    }
  }, [position, offset]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
      // Update position after tooltip is visible
      requestAnimationFrame(updatePosition);
    }, delay);
  }, [disabled, delay, onShow, updatePosition]);

  const hideTooltip = useCallback(() => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, 100); // Small delay to prevent flickering
  }, [onHide]);

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [isVisible, updatePosition]);

  const tooltipClasses = classNames(
    'tooltip',
    `tooltip--${size}`,
    `tooltip--${theme}`,
    `tooltip--${tooltipPosition.position}`,
    {
      'tooltip--visible': isVisible
    },
    className
  );

  const tooltipStyles: React.CSSProperties = {
    position: 'fixed',
    top: tooltipPosition.top,
    left: tooltipPosition.left,
    zIndex: 1000,
    ...style
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? tooltipId : undefined}
        {...props}
      >
        {showIcon ? (
          <span className="tooltip-trigger-icon">
            {children}
            <Icon name="help" size="sm" className="tooltip-icon" />
          </span>
        ) : (
          children
        )}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={tooltipClasses}
          style={tooltipStyles}
        >
          <div className="tooltip-arrow" />
          <div className="tooltip-content">{content}</div>
        </div>
      )}
    </>
  );
};

export default React.memo(Tooltip);