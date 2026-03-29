export default {
  projects: [
    {
      displayName: 'server',
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      testEnvironment: 'node',
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              module: 'esnext',
            },
          },
        ],
      },
      testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
      testPathIgnorePatterns: ['/node_modules/', '/src/preview-app/'],
    },
    {
      displayName: 'preview-app',
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      testEnvironment: 'jsdom',
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              module: 'esnext',
              jsx: 'react-jsx',
            },
          },
        ],
      },
      testMatch: ['<rootDir>/src/preview-app/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/src/preview-app/testSetup.ts'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/bin/**',
    '!src/cli/**',
  ],
  coverageThreshold: {
    './src/**/*.ts': {
      lines: 90,
      branches: 80,
    },
  },
};
