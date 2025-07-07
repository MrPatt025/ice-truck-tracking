module.exports = {
  '**/*.{js,ts,tsx,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.{css,scss,less}': ['prettier --write', 'git add'],
  'package.json': ['npm pkg fix', 'git add'],
}
