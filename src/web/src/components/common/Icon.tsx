import React, { useMemo } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { BaseComponentProps } from '../types/common.types';
import { IconComponents } from '../../assets/icons';

// Literal type union of available icon names
type IconName = 
  | 'help' 
  | 'financial' 
  | 'info' 
  | 'add' 
  | 'close' 
  | 'chevronLeft' 
  | 'chevronRight';

// Size mapping in pixels
const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32
} as const;

interface IconProps extends BaseComponentProps {
  /** Name of the icon to render from the design system */
  name: IconName;
  /** Size variant of the icon */
  size?: keyof typeof SIZE_MAP;
  /** Color of the icon using CSS color or theme token */
  color?: string;
  /** Whether the icon is interactive */
  clickable?: boolean;
  /** Click handler for interactive icons */
  onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
}

/**
 * Maps icon names to their component implementations
 */
const ICON_MAP = {
  help: IconComponents.HelpIcon,
  financial: IconComponents.FinancialIcon,
  info: IconComponents.InfoIcon,
  add: IconComponents.AddIcon,
  close: IconComponents.CloseIcon,
  chevronLeft: IconComponents.ChevronLeftIcon,
  chevronRight: IconComponents.ChevronRightIcon
} as const;

/**
 * Returns the appropriate icon component with type safety
 */
const getIconComponent = (name: IconName) => {
  return useMemo(() => ICON_MAP[name] || null, [name]);
};

/**
 * A highly optimized icon component that renders SVG icons with proper accessibility
 * and performance considerations.
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'currentColor',
  clickable = false,
  onClick,
  className,
  style,
  ...props
}) => {
  // Get the icon component
  const IconComponent = getIconComponent(name);

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon set`);
    return null;
  }

  // Compute size in pixels
  const pixelSize = SIZE_MAP[size];

  // Combine classes
  const iconClasses = classNames(
    'icon',
    {
      'icon--clickable': clickable,
      [`icon--${size}`]: size
    },
    className
  );

  // Combine styles
  const iconStyles: React.CSSProperties = {
    color,
    width: pixelSize,
    height: pixelSize,
    cursor: clickable ? 'pointer' : 'inherit',
    ...style
  };

  // Handle keyboard interaction for clickable icons
  const handleKeyPress = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<SVGSVGElement>);
    }
  };

  return (
    <IconComponent
      {...props}
      className={iconClasses}
      style={iconStyles}
      onClick={clickable ? onClick : undefined}
      onKeyPress={clickable ? handleKeyPress : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : 'img'}
      aria-label={props.ariaLabel || `${name} icon`}
    />
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(Icon);