import type { Config } from '@jest/types';

// Jest configuration for Sales & Intelligence Platform backend
const jestConfig: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Node environment for backend testing
  testEnvironment: 'node',
  
  // Source and test directories
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Path aliases for clean imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: true,
      isolatedModules: true
    }]
  },
  
  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  
  // Code coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/**',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/api/server.ts',
    '!src/ai/generated/**',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/ai/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/ai-setup.ts',
    '<rootDir>/tests/mocks/tensorflow.ts'
  ],
  
  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.git/',
    '/src/ai/generated/',
    '/src/migrations/',
    '/src/seeds/'
  ],
  
  // TypeScript compiler options for tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true,
      isolatedModules: true
    }
  },
  
  // Test execution configuration
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Test reporters configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/junit',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › '
    }]
  ]
};

export default jestConfig;