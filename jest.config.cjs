module.exports = {
  roots: ['./src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/src/**/?(*.)+(spec|test).+(ts|tsx|js)'],
  extensionsToTreatAsEsm: ['.ts'], // @see https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
}
