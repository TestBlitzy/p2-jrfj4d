import React, { useMemo, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Typography, useTheme, useMediaQuery } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import type { BaseComponentProps } from '../../types/common.types';

// Styled components for enhanced layout and responsiveness
const StyledCardContent = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const MetricContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const TrendIndicator = styled('div')<{ $positive: boolean }>(({ theme, $positive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: $positive ? theme.palette.success.main : theme.palette.error.main,
  transition: theme.transitions.create('color'),
}));

// Props interface with strict typing
interface StatisticCardProps extends BaseComponentProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  trend?: number;
  trendType?: 'higher-better' | 'lower-better';
  progress?: number;
  subtitle?: string;
  locale?: string;
  customFormatting?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: 'compact' | 'standard';
  };
}

/**
 * Formats numeric values based on specified format and locale
 */
const formatValue = (
  value: number,
  format: StatisticCardProps['format'] = 'number',
  locale: string = 'en-US',
  customFormatting?: StatisticCardProps['customFormatting']
): string => {
  const options: Intl.NumberFormatOptions = {
    ...customFormatting,
    style: format === 'currency' ? 'currency' : 'decimal',
    currency: format === 'currency' ? 'USD' : undefined,
    minimumFractionDigits: customFormatting?.minimumFractionDigits ?? 0,
    maximumFractionDigits: customFormatting?.maximumFractionDigits ?? 2,
  };

  if (format === 'percentage') {
    return `${(value * 100).toFixed(1)}%`;
  }

  return new Intl.NumberFormat(locale, options).format(value);
};

/**
 * A reusable card component for displaying statistics and metrics
 * with support for trends and progress indicators
 */
export const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  format = 'number',
  trend,
  trendType = 'higher-better',
  progress,
  subtitle,
  locale = 'en-US',
  customFormatting,
  className,
  style,
  testId = 'statistic-card',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Memoized formatted value
  const formattedValue = useMemo(() => 
    formatValue(value, format, locale, customFormatting),
    [value, format, locale, customFormatting]
  );

  // Determine trend direction and positivity
  const isTrendPositive = useMemo(() => {
    if (trend === undefined) return false;
    return trendType === 'higher-better' ? trend > 0 : trend < 0;
  }, [trend, trendType]);

  // Memoized trend indicator component
  const renderTrendIndicator = useCallback(() => {
    if (trend === undefined) return null;

    const TrendIcon = isTrendPositive ? TrendingUpIcon : TrendingDownIcon;
    const trendValue = Math.abs(trend * 100).toFixed(1);

    return (
      <TrendIndicator
        $positive={isTrendPositive}
        role="status"
        aria-label={`${isTrendPositive ? 'Positive' : 'Negative'} trend of ${trendValue}%`}
      >
        <TrendIcon fontSize={isMobile ? 'small' : 'medium'} />
        <Typography variant="body2" component="span">
          {trendValue}%
        </Typography>
      </TrendIndicator>
    );
  }, [trend, isTrendPositive, isMobile]);

  return (
    <Card
      className={className}
      style={style}
      testId={testId}
      variant="elevated"
      aria={{ 'aria-label': `Statistic card for ${title}` }}
    >
      <StyledCardContent>
        <Typography
          variant="h6"
          color="textSecondary"
          gutterBottom
          component="h2"
        >
          {title}
        </Typography>

        <MetricContainer>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="div"
            color="textPrimary"
          >
            {formattedValue}
          </Typography>
          {renderTrendIndicator()}
        </MetricContainer>

        {progress !== undefined && (
          <ProgressBar
            value={progress}
            max={100}
            color={progress >= 75 ? 'success' : progress >= 50 ? 'warning' : 'primary'}
            size="sm"
            showLabel
            aria-label={`Progress: ${progress}%`}
          />
        )}

        {subtitle && (
          <Typography
            variant="body2"
            color="textSecondary"
            component="p"
          >
            {subtitle}
          </Typography>
        )}
      </StyledCardContent>
    </Card>
  );
};

// Default export with display name for dev tools
StatisticCard.displayName = 'StatisticCard';
export default StatisticCard;