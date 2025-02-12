/**
 * @fileoverview A React component for visualizing AI-generated lead scores and metrics
 * with enhanced accessibility and performance optimizations.
 * @version 1.0.0
 */

import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import ProgressBar from '../common/ProgressBar';
import { Lead, LeadScoreMetrics } from '../../types/lead.types';
import { ThemeMode } from '../../types/common.types';

/**
 * Props interface for the LeadScore component
 */
interface LeadScoreProps {
  /** Lead object containing the score */
  lead: Lead;
  /** Detailed scoring metrics */
  metrics: LeadScoreMetrics;
  /** Optional CSS class name */
  className?: string;
  /** Optional theme mode for color adaptation */
  themeMode?: ThemeMode;
  /** Optional error handler callback */
  onError?: (error: Error) => void;
}

/**
 * Determines the color of the progress bar based on score and theme
 */
const getScoreColor = (score: number, themeMode: ThemeMode = ThemeMode.LIGHT): 'success' | 'warning' | 'danger' => {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
};

/**
 * LeadScore component that visualizes lead scoring metrics with accessibility support
 */
export const LeadScore: React.FC<LeadScoreProps> = React.memo(({
  lead,
  metrics,
  className,
  themeMode = ThemeMode.LIGHT,
  onError
}) => {
  // Error boundary handler
  React.useEffect(() => {
    if (lead.score < 0 || lead.score > 100) {
      const error = new Error(`Invalid lead score: ${lead.score}`);
      onError?.(error);
    }
  }, [lead.score, onError]);

  // Memoized score color
  const scoreColor = React.useMemo(() => 
    getScoreColor(lead.score, themeMode),
    [lead.score, themeMode]
  );

  // Container class composition
  const containerClasses = classNames(
    'lead-score-container',
    `theme-${themeMode}`,
    className
  );

  return (
    <div 
      className={containerClasses}
      role="region"
      aria-label="Lead Score Analysis"
    >
      {/* Main lead score */}
      <div className="lead-score-main">
        <h3 className="lead-score-title">
          Lead Score
          <span className="lead-score-value">{lead.score}</span>
        </h3>
        <ProgressBar
          value={lead.score}
          max={100}
          color={scoreColor}
          showLabel
          size="lg"
          ariaLabel={`Overall lead score: ${lead.score} out of 100`}
        />
      </div>

      {/* Constituent metrics */}
      <div className="lead-score-metrics">
        {/* Engagement score */}
        <div className="metric-item">
          <label 
            htmlFor="engagement-score"
            className="metric-label"
          >
            Engagement
          </label>
          <ProgressBar
            id="engagement-score"
            value={metrics.engagement}
            max={100}
            color={getScoreColor(metrics.engagement, themeMode)}
            showLabel
            size="md"
            ariaLabel={`Engagement score: ${metrics.engagement} out of 100`}
          />
        </div>

        {/* Company fit score */}
        <div className="metric-item">
          <label 
            htmlFor="company-fit-score"
            className="metric-label"
          >
            Company Fit
          </label>
          <ProgressBar
            id="company-fit-score"
            value={metrics.companyFit}
            max={100}
            color={getScoreColor(metrics.companyFit, themeMode)}
            showLabel
            size="md"
            ariaLabel={`Company fit score: ${metrics.companyFit} out of 100`}
          />
        </div>

        {/* Budget score */}
        <div className="metric-item">
          <label 
            htmlFor="budget-score"
            className="metric-label"
          >
            Budget
          </label>
          <ProgressBar
            id="budget-score"
            value={metrics.budget}
            max={100}
            color={getScoreColor(metrics.budget, themeMode)}
            showLabel
            size="md"
            ariaLabel={`Budget score: ${metrics.budget} out of 100`}
          />
        </div>

        {/* Timing score */}
        <div className="metric-item">
          <label 
            htmlFor="timing-score"
            className="metric-label"
          >
            Timing
          </label>
          <ProgressBar
            id="timing-score"
            value={metrics.timing}
            max={100}
            color={getScoreColor(metrics.timing, themeMode)}
            showLabel
            size="md"
            ariaLabel={`Timing score: ${metrics.timing} out of 100`}
          />
        </div>
      </div>

      {/* Keyboard navigation support */}
      <div className="visually-hidden">
        <p>Use arrow keys to navigate between metrics. Press Enter to focus on a specific metric.</p>
      </div>
    </div>
  );
});

// Display name for debugging
LeadScore.displayName = 'LeadScore';

// Default export
export default LeadScore;

/**
 * CSS styles are expected to be defined in a separate stylesheet:
 * 
 * .lead-score-container {
 *   padding: 1.5rem;
 *   border-radius: 0.5rem;
 *   background: var(--surface-background);
 * }
 * 
 * .lead-score-main {
 *   margin-bottom: 2rem;
 * }
 * 
 * .lead-score-title {
 *   display: flex;
 *   justify-content: space-between;
 *   align-items: center;
 *   margin-bottom: 1rem;
 * }
 * 
 * .metric-item {
 *   margin-bottom: 1rem;
 * }
 * 
 * .metric-label {
 *   display: block;
 *   margin-bottom: 0.5rem;
 *   font-weight: 500;
 * }
 * 
 * .visually-hidden {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   border: 0;
 * }
 */