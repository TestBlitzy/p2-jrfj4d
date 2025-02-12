/**
 * @fileoverview Enhanced pagination component with accessibility and performance optimizations
 * for the Sales & Intelligence Platform.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';
import Button from './Button';

// Constants
const ELLIPSIS = '...';
const MAX_VISIBLE_PAGES = 5;
const DEFAULT_PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

/**
 * Props interface for the Pagination component
 */
interface PaginationProps extends BaseComponentProps {
  /** Current active page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize?: number;
  /** Callback for page change events */
  onPageChange: (page: number) => Promise<void>;
  /** Callback for page size change events */
  onPageSizeChange?: (size: number) => void;
  /** Loading state indicator */
  isLoading?: boolean;
}

/**
 * Enhanced pagination component with accessibility features, mobile responsiveness,
 * and performance optimizations.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  className,
  style,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Memoized function to generate optimized page numbers array with ellipsis
   */
  const pageNumbers = useMemo(() => {
    const generatePageNumbers = (
      current: number,
      total: number,
      maxVisible: number
    ): (number | string)[] => {
      if (total <= maxVisible) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }

      const pages: (number | string)[] = [];
      const sidePages = Math.floor((maxVisible - 3) / 2);
      const leftBound = Math.max(2, current - sidePages);
      const rightBound = Math.min(total - 1, current + sidePages);

      pages.push(1);
      
      if (leftBound > 2) {
        pages.push(ELLIPSIS);
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < total - 1) {
        pages.push(ELLIPSIS);
      }

      pages.push(total);

      return pages;
    };

    return generatePageNumbers(currentPage, totalPages, MAX_VISIBLE_PAGES);
  }, [currentPage, totalPages]);

  /**
   * Debounced page change handler with loading states and error handling
   */
  const handlePageChange = useCallback(async (newPage: number) => {
    if (
      newPage === currentPage ||
      newPage < 1 ||
      newPage > totalPages ||
      isTransitioning
    ) {
      return;
    }

    try {
      setIsTransitioning(true);
      setError(null);
      await onPageChange(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change page');
      console.error('Pagination error:', err);
    } finally {
      setIsTransitioning(false);
    }
  }, [currentPage, totalPages, isTransitioning, onPageChange]);

  /**
   * Keyboard navigation handler for accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, page: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePageChange(page);
    }
  }, [handlePageChange]);

  /**
   * Page size change handler with validation
   */
  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (onPageSizeChange && !isNaN(newSize)) {
      onPageSizeChange(newSize);
    }
  }, [onPageSizeChange]);

  return (
    <nav
      className={classNames('pagination', className, {
        'pagination--loading': isLoading || isTransitioning,
        'pagination--error': error,
      })}
      style={style}
      role="navigation"
      aria-label="Pagination"
    >
      {error && (
        <div className="pagination__error" role="alert">
          {error}
        </div>
      )}

      <div className="pagination__controls">
        <Button
          variant="secondary"
          size="small"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading || isTransitioning}
          aria-label="Previous page"
          className="pagination__button pagination__button--prev"
        >
          <span aria-hidden="true">&lt;</span>
        </Button>

        <div className="pagination__pages" role="group" aria-label="Page numbers">
          {pageNumbers.map((page, index) => {
            const isEllipsis = page === ELLIPSIS;
            const pageNumber = typeof page === 'number' ? page : null;

            return (
              <React.Fragment key={`${page}-${index}`}>
                {isEllipsis ? (
                  <span className="pagination__ellipsis" aria-hidden="true">
                    {ELLIPSIS}
                  </span>
                ) : (
                  <Button
                    variant={currentPage === page ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => pageNumber && handlePageChange(pageNumber)}
                    onKeyDown={(e) => pageNumber && handleKeyDown(e, pageNumber)}
                    disabled={isLoading || isTransitioning}
                    aria-current={currentPage === page ? 'page' : undefined}
                    aria-label={`Page ${page}`}
                    className={classNames('pagination__button', {
                      'pagination__button--active': currentPage === page,
                    })}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="small"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading || isTransitioning}
          aria-label="Next page"
          className="pagination__button pagination__button--next"
        >
          <span aria-hidden="true">&gt;</span>
        </Button>
      </div>

      {onPageSizeChange && (
        <div className="pagination__size-selector">
          <label htmlFor="pageSize" className="pagination__size-label">
            Items per page:
          </label>
          <select
            id="pageSize"
            className="pagination__size-select"
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={isLoading || isTransitioning}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
};

export default Pagination;