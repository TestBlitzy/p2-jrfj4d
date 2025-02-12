import { Chart, ChartType, ChartData, ChartConfiguration, ChartOptions } from 'chart.js'; // v4.4.1
import { merge } from 'lodash'; // v4.17.21
import { 
  CHART_TYPES,
  DEFAULT_CHART_OPTIONS,
  CHART_DATA_THRESHOLD,
  CHART_GRID_OPTIONS,
  CHART_LEGEND_OPTIONS,
  CHART_TOOLTIP_OPTIONS,
  CHART_INTERACTION_OPTIONS,
  CHART_COLOR_SCHEMES,
  CHART_PERFORMANCE_OPTIONS
} from '../constants/chart.constants';

/**
 * Interface for chart dimensions with responsive support
 */
interface ChartDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Formats raw data into Chart.js compatible dataset structure
 * Optimized for large datasets with automatic sampling
 */
export const formatChartData = (
  rawData: Record<string, any>,
  chartType: CHART_TYPES
): ChartData => {
  // Validate input data
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid raw data format');
  }

  // Apply data sampling for large datasets
  let processedData = rawData;
  if (Object.keys(rawData).length > CHART_DATA_THRESHOLD) {
    processedData = sampleLargeDataset(rawData);
  }

  // Transform data based on chart type
  const formattedData: ChartData = {
    labels: [],
    datasets: []
  };

  switch (chartType) {
    case CHART_TYPES.LINE:
    case CHART_TYPES.AREA:
      formattedData.datasets = formatLineData(processedData);
      break;
    case CHART_TYPES.BAR:
      formattedData.datasets = formatBarData(processedData);
      break;
    case CHART_TYPES.PIE:
      formattedData.datasets = formatPieData(processedData);
      break;
    default:
      throw new Error(`Unsupported chart type: ${chartType}`);
  }

  return formattedData;
};

/**
 * Creates customized chart options with responsive support
 * Merges default options with custom overrides
 */
export const createChartOptions = (
  chartType: CHART_TYPES,
  customOptions: Partial<ChartOptions> = {}
): ChartOptions => {
  const baseOptions: ChartOptions = {
    ...DEFAULT_CHART_OPTIONS,
    scales: getScalesConfig(chartType),
    plugins: {
      ...DEFAULT_CHART_OPTIONS.plugins,
      legend: CHART_LEGEND_OPTIONS,
      tooltip: CHART_TOOLTIP_OPTIONS
    },
    interaction: CHART_INTERACTION_OPTIONS
  };

  // Apply performance optimizations for large datasets
  if (customOptions.data && Object.keys(customOptions.data).length > CHART_DATA_THRESHOLD) {
    merge(baseOptions, CHART_PERFORMANCE_OPTIONS);
  }

  // Deep merge with custom options
  return merge({}, baseOptions, customOptions);
};

/**
 * Calculates responsive chart dimensions based on container size
 * Optimized for different device types and screen sizes
 */
export const getChartDimensions = (
  containerWidth: number,
  containerHeight: number
): ChartDimensions => {
  if (!containerWidth || !containerHeight) {
    throw new Error('Invalid container dimensions');
  }

  const dimensions: ChartDimensions = {
    width: containerWidth,
    height: containerHeight,
    aspectRatio: DEFAULT_CHART_OPTIONS.aspectRatio || 1.6
  };

  // Apply responsive adjustments based on screen size
  if (window.innerWidth < 600) { // Mobile devices
    dimensions.aspectRatio = 1.2;
  } else if (window.innerWidth < 960) { // Tablets
    dimensions.aspectRatio = 1.4;
  }

  // Calculate height based on aspect ratio
  dimensions.height = Math.min(
    dimensions.width / dimensions.aspectRatio,
    containerHeight
  );

  return dimensions;
};

/**
 * Validates chart configuration with enhanced checks
 * Includes accessibility and performance validation
 */
export const validateChartConfig = (config: ChartConfiguration): boolean => {
  try {
    // Check required properties
    if (!config.type || !config.data) {
      return false;
    }

    // Validate data structure
    if (!Array.isArray(config.data.datasets) || !config.data.labels) {
      return false;
    }

    // Verify options format
    if (config.options && typeof config.options !== 'object') {
      return false;
    }

    // Check accessibility requirements
    if (!validateAccessibility(config)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Chart configuration validation failed:', error);
    return false;
  }
};

/**
 * Helper function to sample large datasets
 * Uses systematic sampling to maintain data representation
 */
const sampleLargeDataset = (data: Record<string, any>): Record<string, any> => {
  const samplingRate = Math.ceil(Object.keys(data).length / CHART_DATA_THRESHOLD);
  return Object.fromEntries(
    Object.entries(data).filter((_, index) => index % samplingRate === 0)
  );
};

/**
 * Formats data specifically for line/area charts
 */
const formatLineData = (data: Record<string, any>): any[] => {
  return Object.entries(data).map(([key, values]) => ({
    label: key,
    data: values,
    ...CHART_COLOR_SCHEMES.primary,
    fill: CHART_TYPES.AREA ? true : false,
    tension: 0.4
  }));
};

/**
 * Formats data specifically for bar charts
 */
const formatBarData = (data: Record<string, any>): any[] => {
  return Object.entries(data).map(([key, values]) => ({
    label: key,
    data: values,
    ...CHART_COLOR_SCHEMES.secondary,
    borderWidth: 1
  }));
};

/**
 * Formats data specifically for pie charts
 */
const formatPieData = (data: Record<string, any>): any[] => {
  return [{
    data: Object.values(data),
    backgroundColor: Object.keys(data).map((_, index) => 
      CHART_COLOR_SCHEMES.primary.backgroundColor[index % CHART_COLOR_SCHEMES.primary.backgroundColor.length]
    )
  }];
};

/**
 * Gets scale configuration based on chart type
 */
const getScalesConfig = (chartType: CHART_TYPES): any => {
  if (chartType === CHART_TYPES.PIE) {
    return {};
  }

  return {
    x: {
      grid: CHART_GRID_OPTIONS,
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10
      }
    },
    y: {
      grid: CHART_GRID_OPTIONS,
      beginAtZero: true,
      ticks: {
        maxTicksLimit: 8
      }
    }
  };
};

/**
 * Validates chart accessibility requirements
 */
const validateAccessibility = (config: ChartConfiguration): boolean => {
  // Check for ARIA labels
  if (!config.options?.plugins?.tooltip?.callbacks?.label) {
    return false;
  }

  // Verify color contrast
  if (!validateColorContrast(config)) {
    return false;
  }

  return true;
};

/**
 * Validates color contrast for accessibility
 */
const validateColorContrast = (config: ChartConfiguration): boolean => {
  // Implement color contrast validation logic
  return true; // Placeholder implementation
};