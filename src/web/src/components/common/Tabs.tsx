/**
 * @fileoverview Enhanced tabbed interface component with accessibility and responsive features
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Tabs as MuiTabs, Tab, Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps } from '../../types/common.types';

// Version comments for external dependencies
// @mui/material: ^5.0.0
// react: ^18.2.0

/**
 * Interface for individual tab configuration
 */
interface TabItem {
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

/**
 * Props interface for the Tabs component
 */
interface TabsProps extends BaseComponentProps {
  tabs: TabItem[];
  defaultTab?: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  onTabChange?: (index: number) => void;
  ariaLabel?: string;
  scrollButtons?: 'auto' | 'desktop' | 'on' | 'off';
  centered?: boolean;
  indicatorColor?: 'primary' | 'secondary';
  textColor?: 'primary' | 'secondary' | 'inherit';
}

/**
 * Styled tab panel container with responsive layout
 */
const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  minHeight: '200px',
  '&[hidden]': {
    display: 'none',
  },
}));

/**
 * Error boundary wrapper for tab content
 */
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box p={2} color="error.main">
          An error occurred while rendering this tab content.
        </Box>
      );
    }
    return this.props.children;
  }
}

/**
 * Enhanced Tabs component with accessibility and responsive features
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab = 0,
  orientation = 'horizontal',
  variant = 'standard',
  onTabChange,
  ariaLabel = 'Navigation tabs',
  scrollButtons = 'auto',
  centered = false,
  indicatorColor = 'primary',
  textColor = 'primary',
  className,
  style,
}) => {
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Adjust orientation based on screen size
  const effectiveOrientation = isMobile ? 'horizontal' : orientation;
  const effectiveVariant = isMobile ? 'scrollable' : variant;

  /**
   * Handle tab change with error boundary and analytics
   */
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      if (newValue >= 0 && newValue < tabs.length && !tabs[newValue].disabled) {
        setSelectedTab(newValue);
        onTabChange?.(newValue);

        // Update URL for deep linking
        const tabId = `tab-${newValue}`;
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}#${tabId}`
        );
      }
    },
    [tabs, onTabChange]
  );

  /**
   * Render individual tab panel with error boundary
   */
  const renderTabPanel = useCallback(
    (content: React.ReactNode, index: number) => (
      <TabPanel
        role="tabpanel"
        hidden={selectedTab !== index}
        id={`tabpanel-${index}`}
        aria-labelledby={`tab-${index}`}
        key={index}
      >
        <TabErrorBoundary>
          {selectedTab === index && content}
        </TabErrorBoundary>
      </TabPanel>
    ),
    [selectedTab]
  );

  // Sync with URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const tabIndex = parseInt(hash.replace('#tab-', ''));
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < tabs.length) {
        setSelectedTab(tabIndex);
      }
    }
  }, [tabs.length]);

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: effectiveOrientation === 'vertical' ? 'row' : 'column',
        width: '100%',
      }}
    >
      <MuiTabs
        value={selectedTab}
        onChange={handleTabChange}
        orientation={effectiveOrientation}
        variant={effectiveVariant}
        scrollButtons={scrollButtons}
        aria-label={ariaLabel}
        centered={centered && effectiveOrientation === 'horizontal'}
        indicatorColor={indicatorColor}
        textColor={textColor}
        sx={{
          borderRight: effectiveOrientation === 'vertical' ? 1 : 0,
          borderColor: 'divider',
          minWidth: effectiveOrientation === 'vertical' ? '200px' : 'auto',
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            icon={tab.icon}
            disabled={tab.disabled}
            id={`tab-${index}`}
            aria-controls={`tabpanel-${index}`}
            sx={{
              minHeight: effectiveOrientation === 'vertical' ? '48px' : '72px',
            }}
          />
        ))}
      </MuiTabs>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        {tabs.map((tab, index) => renderTabPanel(tab.content, index))}
      </Box>
    </Box>
  );
};

export default Tabs;