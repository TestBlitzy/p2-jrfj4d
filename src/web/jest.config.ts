import type { Config } from '@types/jest';

const config: Config = {
  // Use ts-jest as the default preset for TypeScript support
  preset: 'ts-jest',

  // Set jsdom as test environment to simulate browser APIs
  testEnvironment: 'jsdom',

  // Define root directories for test discovery
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Supported file extensions for module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Configure module path aliases for clean imports
  moduleNameMapper: {
    // Core application paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@redux/(.*)$': '<rootDir>/src/redux/$1',
    
    // Asset and styling paths
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@layouts/(.*)$': '<rootDir>/src/layouts/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',

    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],

  // Test file patterns to match
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.mock.{ts,tsx}',
    '!src/**/index.{ts,tsx}'
  ],

  // Coverage thresholds to enforce
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Transform configurations for different file types
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Patterns to ignore during transformation
  transformIgnorePatterns: [
    '/node_modules/(?![@autofiy/autofiyable|@autofiy/property]).+\\.js$'
  ],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Limit parallel test execution to 50% of available cores
  maxWorkers: '50%'
};

export default config;