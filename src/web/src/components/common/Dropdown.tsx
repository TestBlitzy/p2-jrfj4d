/**
 * @fileoverview Production-ready, accessible dropdown component with virtualization support
 * @version 1.0.0
 * Dependencies:
 * - react: ^18.2.0
 * - classnames: ^2.3.2
 * - react-virtual: ^2.10.4
 * - use-debounce: ^9.0.0
 */

import React, { 
  useRef, 
  useState, 
  useCallback, 
  useEffect, 
  useMemo 
} from 'react';
import classNames from 'classnames';
import { useVirtual } from 'react-virtual';
import { useDebounce } from 'use-debounce';
import { SelectOption, BaseComponentProps } from '../../types/common.types';
import { validateRequired } from '../../utils/validation.utils';

interface DropdownProps extends BaseComponentProps {
  name: string;
  label?: string;
  options: SelectOption[];
  value: string | number | Array<string | number>;
  onChange: (value: string | number | Array<string | number>) => void;
  isMulti?: boolean;
  isSearchable?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  error?: string;
  ariaDescribedBy?: string;
  virtualizeOptions?: boolean;
  pageSize?: number;
  customOption?: React.ReactNode;
  renderOption?: (option: SelectOption) => React.ReactNode;
  noOptionsMessage?: string;
  loadingMessage?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  name,
  label,
  options,
  value,
  onChange,
  isMulti = false,
  isSearchable = false,
  isRequired = false,
  isDisabled = false,
  isLoading = false,
  placeholder = 'Select...',
  error,
  className,
  style,
  ariaLabel,
  ariaDescribedBy,
  virtualizeOptions = false,
  pageSize = 50,
  customOption,
  renderOption,
  noOptionsMessage = 'No options available',
  loadingMessage = 'Loading...',
  testId = 'dropdown'
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Memoized filtered options
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [options, debouncedSearch]);

  // Virtual list setup
  const rowVirtualizer = useVirtual({
    size: filteredOptions.length,
    parentRef: listRef,
    estimateSize: useCallback(() => 40, []),
    overscan: 5
  });

  // Handlers
  const handleChange = useCallback((selectedValue: string | number) => {
    if (isDisabled) return;

    let newValue: string | number | Array<string | number>;
    if (isMulti) {
      const currentValue = Array.isArray(value) ? value : [];
      newValue = currentValue.includes(selectedValue)
        ? currentValue.filter(v => v !== selectedValue)
        : [...currentValue, selectedValue];
    } else {
      newValue = selectedValue;
      setIsOpen(false);
    }

    // Validation
    if (isRequired) {
      const validationError = validateRequired(newValue, label || name);
      if (validationError) return;
    }

    onChange(newValue);
  }, [isDisabled, isMulti, value, onChange, isRequired, label, name]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setFocusedIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isDisabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleChange(filteredOptions[focusedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isDisabled, filteredOptions, focusedIndex, handleChange]);

  // Effects
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render helpers
  const renderSelectedValue = () => {
    if (isMulti && Array.isArray(value)) {
      const selectedOptions = options.filter(opt => value.includes(opt.value));
      return selectedOptions.length 
        ? selectedOptions.map(opt => opt.label).join(', ')
        : placeholder;
    }

    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  const optionsList = virtualizeOptions ? (
    <div 
      ref={listRef} 
      className="dropdown-virtual-list"
      style={{ height: Math.min(filteredOptions.length * 40, 300) }}
    >
      <div
        style={{
          height: `${rowVirtualizer.totalSize}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.virtualItems.map(virtualRow => (
          <div
            key={virtualRow.index}
            className={classNames('dropdown-option', {
              'dropdown-option-focused': focusedIndex === virtualRow.index,
              'dropdown-option-selected': Array.isArray(value) 
                ? value.includes(filteredOptions[virtualRow.index].value)
                : value === filteredOptions[virtualRow.index].value
            })}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
            onClick={() => handleChange(filteredOptions[virtualRow.index].value)}
          >
            {renderOption 
              ? renderOption(filteredOptions[virtualRow.index])
              : filteredOptions[virtualRow.index].label}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="dropdown-list">
      {filteredOptions.map((option, index) => (
        <div
          key={option.value}
          className={classNames('dropdown-option', {
            'dropdown-option-focused': focusedIndex === index,
            'dropdown-option-selected': Array.isArray(value) 
              ? value.includes(option.value)
              : value === option.value,
            'dropdown-option-disabled': option.disabled
          })}
          onClick={() => !option.disabled && handleChange(option.value)}
        >
          {renderOption ? renderOption(option) : option.label}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={dropdownRef}
      className={classNames('dropdown-container', className, {
        'dropdown-disabled': isDisabled,
        'dropdown-error': error
      })}
      style={style}
      data-testid={testId}
    >
      {label && (
        <label 
          htmlFor={name}
          className="dropdown-label"
        >
          {label}
          {isRequired && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div
        className={classNames('dropdown-control', {
          'dropdown-open': isOpen
        })}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={isDisabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${name}-list`}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy}
        aria-disabled={isDisabled}
        aria-required={isRequired}
      >
        <div className="dropdown-value">
          {renderSelectedValue()}
        </div>
        
        <div className="dropdown-indicators">
          {isLoading ? (
            <span className="dropdown-loading-indicator" />
          ) : (
            <span className="dropdown-arrow" />
          )}
        </div>
      </div>

      {isOpen && (
        <div 
          className="dropdown-menu"
          id={`${name}-list`}
          role="listbox"
          aria-multiselectable={isMulti}
        >
          {isSearchable && (
            <div className="dropdown-search">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search..."
                className="dropdown-search-input"
                aria-label="Search options"
              />
            </div>
          )}

          {isLoading ? (
            <div className="dropdown-message">{loadingMessage}</div>
          ) : filteredOptions.length === 0 ? (
            <div className="dropdown-message">{noOptionsMessage}</div>
          ) : (
            optionsList
          )}
        </div>
      )}

      {error && (
        <div className="dropdown-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default Dropdown;