module.exports = function (config) {
  config.set({
    mutate: [
      'apps/backend/src/**/*.js',
      'apps/backend/src/**/*.ts',
      'apps/dashboard/src/**/*.ts',
      'apps/dashboard/src/**/*.tsx',
    ],
    testRunner: 'jest',
    reporters: ['html', 'clear-text', 'progress'],
    coverageAnalysis: 'off',
    jest: {
      projectType: 'custom',
      config: require('./jest.config.js'),
    },
    thresholds: { high: 80, low: 60, break: 50 },
  })
}
