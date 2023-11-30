export default {
  verbose: true,
  roots: ['universal', 'server', '__tests__'],
  preset: './config/jest/preset.js',
  moduleNameMapper: {
    // @see https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './config/tsconfig.test.json',
      },
    ],
  },
  testPathIgnorePatterns: ['<rootDir>/__tests__/support/'],
}
