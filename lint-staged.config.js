// lint-staged.config.js
module.exports = {
  'backend/**/*.{js,jsx,ts,tsx}': [
    'eslint --fix --cache --cache-location .eslintcache',
  ],
  'dashboard/**/*.{js,jsx,ts,tsx}': files => {
    // Exclude config files since they're ignored by ESLint
    const sourceFiles = files.filter(
      f =>
        !(
          f.endsWith('.config.ts') ||
          f.endsWith('.config.js') ||
          f.endsWith('.config.mjs')
        )
    )
    const commands = []
    if (sourceFiles.length > 0) {
      commands.push(
        `eslint --fix --cache --cache-location .eslintcache ${sourceFiles.join(' ')}`
      )
    }
    return commands
  },
  'mobile-app/**/*.{js,jsx,ts,tsx}': [
    'eslint --fix --cache --cache-location .eslintcache',
  ],
  'sdk/**/*.{js,jsx,ts,tsx}': [
    'eslint --fix --cache --cache-location .eslintcache',
  ],

  '*.{json,md,yml,yaml}': ['prettier --write'],
  '**/*.{css,scss,less}': ['prettier --write'],
}
