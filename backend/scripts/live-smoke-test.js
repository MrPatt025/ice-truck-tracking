'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptPath = path.join(__dirname, 'live-smoke-test.mjs');
const result = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error('live-smoke-test launcher failed:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
