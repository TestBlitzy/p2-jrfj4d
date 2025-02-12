import { Chart, ChartType, ChartOptions } from 'chart.js'; // v4.4.1
import { CHART_TYPES } from '../constants/chart.constants';
import { COLORS } from '../constants/theme.constants';

// Global chart configuration constants
const CHART_DEFAULT_HEIGHT = 400;
const CHART_DEFAULT_WIDTH = 640;
const CHART_ANIMATION_DURATION = 750;
const CHART_UPDATE_INTERVAL = 30000;
const CHART_DATA_THRESHOLD = 10000;
const CHART_MEMORY_LIMIT = 100000;

/**
 * Core chart configuration with performance optimizations and accessibility features
 */
export const chartConfig = {
  defaults: {
    height: CHART_DEFAULT_HEIGHT,
    width: CHART_DEFAULT_WIDTH,
    maintainAspectRatio: true,
    devicePixelRatio: window.devicePixelRatio || 1,
    font: {
      family: "'Inter', sans-serif",
      size: 12,
      weight: 500
    }
  },

  responsive: {
    rules: [
      {
        condition: (width: number) => width < 600,
        config: {
          maintainAspectRatio: false,
          legend: { position: 'bottom' as const }
        }
      },
      {
        condition: (width: number) => width >= 600 && width < 960,
        config: {
          aspectRatio: 1.5,
          legend: { position: 'right' as const }
        }
      }
    ]
  },

  animation: {
    duration: CHART_ANIMATION_DURATION,
    easing: 'easeInOutQuart',
    mode: 'active',
    resize: {
      duration: 0
    },
    onProgress: (animation: any) => {
      if (animation.currentStep >= animation.numSteps) {
        animation.chart.update('none');
      }
    }
  },

  performance: {
    decimation: {
      enabled: true,
      algorithm: 'min-max',
      threshold: CHART_DATA_THRESHOLD
    },
    sampling: {
      enabled: true,
      threshold: CHART_MEMORY_LIMIT
    },
    spanGaps: true,
    parsing: false,
    normalized: true
  },

  accessibility: {
    announceNewData: {
      enabled: true,
      announcementStyle: 'assertive'
    },
    callbacks: {
      label: (context: any) => `${context.label}: ${context.formattedValue}`,
      title: (tooltipItems: any[]) => tooltipItems[0].label
    },
    interactions: {
      mode: 'nearest' as const,
      axis: 'xy' as const,
      intersect: false
    }
  }
};

/**
 * Line chart specific configuration optimized for time-series data
 */
export const lineChartConfig = {
  options: {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM D'
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: COLORS.GREY[200]
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    },
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    }
  }
};

/**
 * Bar chart specific configuration for comparative analysis
 */
export const barChartConfig = {
  options: {
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: COLORS.GREY[200]
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
        borderRadius: 4
      }
    },
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    }
  }
};

/**
 * Pie chart specific configuration for distribution analysis
 */
export const pieChartConfig = {
  options: {
    cutout: '0%',
    radius: '90%',
    elements: {
      arc: {
        borderWidth: 2
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.formattedValue;
            const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  }
};

/**
 * Returns optimized chart configuration based on chart type and options
 */
export function getChartConfig(
  type: ChartType,
  customOptions?: ChartOptions,
  performanceOptions?: {
    enableAnimation?: boolean;
    dataSize?: number;
    memoryLimit?: number;
  }
): ChartOptions {
  // Select base configuration
  let baseConfig: ChartOptions = { ...chartConfig.defaults };

  // Apply type-specific configuration
  switch (type) {
    case CHART_TYPES.LINE:
      baseConfig = { ...baseConfig, ...lineChartConfig.options };
      break;
    case CHART_TYPES.BAR:
      baseConfig = { ...baseConfig, ...barChartConfig.options };
      break;
    case CHART_TYPES.PIE:
      baseConfig = { ...baseConfig, ...pieChartConfig.options };
      break;
    default:
      break;
  }

  // Apply performance optimizations
  if (performanceOptions) {
    const { enableAnimation, dataSize, memoryLimit } = performanceOptions;
    
    baseConfig = {
      ...baseConfig,
      animation: {
        ...chartConfig.animation,
        duration: enableAnimation ? CHART_ANIMATION_DURATION : 0
      },
      performance: {
        ...chartConfig.performance,
        decimation: {
          ...chartConfig.performance.decimation,
          threshold: dataSize || CHART_DATA_THRESHOLD
        },
        sampling: {
          ...chartConfig.performance.sampling,
          threshold: memoryLimit || CHART_MEMORY_LIMIT
        }
      }
    };
  }

  // Merge with custom options if provided
  return {
    ...baseConfig,
    ...customOptions,
    plugins: {
      ...baseConfig.plugins,
      ...customOptions?.plugins
    }
  };
}