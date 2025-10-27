import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  webServer: {
    // Use production build (standalone) for stability in CI/Windows
    command: `pnpm build && cross-env PORT=${port} node .next/standalone/dashboard/server.js`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: __dirname,
  },
  use: { baseURL },
});
