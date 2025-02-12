/**
 * @fileoverview Enhanced table component with accessibility, responsive design,
 * and advanced features for the Sales & Intelligence Platform.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';
import { Pagination } from './Pagination';
import { formatCurrency, formatPercentage, formatNumber, truncateText } from '../../utils/format.utils';

// Constants for table configuration
const DEFAULT_PAGE_SIZE = 10;
const MOBILE_BREAKPOINT = 768;
const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
  NONE: 'none'
} as const;

type SortDirection = typeof SORT_DIRECTIONS[keyof typeof SORT_DIRECTIONS];

/**
 * Interface for column configuration
 */
interface ColumnConfig<T = any> {
  id: string;
  label: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  formatter?: (value: any) => string | React.ReactNode;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  priority?: number; // For responsive visibility
  align?: 'left' | 'center' | 'right';
  cellRenderer?: (value: any, row: T) => React.ReactNode;
  headerRenderer?: (column: ColumnConfig<T>) => React.ReactNode;
}

/**
 * Interface for table sort state
 */
interface SortState {
  columnId: string;
  direction: SortDirection;
}

/**
 * Props interface for the Table component
 */
interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: ColumnConfig<T>[];
  onSort?: (sortState: SortState) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  error?: Error | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize?: number;
    onPageChange: (page: number) => Promise<void>;
    onPageSizeChange?: (size: number) => void;
  };
  emptyStateMessage?: string;
  stickyHeader?: boolean;
  highlightOnHover?: boolean;
  striped?: boolean;
  dense?: boolean;
  fullWidth?: boolean;
}

/**
 * Enhanced table component with comprehensive features for data display
 */
export const Table = <T extends Record<string, any>>({
  data,
  columns,
  onSort,
  onRowClick,
  isLoading = false,
  error = null,
  pagination,
  emptyStateMessage = 'No data available',
  stickyHeader = true,
  highlightOnHover = true,
  striped = true,
  dense = false,
  fullWidth = true,
  className,
  style,
  ariaLabel,
}: TableProps<T>): JSX.Element => {
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(columns);
  const [isMobile, setIsMobile] = useState(false);

  /**
   * Handle window resize for responsive column visibility
   */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      
      if (mobile) {
        setVisibleColumns(columns.filter(col => col.priority !== undefined && col.priority <= 2));
      } else {
        setVisibleColumns(columns);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [columns]);

  /**
   * Enhanced sort handler with multi-column support
   */
  const handleSort = useCallback((columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    setSortState(prevState => {
      const newState: SortState = {
        columnId,
        direction: SORT_DIRECTIONS.ASC
      };

      if (prevState?.columnId === columnId) {
        if (prevState.direction === SORT_DIRECTIONS.ASC) {
          newState.direction = SORT_DIRECTIONS.DESC;
        } else if (prevState.direction === SORT_DIRECTIONS.DESC) {
          return null;
        }
      }

      onSort?.(newState);
      return newState;
    });
  }, [columns, onSort]);

  /**
   * Enhanced cell renderer with formatting support
   */
  const renderCell = useCallback((row: T, column: ColumnConfig<T>) => {
    const value = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor];

    if (column.cellRenderer) {
      return column.cellRenderer(value, row);
    }

    if (column.formatter) {
      return column.formatter(value);
    }

    if (typeof value === 'number') {
      return formatNumber(value);
    }

    if (typeof value === 'string') {
      return truncateText(value);
    }

    return value;
  }, []);

  /**
   * Enhanced header cell renderer with sort indicators
   */
  const renderHeaderCell = useCallback((column: ColumnConfig<T>) => {
    if (column.headerRenderer) {
      return column.headerRenderer(column);
    }

    const isSorted = sortState?.columnId === column.id;
    const sortDirection = isSorted ? sortState.direction : undefined;

    return (
      <div className="table__header-cell-content">
        <span>{column.label}</span>
        {column.sortable && (
          <span 
            className={classNames('table__sort-indicator', {
              'table__sort-indicator--active': isSorted,
              'table__sort-indicator--asc': sortDirection === SORT_DIRECTIONS.ASC,
              'table__sort-indicator--desc': sortDirection === SORT_DIRECTIONS.DESC,
            })}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }, [sortState]);

  const tableClasses = classNames(
    'table',
    {
      'table--loading': isLoading,
      'table--error': error,
      'table--sticky-header': stickyHeader,
      'table--highlight-hover': highlightOnHover,
      'table--striped': striped,
      'table--dense': dense,
      'table--full-width': fullWidth,
      'table--mobile': isMobile,
    },
    className
  );

  return (
    <div className="table-container" style={style}>
      {error && (
        <div className="table__error" role="alert">
          {error.message}
        </div>
      )}

      <table 
        className={tableClasses}
        aria-label={ariaLabel}
        aria-busy={isLoading}
      >
        <thead>
          <tr>
            {visibleColumns.map(column => (
              <th
                key={column.id}
                className={classNames('table__header-cell', {
                  'table__header-cell--sortable': column.sortable,
                  'table__header-cell--sorted': sortState?.columnId === column.id,
                  [`table__header-cell--align-${column.align || 'left'}`]: true,
                })}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                onClick={() => column.sortable && handleSort(column.id)}
                aria-sort={
                  sortState?.columnId === column.id
                    ? sortState.direction === SORT_DIRECTIONS.ASC
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {renderHeaderCell(column)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="table__row--skeleton">
                {visibleColumns.map(column => (
                  <td key={column.id} className="table__cell--skeleton">
                    <div className="skeleton-loader" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td 
                colSpan={visibleColumns.length}
                className="table__empty-state"
              >
                {emptyStateMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={classNames('table__row', {
                  'table__row--clickable': !!onRowClick,
                })}
              >
                {visibleColumns.map(column => (
                  <td
                    key={column.id}
                    className={classNames('table__cell', {
                      [`table__cell--align-${column.align || 'left'}`]: true,
                    })}
                  >
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          isLoading={isLoading}
          className="table__pagination"
        />
      )}
    </div>
  );
};

export default Table;