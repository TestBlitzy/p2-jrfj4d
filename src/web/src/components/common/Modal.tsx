/**
 * @fileoverview A reusable modal component implementing the design system's overlay dialog
 * with accessibility features, animations, and responsive layouts.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Button from './Button';
import { BaseComponentProps } from '../types/common.types';

// Constants for modal configuration
const MODAL_SIZES = ['small', 'medium', 'large'] as const;
const Z_INDEX_MODAL = 1000;
const ANIMATION_DURATION = 300;
const MODAL_WIDTHS = {
  small: '400px',
  medium: '600px',
  large: '800px',
} as const;

type ModalSize = typeof MODAL_SIZES[number];

export interface ModalProps extends BaseComponentProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback function when modal closes */
  onClose: () => void;
  /** Modal title for accessibility */
  title: string;
  /** Modal size variant */
  size?: ModalSize;
  /** Allow closing on overlay click */
  closeOnOverlayClick?: boolean;
  /** Modal content */
  children: React.ReactNode;
  /** Animation duration in ms */
  animationDuration?: number;
  /** ID for aria-labelledby */
  'aria-labelledby'?: string;
  /** ID for aria-describedby */
  'aria-describedby'?: string;
}

/**
 * Modal component that implements an accessible overlay dialog with animations
 * and responsive layout support following the design system specifications.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  closeOnOverlayClick = true,
  className,
  children,
  style,
  testId,
  animationDuration = ANIMATION_DURATION,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = ariaLabelledBy || 'modal-title';
  const descriptionId = ariaDescribedBy || 'modal-description';

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap and cleanup on unmount
  useEffect(() => {
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (!modalRef.current || !isVisible) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => {
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isVisible]);

  const handleClose = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      onClose();
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }, animationDuration);
  }, [animationDuration, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      event.preventDefault();
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const modalContent = (
    <div
      className={classNames(
        'modal-overlay',
        {
          'modal-overlay--visible': isVisible,
          'modal-overlay--animating': isAnimating,
        }
      )}
      onClick={handleOverlayClick}
      style={{ zIndex: Z_INDEX_MODAL }}
      data-testid={testId}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={classNames(
          'modal',
          `modal--${size}`,
          { 'modal--animating': isAnimating },
          className
        )}
        style={{
          ...style,
          maxWidth: MODAL_WIDTHS[size],
          '--animation-duration': `${animationDuration}ms`,
        } as React.CSSProperties}
        onKeyDown={handleKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <Button
            variant="text"
            size="small"
            onClick={handleClose}
            ariaLabel="Close modal"
            className="modal__close-button"
          >
            ×
          </Button>
        </div>
        <div id={descriptionId} className="modal__content">
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default React.memo(Modal);