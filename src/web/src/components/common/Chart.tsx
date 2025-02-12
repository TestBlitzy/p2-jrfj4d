import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js/auto'; // v4.4.1
import { merge } from 'lodash'; // v4.17.21
import { formatChartData, createChartOptions } from '../../utils/chart.utils';
import { CHART_TYPES, CHART_UPDATE_INTERVAL, CHART_RESIZE_DEBOUNCE } from '../../constants/chart.constants';

// Chart component props interface
interface ChartProps {
  type: CHART_TYPES;
  data: Record<string, any>;
  options?: Partial<ChartOptions>;
  height?: number;
  width?: number;
  className?: string;
  onDataPointClick?: (event: any, elements: any[]) => void;
  enablePatternOverlay?: boolean;
  enableRealTimeUpdates?: boolean;
  accessibilityLabel?: string;
  performanceMode?: boolean;
}

// Performance metrics interface
interface PerformanceMetrics {
  renderTime: number;
  updateCount: number;
  dataPoints: number;
}

/**
 * Enhanced Chart component with comprehensive data visualization capabilities
 * Supports multiple chart types, real-time updates, and accessibility features
 */
const Chart: React.FC<ChartProps> = ({
  type,
  data,
  options = {},
  height,
  width,
  className = '',
  onDataPointClick,
  enablePatternOverlay = false,
  enableRealTimeUpdates = false,
  accessibilityLabel = 'Data visualization chart',
  performanceMode = false,
}) => {
  // Refs and state
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);
  const updateTimer = useRef<NodeJS.Timeout | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    updateCount: 0,
    dataPoints: 0,
  });

  /**
   * Initialize chart instance with enhanced configuration
   */
  const initializeChart = useCallback(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    // Format data and create enhanced options
    const formattedData = formatChartData(data, type);
    const enhancedOptions = createChartOptions(type, merge({}, options, {
      onClick: onDataPointClick,
      devicePixelRatio: window.devicePixelRatio || 1,
      responsive: true,
      maintainAspectRatio: !height || !width,
    }));

    // Apply performance optimizations if needed
    if (performanceMode) {
      enhancedOptions.animation = { duration: 0 };
      enhancedOptions.elements = {
        point: { radius: 0 },
        line: { borderWidth: 1 }
      };
    }

    // Initialize Chart.js instance
    chartInstance.current = new ChartJS(ctx, {
      type: type as ChartType,
      data: formattedData,
      options: enhancedOptions,
    });

    // Update performance metrics
    setMetrics(prev => ({
      ...prev,
      renderTime: performance.now() - startTime,
      dataPoints: Object.keys(data).length,
    }));
  }, [data, type, options, height, width, onDataPointClick, performanceMode]);

  /**
   * Handle real-time data updates
   */
  const setupRealTimeUpdates = useCallback(() => {
    if (!enableRealTimeUpdates) return;

    updateTimer.current = setInterval(() => {
      if (chartInstance.current) {
        chartInstance.current.update('active');
        setMetrics(prev => ({
          ...prev,
          updateCount: prev.updateCount + 1,
        }));
      }
    }, CHART_UPDATE_INTERVAL);
  }, [enableRealTimeUpdates]);

  /**
   * Handle responsive resizing with debounce
   */
  const handleResize = useCallback(() => {
    if (!chartInstance.current) return;

    const resize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    let debounceTimer: NodeJS.Timeout;
    return () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(resize, CHART_RESIZE_DEBOUNCE);
    };
  }, []);

  /**
   * Apply pattern overlay for enhanced visualization
   */
  const applyPatternOverlay = useCallback(() => {
    if (!enablePatternOverlay || !chartInstance.current) return;

    const canvas = document.createElement('canvas');
    const patternCtx = canvas.getContext('2d');
    if (!patternCtx) return;

    // Create pattern
    const pattern = patternCtx.createPattern(canvas, 'repeat');
    if (!pattern) return;

    // Apply pattern to datasets
    chartInstance.current.data.datasets.forEach(dataset => {
      if (dataset.backgroundColor) {
        dataset.backgroundColor = pattern;
      }
    });

    chartInstance.current.update('none');
  }, [enablePatternOverlay]);

  // Initialize chart on mount
  useEffect(() => {
    initializeChart();
    setupRealTimeUpdates();
    const resizeHandler = handleResize();
    window.addEventListener('resize', resizeHandler);

    return () => {
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      window.removeEventListener('resize', resizeHandler);
    };
  }, [initializeChart, setupRealTimeUpdates, handleResize]);

  // Update chart when data or options change
  useEffect(() => {
    if (!chartInstance.current) return;

    const startTime = performance.now();
    
    chartInstance.current.data = formatChartData(data, type);
    chartInstance.current.options = merge({}, chartInstance.current.options, options);
    chartInstance.current.update('active');
    
    if (enablePatternOverlay) {
      applyPatternOverlay();
    }

    setMetrics(prev => ({
      ...prev,
      renderTime: performance.now() - startTime,
      dataPoints: Object.keys(data).length,
    }));
  }, [data, options, type, enablePatternOverlay, applyPatternOverlay]);

  return (
    <div 
      className={`chart-container ${className}`}
      style={{ height, width }}
      role="region"
      aria-label={accessibilityLabel}
    >
      <canvas
        ref={chartRef}
        role="img"
        aria-label={accessibilityLabel}
        tabIndex={0}
      />
    </div>
  );
};

export default Chart;