import { Chart, ChartType, ChartOptions } from 'chart.js'; // v4.4.1
import { COLORS } from '../constants/theme.constants';

/**
 * Global chart animation duration in milliseconds
 * Optimized for smooth transitions while maintaining performance
 */
export const CHART_ANIMATION_DURATION = 750;

/**
 * Chart data update interval in milliseconds
 * For real-time data refresh without overwhelming the system
 */
export const CHART_UPDATE_INTERVAL = 30000;

/**
 * Chart dimension constraints for responsive layouts
 */
export const CHART_MIN_HEIGHT = 300;
export const CHART_MAX_HEIGHT = 600;
export const CHART_ASPECT_RATIO = 1.6;
export const CHART_TOOLTIP_OPACITY = 0.8;
export const CHART_RESIZE_DEBOUNCE = 250;
export const CHART_DATA_THRESHOLD = 10000;

/**
 * Supported chart types for various data visualizations
 */
export enum CHART_TYPES {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter'
}

/**
 * Default chart configuration options optimized for performance
 */
export const DEFAULT_CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: CHART_ASPECT_RATIO,
  animation: {
    duration: CHART_ANIMATION_DURATION,
    easing: 'easeInOutQuart'
  },
  plugins: {
    decimation: {
      enabled: true,
      threshold: CHART_DATA_THRESHOLD
    }
  },
  devicePixelRatio: window.devicePixelRatio || 1,
  resizeDelay: CHART_RESIZE_DEBOUNCE
};

/**
 * Enhanced chart grid styling options with theme integration
 */
export const CHART_GRID_OPTIONS = {
  display: true,
  color: COLORS.GREY[200],
  lineWidth: 1,
  drawBorder: false,
  drawOnChartArea: true,
  drawTicks: true,
  tickLength: 8,
  tickWidth: 1,
  tickColor: COLORS.GREY[300]
};

/**
 * Interactive chart legend configuration options
 */
export const CHART_LEGEND_OPTIONS = {
  position: 'top' as const,
  align: 'center' as const,
  labels: {
    usePointStyle: true,
    padding: 20,
    font: {
      size: 12,
      weight: 500
    },
    color: COLORS.GREY[800]
  },
  onClick: (e: MouseEvent, legendItem: any, legend: any) => {
    const index = legendItem.datasetIndex;
    const ci = legend.chart;
    if (ci.isDatasetVisible(index)) {
      ci.hide(index);
    } else {
      ci.show(index);
    }
  },
  onHover: (e: MouseEvent) => {
    e.native!.target.style.cursor = 'pointer';
  }
};

/**
 * Enhanced chart tooltip configuration with accessibility support
 */
export const CHART_TOOLTIP_OPTIONS = {
  enabled: true,
  mode: 'index' as const,
  intersect: false,
  position: 'nearest' as const,
  backgroundColor: `rgba(${COLORS.GREY[900]}, ${CHART_TOOLTIP_OPACITY})`,
  titleFont: {
    size: 13,
    weight: 600,
    family: "'Inter', sans-serif"
  },
  bodyFont: {
    size: 12,
    weight: 400,
    family: "'Inter', sans-serif"
  },
  padding: {
    top: 8,
    right: 12,
    bottom: 8,
    left: 12
  },
  caretSize: 6,
  cornerRadius: 4,
  displayColors: true
};

/**
 * Chart interaction settings for improved user experience
 */
export const CHART_INTERACTION_OPTIONS = {
  mode: 'nearest' as const,
  intersect: false,
  axis: 'x' as const,
  includeInvisible: false,
  events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
};

/**
 * Chart color schemes for different visualization types
 */
export const CHART_COLOR_SCHEMES = {
  primary: {
    backgroundColor: `${COLORS.PRIMARY.main}20`,
    borderColor: COLORS.PRIMARY.main,
    pointBackgroundColor: COLORS.PRIMARY.main,
    pointBorderColor: '#fff'
  },
  secondary: {
    backgroundColor: `${COLORS.SECONDARY.main}20`,
    borderColor: COLORS.SECONDARY.main,
    pointBackgroundColor: COLORS.SECONDARY.main,
    pointBorderColor: '#fff'
  }
};

/**
 * Performance optimization settings for large datasets
 */
export const CHART_PERFORMANCE_OPTIONS = {
  spanGaps: true,
  parsing: false,
  normalized: true,
  animation: {
    duration: CHART_DATA_THRESHOLD > 1000 ? 0 : CHART_ANIMATION_DURATION
  },
  elements: {
    point: {
      radius: CHART_DATA_THRESHOLD > 1000 ? 0 : 3
    },
    line: {
      tension: 0.4
    }
  }
};