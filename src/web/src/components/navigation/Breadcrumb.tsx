import React, { useMemo } from 'react'; // v18.2.0
import { useLocation, Link } from 'react-router-dom'; // v6.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import Icon from '../common/Icon';
import {
  DASHBOARD_ROUTES,
  LEAD_ROUTES,
  MARKET_ROUTES,
  SETTINGS_ROUTES
} from '../../constants/routes.constants';

// Interfaces
interface BreadcrumbProps {
  className?: string;
  ariaLabel?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
  isClickable: boolean;
  icon?: string;
  metadata?: {
    tooltip?: string;
    ariaLabel?: string;
  };
}

// Styled Components
const StyledBreadcrumb = styled('nav')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  whiteSpace: 'nowrap',
  '&::-webkit-scrollbar': {
    display: 'none'
  },
  '@media (max-width: 768px)': {
    padding: theme.spacing(0.5, 1)
  }
}));

const StyledBreadcrumbItem = styled('span')<{
  isLast: boolean;
  isClickable: boolean;
}>(({ theme, isLast, isClickable }) => ({
  color: isLast ? theme.palette.text.primary : theme.palette.primary.main,
  fontWeight: isLast ? 600 : 400,
  cursor: isClickable ? 'pointer' : 'default',
  transition: 'color 0.2s ease',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  '&:hover': {
    color: isClickable ? theme.palette.primary.dark : undefined,
    textDecoration: isClickable ? 'underline' : 'none'
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
    borderRadius: 2
  }
}));

const StyledSeparator = styled(Icon)(({ theme }) => ({
  color: theme.palette.text.secondary,
  margin: theme.spacing(0, 0.5)
}));

// Route mapping for human-readable labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  leads: 'Leads',
  market: 'Market Intelligence',
  settings: 'Settings',
  competitors: 'Competitors',
  revenue: 'Revenue',
  performance: 'Performance',
  insights: 'Insights',
  reports: 'Reports',
  create: 'Create',
  edit: 'Edit',
  scoring: 'Scoring',
  history: 'History',
  intelligence: 'Intelligence',
  trends: 'Trends',
  'price-alerts': 'Price Alerts',
  industry: 'Industry Analysis',
  share: 'Market Share',
  predictions: 'Predictions',
  profile: 'Profile',
  integrations: 'Integrations',
  notifications: 'Notifications',
  security: 'Security',
  'api-keys': 'API Keys',
  team: 'Team Management',
  billing: 'Billing',
  'audit-logs': 'Audit Logs'
};

/**
 * Generates breadcrumb items from the current location path
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  // Remove trailing slash and split path
  const paths = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  
  // Handle empty path (home)
  if (paths.length === 0) {
    return [{
      label: 'Dashboard',
      path: '/',
      isLast: true,
      isClickable: false
    }];
  }

  return paths.reduce<BreadcrumbItem[]>((breadcrumbs, path, index) => {
    // Handle dynamic route parameters
    const isDynamicParam = path.startsWith(':') || /^\d+$/.test(path);
    
    // Build cumulative path
    const currentPath = `/${paths.slice(0, index + 1).join('/')}`;
    
    // Generate label
    let label = isDynamicParam ? 'Details' : ROUTE_LABELS[path] || path;
    
    // Create breadcrumb item
    const breadcrumbItem: BreadcrumbItem = {
      label,
      path: currentPath,
      isLast: index === paths.length - 1,
      isClickable: !isDynamicParam && index !== paths.length - 1,
      metadata: {
        ariaLabel: `Navigate to ${label}`,
        tooltip: isDynamicParam ? 'View details' : undefined
      }
    };

    return [...breadcrumbs, breadcrumbItem];
  }, []);
};

/**
 * A responsive breadcrumb navigation component that displays the current location
 * hierarchy with enhanced accessibility and internationalization support.
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className,
  ariaLabel = 'Page navigation breadcrumb'
}) => {
  const location = useLocation();
  
  // Memoize breadcrumb generation
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname),
    [location.pathname]
  );

  return (
    <StyledBreadcrumb
      aria-label={ariaLabel}
      className={className}
      role="navigation"
    >
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && (
            <StyledSeparator
              name="chevronRight"
              size="sm"
              aria-hidden="true"
            />
          )}
          
          {item.isClickable ? (
            <Link
              to={item.path}
              style={{ textDecoration: 'none' }}
              aria-label={item.metadata?.ariaLabel}
              title={item.metadata?.tooltip}
            >
              <StyledBreadcrumbItem
                isLast={item.isLast}
                isClickable={item.isClickable}
              >
                {item.label}
              </StyledBreadcrumbItem>
            </Link>
          ) : (
            <StyledBreadcrumbItem
              isLast={item.isLast}
              isClickable={item.isClickable}
              aria-current={item.isLast ? 'page' : undefined}
            >
              {item.label}
            </StyledBreadcrumbItem>
          )}
        </React.Fragment>
      ))}
    </StyledBreadcrumb>
  );
};

export default React.memo(Breadcrumb);