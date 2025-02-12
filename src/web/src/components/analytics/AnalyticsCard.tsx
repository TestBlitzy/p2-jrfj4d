import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Card, CardProps } from '../common/Card';
import Chart from '../common/Chart';
import { 
  AnalyticsMetricType, 
  AnalyticsDataPoint,
  ChartType,
  isAnalyticsDataPoint
} from '../../types/analytics.types';

// Styled components for enhanced visuals
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  '.chart-container': {
    minHeight: 300,
    padding: theme.spacing(2, 0)
  },
  '.header-content': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  '.metric-value': {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.primary.main
  },
  '.insights-container': {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius
  }
}));

// Props interface with strict typing
export interface AnalyticsCardProps {
  title: string;
  metricType: AnalyticsMetricType;
  data: AnalyticsDataPoint[];
  loading?: boolean;
  error?: string;
  patternConfig?: {
    enabled: boolean;
    sensitivity: number;
  };
  enableRealTime?: boolean;
  className?: string;
  onDataPointClick?: (point: AnalyticsDataPoint) => void;
}

/**
 * Advanced analytics card component with real-time updates and pattern recognition
 */
export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  metricType,
  data,
  loading = false,
  error,
  patternConfig = { enabled: false, sensitivity: 0.8 },
  enableRealTime = false,
  className,
  onDataPointClick
}) => {
  // State management
  const [processedData, setProcessedData] = useState<AnalyticsDataPoint[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  // Memoized chart configuration
  const chartConfig = useMemo(() => ({
    type: getChartTypeForMetric(metricType),
    data: formatChartData(processedData),
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'top' as const
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => formatTooltipLabel(context, metricType)
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: getMetricLabel(metricType)
          }
        }
      }
    }
  }), [processedData, metricType]);

  // Process data and detect patterns
  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    const validData = data.filter(isAnalyticsDataPoint);
    setProcessedData(validData);

    if (patternConfig.enabled) {
      const detectedInsights = detectPatterns(validData, patternConfig.sensitivity);
      setInsights(detectedInsights);
    }
  }, [data, patternConfig]);

  // Handle real-time updates
  useEffect(() => {
    if (!enableRealTime) return;

    const updateInterval = setInterval(() => {
      // Implement real-time data update logic here
    }, 30000); // 30-second update interval

    return () => clearInterval(updateInterval);
  }, [enableRealTime]);

  // Render header content with metric information
  const renderHeader = useCallback(() => (
    <div className="header-content">
      <div>
        <h3>{title}</h3>
        {loading && <span>Loading...</span>}
      </div>
      {!loading && !error && processedData.length > 0 && (
        <div className="metric-value">
          {formatMetricValue(processedData[processedData.length - 1].value, metricType)}
        </div>
      )}
    </div>
  ), [title, loading, error, processedData, metricType]);

  // Handle chart click events
  const handleChartClick = useCallback((event: any, elements: any[]) => {
    if (elements.length > 0 && onDataPointClick) {
      const dataIndex = elements[0].index;
      onDataPointClick(processedData[dataIndex]);
    }
  }, [processedData, onDataPointClick]);

  // Render insights section if patterns are detected
  const renderInsights = useCallback(() => {
    if (!insights.length) return null;

    return (
      <div className="insights-container">
        <h4>Insights</h4>
        <ul>
          {insights.map((insight, index) => (
            <li key={index}>{insight}</li>
          ))}
        </ul>
      </div>
    );
  }, [insights]);

  return (
    <StyledCard
      className={className}
      header={renderHeader()}
      testId={`analytics-card-${metricType}`}
      variant="elevated"
    >
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <Chart
            type={chartConfig.type}
            data={chartConfig.data}
            options={chartConfig.options}
            enablePatternOverlay={patternConfig.enabled}
            enableRealTimeUpdates={enableRealTime}
            onDataPointClick={handleChartClick}
            accessibilityLabel={`${title} analytics chart`}
          />
          {renderInsights()}
        </>
      )}
    </StyledCard>
  );
};

// Helper functions
const getChartTypeForMetric = (metricType: AnalyticsMetricType): ChartType => {
  switch (metricType) {
    case AnalyticsMetricType.REVENUE:
    case AnalyticsMetricType.SALES_VELOCITY:
      return ChartType.AREA;
    case AnalyticsMetricType.CONVERSION_RATE:
    case AnalyticsMetricType.ENGAGEMENT_RATE:
      return ChartType.LINE;
    default:
      return ChartType.BAR;
  }
};

const formatChartData = (data: AnalyticsDataPoint[]) => ({
  labels: data.map(d => d.timestamp),
  datasets: [{
    data: data.map(d => d.value),
    fill: true,
    tension: 0.4
  }]
});

const formatTooltipLabel = (context: any, metricType: AnalyticsMetricType) => {
  const value = context.raw;
  return `${getMetricLabel(metricType)}: ${formatMetricValue(value, metricType)}`;
};

const getMetricLabel = (metricType: AnalyticsMetricType): string => {
  switch (metricType) {
    case AnalyticsMetricType.REVENUE:
      return 'Revenue';
    case AnalyticsMetricType.CONVERSION_RATE:
      return 'Conversion Rate';
    case AnalyticsMetricType.SALES_VELOCITY:
      return 'Sales Velocity';
    default:
      return 'Value';
  }
};

const formatMetricValue = (value: number, metricType: AnalyticsMetricType): string => {
  switch (metricType) {
    case AnalyticsMetricType.REVENUE:
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(value);
    case AnalyticsMetricType.CONVERSION_RATE:
    case AnalyticsMetricType.ENGAGEMENT_RATE:
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
};

const detectPatterns = (data: AnalyticsDataPoint[], sensitivity: number): string[] => {
  const insights: string[] = [];
  
  // Implement pattern detection logic here
  // This is a placeholder for the actual implementation
  if (data.length >= 2) {
    const lastValue = data[data.length - 1].value;
    const previousValue = data[data.length - 2].value;
    const change = ((lastValue - previousValue) / previousValue) * 100;
    
    if (Math.abs(change) > sensitivity * 100) {
      insights.push(`Significant ${change > 0 ? 'increase' : 'decrease'} of ${Math.abs(change).toFixed(1)}% detected`);
    }
  }

  return insights;
};

export default AnalyticsCard;