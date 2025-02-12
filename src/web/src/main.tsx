import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import { Workbox } from 'workbox-window';

import App from './App';
import store from './redux/store';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getAuthConfig } from './config/auth.config';

// Version comments for external dependencies
// react: ^18.2.0
// react-dom: ^18.2.0
// react-redux: ^9.0.0
// @mui/material: ^5.0.0
// workbox-window: ^7.0.0

/**
 * Initialize application-level configurations and monitoring
 */
const initializeApp = (): void => {
  // Validate environment variables
  if (!process.env.VITE_API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL');
  }

  // Initialize auth configuration
  getAuthConfig();

  // Register service worker for PWA support
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    const wb = new Workbox('/service-worker.js');
    
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        // Notify user of update
        console.info('New content is available; please refresh.');
      }
    });

    wb.addEventListener('activated', () => {
      // Notify user that offline functionality is ready
      console.info('App is ready for offline use.');
    });

    wb.register().catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  }

  // Initialize performance monitoring in production
  if (process.env.NODE_ENV === 'production') {
    // Report web vitals
    const reportWebVitals = async (metric: any) => {
      const body = JSON.stringify({
        ...metric,
        timestamp: new Date().toISOString(),
        version: process.env.VITE_APP_VERSION
      });

      try {
        await fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
      } catch (error) {
        console.error('Failed to report web vitals:', error);
      }
    };

    // Initialize performance observer
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        reportWebVitals(entry);
      });
    });

    observer.observe({ 
      entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
    });
  }
};

/**
 * Renders the root application component with all required providers
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        enableMonitoring={process.env.NODE_ENV === 'production'}
        onError={(error, errorInfo) => {
          // Log errors in production
          if (process.env.NODE_ENV === 'production') {
            console.error('Application Error:', {
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
              timestamp: new Date().toISOString(),
              version: process.env.VITE_APP_VERSION
            });
          }
        }}
      >
        <Provider store={store}>
          <ThemeProvider theme={{}}>
            <App />
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Initialize app and render
try {
  initializeApp();
  renderApp();
} catch (error) {
  console.error('Failed to initialize application:', error);
  // Display fallback UI for critical errors
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}