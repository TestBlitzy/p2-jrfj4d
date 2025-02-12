import React, { useState, useEffect, useCallback, useMemo } from 'react';
import classnames from 'classnames'; // v2.3.2
import { Chart } from '../common/Chart';
import { MarketTrend, TrendCategory, InsightSeverity } from '../../types/analytics.types';
import { formatMetricValue } from '../../utils/analytics.utils';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme.constants';
import { CHART_TYPES } from '../../constants/chart.constants';

// Component Props Interface
interface TrendAnalysisProps {
  trends: MarketTrend[];
  loading?: boolean;
  error?: string | null;
  onTrendSelect?: (trend: MarketTrend) => void;
  confidenceThreshold?: number;
  className?: string;
  refreshInterval?: number;
}

// Local Interfaces
interface TrendChartData {
  labels: string[];
  datasets: any[];
  patterns: any[];
}

/**
 * TrendAnalysis Component
 * Visualizes market trends and patterns with AI-driven insights
 * @version 1.0.0
 */
const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  trends,
  loading = false,
  error = null,
  onTrendSelect,
  confidenceThreshold = 0.9,
  className = '',
  refreshInterval = 30000
}) => {
  // State Management
  const [selectedTrend, setSelectedTrend] = useState<MarketTrend | null>(null);
  const [chartData, setChartData] = useState<TrendChartData>({
    labels: [],
    datasets: [],
    patterns: []
  });

  /**
   * Formats trend data for chart visualization
   */
  const formatTrendData = useCallback((trends: MarketTrend[]): TrendChartData => {
    const filteredTrends = trends.filter(trend => trend.confidence >= confidenceThreshold);
    
    return {
      labels: filteredTrends.map(trend => trend.detectedAt.toLocaleDateString()),
      datasets: [{
        label: 'Market Impact',
        data: filteredTrends.map(trend => trend.impact),
        backgroundColor: COLORS.PRIMARY.main + '20',
        borderColor: COLORS.PRIMARY.main,
        fill: true,
        tension: 0.4
      }],
      patterns: filteredTrends.map(trend => ({
        type: trend.category,
        confidence: trend.confidence,
        competitors: trend.competitors
      }))
    };
  }, [confidenceThreshold]);

  /**
   * Memoized chart options
   */
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: TYPOGRAPHY.FONT_FAMILY.primary,
            size: parseInt(TYPOGRAPHY.FONT_SIZE.sm)
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const trend = trends[context.dataIndex];
            return [
              `Impact: ${formatMetricValue(context.raw, 'market_share')}`,
              `Confidence: ${(trend.confidence * 100).toFixed(1)}%`,
              `Competitors: ${trend.competitors.join(', ')}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: COLORS.GREY[200]
        },
        ticks: {
          font: {
            family: TYPOGRAPHY.FONT_FAMILY.primary
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: COLORS.GREY[200]
        },
        ticks: {
          font: {
            family: TYPOGRAPHY.FONT_FAMILY.primary
          },
          callback: (value: number) => formatMetricValue(value, 'market_share')
        }
      }
    }
  }), [trends]);

  /**
   * Handles trend selection
   */
  const handleTrendSelect = useCallback((trend: MarketTrend) => {
    setSelectedTrend(trend);
    if (onTrendSelect) {
      onTrendSelect(trend);
    }
  }, [onTrendSelect]);

  /**
   * Renders trend insights panel
   */
  const renderTrendInsights = useCallback(() => {
    if (!selectedTrend) return null;

    return (
      <div className="trend-insights" style={{ padding: SPACING.SIZES.md }}>
        <h3 style={{ 
          fontFamily: TYPOGRAPHY.FONT_FAMILY.primary,
          fontSize: TYPOGRAPHY.FONT_SIZE.lg,
          marginBottom: SPACING.SIZES.sm
        }}>
          Trend Insights
        </h3>
        <div className="trend-details">
          <p className="trend-description">
            {selectedTrend.trend}
          </p>
          <div className="trend-metrics">
            <span className="confidence">
              Confidence: {(selectedTrend.confidence * 100).toFixed(1)}%
            </span>
            <span className="impact">
              Impact: {formatMetricValue(selectedTrend.impact, 'market_share')}
            </span>
          </div>
          {selectedTrend.competitors.length > 0 && (
            <div className="competitors">
              <h4>Affected Competitors:</h4>
              <ul>
                {selectedTrend.competitors.map((competitor, index) => (
                  <li key={index}>{competitor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedTrend]);

  // Update chart data when trends change
  useEffect(() => {
    setChartData(formatTrendData(trends));
  }, [trends, formatTrendData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        setChartData(formatTrendData(trends));
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [trends, refreshInterval, formatTrendData]);

  // Error state
  if (error) {
    return (
      <div className="trend-analysis-error" role="alert" aria-live="polite">
        <p style={{ color: COLORS.ERROR.main }}>{error}</p>
      </div>
    );
  }

  return (
    <div 
      className={classnames('trend-analysis', className)}
      style={{ minHeight: '400px' }}
    >
      {loading ? (
        <div className="trend-analysis-loading" role="status">
          <p>Loading trend analysis...</p>
        </div>
      ) : (
        <>
          <div className="trend-chart" style={{ height: '300px' }}>
            <Chart
              type={CHART_TYPES.AREA}
              data={chartData}
              options={chartOptions}
              enablePatternOverlay={true}
              enableRealTimeUpdates={true}
              accessibilityLabel="Market trend analysis chart"
              onDataPointClick={(_, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  handleTrendSelect(trends[index]);
                }
              }}
            />
          </div>
          {renderTrendInsights()}
        </>
      )}
    </div>
  );
};

export default TrendAnalysis;