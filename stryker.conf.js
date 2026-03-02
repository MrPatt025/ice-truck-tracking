module.exports = function strykerConfig(config) {
  config.set({
    mutate: [
      'backend/src/**/*.js',
      'backend/src/**/*.ts',
      'dashboard/src/**/*.ts',
      'dashboard/src/**/*.tsx',
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
