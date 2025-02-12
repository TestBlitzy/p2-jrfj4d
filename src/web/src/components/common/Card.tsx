import React, { useCallback, useState, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import type { Theme } from '@mui/material';
import { BaseComponentProps } from '../../types/common.types';
import useTheme from '../../hooks/useTheme';

// Card variant types for different use cases
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';

// Comprehensive props interface extending base component props
export interface CardProps extends BaseComponentProps {
  /** Card header content */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Card footer content */
  footer?: React.ReactNode;
  /** Visual variant of the card */
  variant?: CardVariant;
  /** Whether the card responds to hover/interaction */
  interactive?: boolean;
  /** ARIA role override */
  role?: string;
  /** Additional ARIA attributes */
  aria?: Record<string, string>;
}

// Styled container with responsive design
const CardContainer = styled(Paper, {
  shouldForwardProp: (prop) => 
    !['interactive', 'customElevation'].includes(prop as string),
})<{
  interactive?: boolean;
  customElevation?: number;
  theme: Theme;
}>(({ theme, interactive, customElevation }) => ({
  position: 'relative',
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  borderRadius: theme.shape.borderRadius * 1.5,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  ...(interactive && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  }),
  // Responsive padding based on breakpoints
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
  // Custom elevation if provided
  ...(typeof customElevation === 'number' && {
    boxShadow: theme.shadows[customElevation],
  }),
}));

// Styled header section
const CardHeader = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${
    theme.palette.mode === 'light' 
      ? theme.palette.grey[200] 
      : theme.palette.grey[800]
  }`,
}));

// Styled content section with responsive spacing
const CardContent = styled('div')(({ theme }) => ({
  position: 'relative',
  minHeight: theme.spacing(4),
}));

// Styled footer section
const CardFooter = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${
    theme.palette.mode === 'light' 
      ? theme.palette.grey[200] 
      : theme.palette.grey[800]
  }`,
}));

/**
 * Calculates card elevation based on variant and interaction state
 */
const useCardElevation = (
  variant: CardVariant = 'default',
  isHovered: boolean
): number => {
  const { theme } = useTheme();
  
  return useMemo(() => {
    switch (variant) {
      case 'elevated':
        return isHovered ? 4 : 2;
      case 'interactive':
        return isHovered ? 8 : 1;
      case 'outlined':
        return 0;
      default:
        return theme.palette.mode === 'light' ? 1 : 2;
    }
  }, [variant, isHovered, theme.palette.mode]);
};

/**
 * A highly reusable card component that provides a consistent container layout
 * with customizable header, content, and footer sections.
 */
export const Card: React.FC<CardProps> = ({
  header,
  children,
  footer,
  variant = 'default',
  interactive = false,
  className,
  style,
  testId = 'card',
  role = 'article',
  aria = {},
  ...rest
}) => {
  // Manage hover state for interactive cards
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate elevation based on variant and hover state
  const elevation = useCardElevation(variant, isHovered);

  // Memoized interaction handlers
  const handleMouseEnter = useCallback(() => {
    if (interactive) setIsHovered(true);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    if (interactive) setIsHovered(false);
  }, [interactive]);

  return (
    <CardContainer
      component="article"
      elevation={elevation}
      className={className}
      style={style}
      data-testid={testId}
      role={role}
      interactive={interactive}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...aria}
      {...rest}
    >
      {header && (
        <CardHeader role="header" data-testid={`${testId}-header`}>
          {header}
        </CardHeader>
      )}
      
      <CardContent role="main" data-testid={`${testId}-content`}>
        {children}
      </CardContent>

      {footer && (
        <CardFooter role="contentinfo" data-testid={`${testId}-footer`}>
          {footer}
        </CardFooter>
      )}
    </CardContainer>
  );
};

// Default export with display name for dev tools
Card.displayName = 'Card';
export default Card;