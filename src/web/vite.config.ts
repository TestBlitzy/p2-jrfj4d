import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for React components
      fastRefresh: true,
      // Babel configuration for optimal JSX transformation
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    tsconfigPaths({
      // Enable TypeScript path resolution with caching
      loose: false,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    })
  ],

  server: {
    port: 3000,
    // Configure proxy for API and WebSocket connections
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    },
    // CORS configuration for development
    cors: {
      origin: ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Hot Module Replacement settings
    hmr: {
      overlay: true,
      clientPort: 3000,
      timeout: 5000
    }
  },

  build: {
    outDir: 'dist',
    // Enable source maps for production debugging
    sourcemap: true,
    // Use Terser for minification
    minify: 'terser',
    // Target modern browsers
    target: 'es2020',
    // Warning limit for chunk sizes
    chunkSizeWarningLimit: 2000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Inline assets smaller than 4kb
    assetsInlineLimit: 4096,
    // Rollup-specific options
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          components: [/\/@components\//],
          utils: [/\/@utils\//],
          redux: [/\/@redux\//],
          services: [/\/@services\//]
        }
      }
    },
    // Terser optimization options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    }
  },

  resolve: {
    // Comprehensive path aliases for improved module imports
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@services': '/src/services',
      '@redux': '/src/redux',
      '@assets': '/src/assets',
      '@styles': '/src/styles',
      '@types': '/src/types',
      '@constants': '/src/constants',
      '@config': '/src/config',
      '@layouts': '/src/layouts',
      '@validators': '/src/validators',
      '@api': '/src/api',
      '@contexts': '/src/contexts',
      '@middleware': '/src/middleware',
      '@store': '/src/store'
    }
  },

  // Environment-specific configurations
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __DEV__: process.env.NODE_ENV === 'development'
  },

  // Optimization settings
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vitejs/plugin-react']
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    https: false
  },

  // Enable Gzip compression for production builds
  experimental: {
    renderBuiltUrl: (filename: string) => ({
      relative: true,
      runtime: filename
    })
  }
});