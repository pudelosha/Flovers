module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'App.tsx',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/buildInfo.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'json-summary', 'json', 'cobertura', 'html'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-native-async-storage|@react-navigation|react-native-.*)/)',
  ],
};
