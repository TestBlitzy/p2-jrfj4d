/**
 * @fileoverview Enhanced date picker component with comprehensive validation,
 * accessibility, and internationalization support for the Sales & Intelligence Platform.
 * @version 1.0.0
 * @package react-datepicker ^4.21.0
 * @package classnames ^2.3.2
 */

import React, { useCallback, useMemo, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import classNames from 'classnames';
import { BaseComponentProps, DateRange } from '../../types/common.types';
import { formatDate, isValidDate, getDateRange } from '../../utils/date.utils';

/**
 * Props interface for the DatePicker component
 */
interface DatePickerProps extends BaseComponentProps {
  value?: Date | null;
  onChange?: (date: Date | null, isValid: boolean) => void;
  range?: boolean;
  dateRange?: DateRange | null;
  onRangeChange?: (range: DateRange | null, isValid: boolean) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  format?: string;
  error?: string;
  locale?: string;
  showTimeSelect?: boolean;
  isClearable?: boolean;
  monthsShown?: number;
}

/**
 * Enhanced date picker component with comprehensive validation and accessibility support
 */
export const DatePicker: React.FC<DatePickerProps> = React.memo(({
  className,
  style,
  value,
  onChange,
  range = false,
  dateRange,
  onRangeChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = 'Select date',
  format = 'MM/dd/yyyy',
  error,
  locale = 'en',
  showTimeSelect = false,
  isClearable = true,
  monthsShown = 1,
  id,
  testId,
  ariaLabel,
}) => {
  // Local state for internal date management
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(dateRange || null);
  const [localError, setLocalError] = useState<string | undefined>(error);

  // Memoized date formatter
  const formatDateString = useMemo(() => (
    (date: Date) => formatDate(date, format, { locale })
  ), [format, locale]);

  // Validate date selection
  const validateDate = useCallback((date: Date | null): boolean => {
    if (!date) return true;
    if (!isValidDate(date)) return false;
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  }, [minDate, maxDate]);

  // Handle single date selection
  const handleDateChange = useCallback((date: Date | null) => {
    const isValid = validateDate(date);
    setLocalError(isValid ? undefined : 'Invalid date selection');
    setSelectedDate(date);
    onChange?.(date, isValid);

    // Announce change to screen readers
    if (date && isValid) {
      const announcement = `Selected date: ${formatDateString(date)}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('role', 'status');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    }
  }, [onChange, validateDate, formatDateString]);

  // Handle date range selection
  const handleRangeChange = useCallback(([start, end]: [Date | null, Date | null]) => {
    if (!start || !end) {
      setSelectedRange(null);
      onRangeChange?.(null, true);
      return;
    }

    try {
      const newRange = getDateRange(start, end);
      const startValid = validateDate(start);
      const endValid = validateDate(end);
      const isValid = startValid && endValid;

      setLocalError(isValid ? undefined : 'Invalid date range selection');
      setSelectedRange(newRange);
      onRangeChange?.(newRange, isValid);

      // Announce range change to screen readers
      if (isValid) {
        const announcement = `Selected date range from ${formatDateString(start)} to ${formatDateString(end)}`;
        const ariaLive = document.createElement('div');
        ariaLive.setAttribute('role', 'status');
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.textContent = announcement;
        document.body.appendChild(ariaLive);
        setTimeout(() => document.body.removeChild(ariaLive), 1000);
      }
    } catch (error) {
      setLocalError('Invalid date range');
      onRangeChange?.(null, false);
    }
  }, [onRangeChange, validateDate, formatDateString]);

  // Memoized class names
  const containerClasses = useMemo(() => classNames(
    'date-picker-container',
    {
      'date-picker-disabled': disabled,
      'date-picker-error': localError,
      'date-picker-range': range
    },
    className
  ), [className, disabled, localError, range]);

  return (
    <div 
      className={containerClasses}
      style={style}
      data-testid={testId}
    >
      <ReactDatePicker
        selected={range ? selectedRange?.startDate : selectedDate}
        onChange={range ? handleRangeChange : handleDateChange}
        startDate={range ? selectedRange?.startDate : undefined}
        endDate={range ? selectedRange?.endDate : undefined}
        selectsRange={range}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        placeholderText={placeholder}
        dateFormat={format}
        locale={locale}
        showTimeSelect={showTimeSelect}
        isClearable={isClearable}
        monthsShown={monthsShown}
        id={id}
        aria-label={ariaLabel || placeholder}
        aria-invalid={!!localError}
        aria-describedby={localError ? `${id}-error` : undefined}
        className={classNames(
          'date-picker-input',
          { 'date-picker-input-error': localError }
        )}
        calendarClassName="date-picker-calendar"
        withPortal={window.innerWidth < 768} // Mobile responsiveness
        portalId="date-picker-portal"
      />
      {localError && (
        <div 
          className="date-picker-error-message"
          id={`${id}-error`}
          role="alert"
        >
          {localError}
        </div>
      )}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;