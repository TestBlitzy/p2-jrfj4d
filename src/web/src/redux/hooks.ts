import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { RootState, AppDispatch } from './store';

/**
 * Custom hook for type-safe dispatch operations with enhanced error handling
 * and performance monitoring in development mode.
 * 
 * @returns {AppDispatch} Typed dispatch function for dispatching actions
 */
export const useAppDispatch = (): AppDispatch => {
  // Initialize dispatch with type safety
  const dispatch = useDispatch<AppDispatch>();

  // Add development mode error boundary and performance monitoring
  if (process.env.NODE_ENV === 'development') {
    return (...args) => {
      try {
        // Track dispatch performance in development
        const startTime = performance.now();
        const result = dispatch(...args);
        const endTime = performance.now();

        // Log slow dispatches for optimization
        if (endTime - startTime > 100) {
          console.warn(
            '[Redux Dispatch Performance]',
            'Slow dispatch detected:',
            {
              action: args[0]?.type,
              duration: `${Math.round(endTime - startTime)}ms`
            }
          );
        }

        return result;
      } catch (error) {
        // Enhanced error logging in development
        console.error(
          '[Redux Dispatch Error]',
          'Action dispatch failed:',
          {
            action: args[0]?.type,
            error,
            payload: args[0]?.payload
          }
        );
        throw error;
      }
    };
  }

  // Return optimized dispatch for production
  return dispatch;
};

/**
 * Custom hook for type-safe state selection with memoization support
 * and comprehensive error handling. Implements performance optimizations
 * and validation in development mode.
 * 
 * @returns {TypedUseSelectorHook<RootState>} Typed selector hook for state access
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = (selector, equalityFn) => {
  // Initialize selector with type safety
  if (process.env.NODE_ENV === 'development') {
    return useSelector((state: RootState) => {
      try {
        // Track selector performance in development
        const startTime = performance.now();
        const result = selector(state);
        const endTime = performance.now();

        // Log slow selectors for optimization
        if (endTime - startTime > 50) {
          console.warn(
            '[Redux Selector Performance]',
            'Slow selector detected:',
            {
              selector: selector.name || 'anonymous',
              duration: `${Math.round(endTime - startTime)}ms`
            }
          );
        }

        // Validate selector result
        if (result === undefined) {
          console.warn(
            '[Redux Selector Warning]',
            'Selector returned undefined:',
            {
              selector: selector.name || 'anonymous'
            }
          );
        }

        return result;
      } catch (error) {
        // Enhanced error logging in development
        console.error(
          '[Redux Selector Error]',
          'Selector execution failed:',
          {
            selector: selector.name || 'anonymous',
            error,
            state
          }
        );
        throw error;
      }
    }, equalityFn);
  }

  // Return optimized selector for production
  return useSelector(selector, equalityFn);
};