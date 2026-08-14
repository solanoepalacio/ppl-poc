/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
    // LangWatch reaches an ESM-only transitive dependency (`xksuid`), which
    // Jest's CommonJS runtime cannot load as published. Node itself resolves it
    // fine, so this is a test-environment gap rather than a packaging problem:
    // transpile that one package on the way in instead of stubbing the tracer,
    // which would leave the tracing code path untested everywhere.
    // `.js` as well as `.mjs`: the package is `"type": "module"`, so its plain
    // `.js` files are ESM too. Scoped to xksuid by path rather than by extension
    // alone, so it cannot start picking up the already-compiled JavaScript that
    // `@pannico/shared` publishes.
    'xksuid/.+\\.m?js$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'CommonJS', target: 'ES2021' } },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!xksuid/)'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
