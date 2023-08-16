const config = {
  verbose: true,
  roots: ['isomorphic', 'server', '__tests__'],
  preset: './config/jest/preset.js',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: './config/tsconfig.test.json',
      },
    ],
  },
  testPathIgnorePatterns: ['<rootDir>/__tests__/support/'],
}

module.exports = config
