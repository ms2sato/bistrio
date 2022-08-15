const config = {
  verbose: true,
  preset: './config/jest/preset.js',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: './config/tsconfig.test.json',
    },
  },
  testPathIgnorePatterns: ["<rootDir>/__tests__/support/"],
}

module.exports = config
