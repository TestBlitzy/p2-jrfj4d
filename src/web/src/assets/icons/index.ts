import React, { SVGProps } from 'react'; // v18.2.0

// Common interface for icon props extending standard SVG props
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  title?: string;
}

// Help/Info tooltip icon [?]
export const HelpIcon: React.FC<IconProps> = ({ size = 24, title = 'Help', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    aria-label={title}
    role="img"
    {...props}
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
    <path d="M12 17v-6" strokeWidth="2"/>
    <circle cx="12" cy="7" r="1"/>
  </svg>
);

// Financial data icon [$]
export const FinancialIcon: React.FC<IconProps> = ({ size = 24, title = 'Financial', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M12 2v20M17 5h-4.5a3.5 3.5 0 0 0 0 7h3a3.5 3.5 0 0 1 0 7H7" strokeWidth="2"/>
  </svg>
);

// Information icon [i]
export const InfoIcon: React.FC<IconProps> = ({ size = 24, title = 'Information', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
    <path d="M12 8v8M12 7v.01" strokeWidth="2"/>
  </svg>
);

// Add/Create new icon [+]
export const AddIcon: React.FC<IconProps> = ({ size = 24, title = 'Add', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M12 5v14M5 12h14" strokeWidth="2"/>
  </svg>
);

// Close/Delete icon [x]
export const CloseIcon: React.FC<IconProps> = ({ size = 24, title = 'Close', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M18 6L6 18M6 6l12 12" strokeWidth="2"/>
  </svg>
);

// Navigation icons [<][>]
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, title = 'Previous', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M15 18l-6-6 6-6" strokeWidth="2"/>
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, title = 'Next', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M9 18l6-6-6-6" strokeWidth="2"/>
  </svg>
);

// Upload icon [^]
export const UploadIcon: React.FC<IconProps> = ({ size = 24, title = 'Upload', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M12 17V3M5 10l7-7 7 7M19 21H5" strokeWidth="2"/>
  </svg>
);

// Menu/Dashboard icon [#]
export const MenuIcon: React.FC<IconProps> = ({ size = 24, title = 'Menu', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2"/>
  </svg>
);

// User profile icon [@]
export const UserIcon: React.FC<IconProps> = ({ size = 24, title = 'User Profile', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <circle cx="12" cy="8" r="4" strokeWidth="2"/>
    <path d="M20 21a8 8 0 1 0-16 0" strokeWidth="2"/>
  </svg>
);

// Alerts/Warnings icon [!]
export const AlertIcon: React.FC<IconProps> = ({ size = 24, title = 'Alert', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M12 9v5M12 17v.01" strokeWidth="2"/>
    <path d="M10.24 3.95L1.8 18.29A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.73-2.71L13.76 3.95a2 2 0 0 0-3.52 0z" strokeWidth="2"/>
  </svg>
);

// Settings menu icon [=]
export const SettingsIcon: React.FC<IconProps> = ({ size = 24, title = 'Settings', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <circle cx="12" cy="12" r="3" strokeWidth="2"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="2"/>
  </svg>
);

// Favorite/Important icon [*]
export const StarIcon: React.FC<IconProps> = ({ size = 24, title = 'Favorite', filled = false, ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    aria-label={title}
    role="img"
    {...props}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2"/>
  </svg>
);