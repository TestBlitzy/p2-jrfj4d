import React, { useMemo, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';
import { BaseComponentProps } from '../../types/common.types';
import useTheme from '../../hooks/useTheme';

// Card size variants
export type CardSize = 'small' | 'medium' | 'large';

// Card content variants
export type DashboardCardVariant = 'metrics' | 'pipeline' | 'insights';

// Props interface extending base component props
export interface DashboardCardProps extends BaseComponentProps {
  /** Card title */
  title: string;
  /** Main content */
  content: React.ReactNode;
  /** Icon identifier */
  icon?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action click handler */
  onActionClick?: () => void;
  /** Card variant */
  variant?: DashboardCardVariant;
  /** Loading state */
  loading?: boolean;
  /** Accessibility label */
  ariaLabel?: string;
  /** Card size */
  size?: CardSize;
}

// Styled container with responsive design
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => !['size', 'variant'].includes(prop as string),
})<{
  size?: CardSize;
  variant?: DashboardCardVariant;
}>(({ theme, size, variant }) => ({
  height: '100%',
  minHeight: size === 'small' ? 200 : size === 'medium' ? 300 : 400,
  transition: theme.transitions.create(['transform', 'box-shadow']),
  
  // Variant-specific styling
  ...(variant === 'metrics' && {
    background: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  }),
  ...(variant === 'pipeline' && {
    background: theme.palette.background.paper,
    borderLeft: `4px solid ${theme.palette.secondary.main}`,
  }),
  ...(variant === 'insights' && {
    background: theme.palette.background.paper,
    borderTop: `4px solid ${theme.palette.warning.main}`,
  }),

  // Responsive padding
  padding: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(5),
  },

  // Hover effects
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

// Styled header with flex layout
const CardHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(3),
}));

// Styled title with proper typography
const CardTitle = styled('h3')(({ theme }) => ({
  ...theme.typography.h6,
  margin: 0,
  fontWeight: theme.typography.fontWeightMedium,
}));

// Styled content container
const CardContent = styled('div')(({ theme }) => ({
  position: 'relative',
  flex: 1,
  minHeight: theme.spacing(10),
}));

// Styled footer with action button
const CardFooter = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(3),
  textAlign: 'right',
}));

// Styled action button
const ActionButton = styled('button')(({ theme }) => ({
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  ...theme.typography.button,
  transition: theme.transitions.create(['background-color', 'opacity']),
  
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.1)',
  },
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
  },
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}));

/**
 * DashboardCard component for displaying metrics, pipeline status, and insights
 * with comprehensive features and accessibility support.
 */
export const DashboardCard: React.FC<DashboardCardProps> = React.memo(({
  title,
  content,
  icon,
  actionLabel,
  onActionClick,
  variant = 'metrics',
  loading = false,
  size = 'medium',
  className,
  style,
  ariaLabel,
  testId = 'dashboard-card',
}) => {
  const { theme } = useTheme();

  // Memoized card header
  const renderHeader = useMemo(() => (
    <CardHeader>
      <CardTitle>
        {icon && (
          <Icon
            name={icon as any}
            size="md"
            style={{ marginRight: theme.spacing(1) }}
            aria-hidden="true"
          />
        )}
        {title}
      </CardTitle>
    </CardHeader>
  ), [icon, title, theme]);

  // Memoized action handler
  const handleAction = useCallback(() => {
    if (onActionClick && !loading) {
      onActionClick();
    }
  }, [onActionClick, loading]);

  return (
    <StyledCard
      variant={variant === 'metrics' ? 'elevated' : 'outlined'}
      size={size}
      className={className}
      style={style}
      testId={testId}
      aria-label={ariaLabel || title}
      role="region"
    >
      {renderHeader}
      
      <CardContent>
        {loading ? (
          <div aria-busy="true" aria-label="Loading content">
            {/* Loading skeleton would be implemented here */}
          </div>
        ) : (
          content
        )}
      </CardContent>

      {actionLabel && (
        <CardFooter>
          <ActionButton
            onClick={handleAction}
            disabled={loading}
            aria-label={actionLabel}
            data-testid={`${testId}-action`}
          >
            {actionLabel}
          </ActionButton>
        </CardFooter>
      )}
    </StyledCard>
  );
});

DashboardCard.displayName = 'DashboardCard';

export default DashboardCard;