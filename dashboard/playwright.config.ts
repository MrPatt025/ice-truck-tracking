import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  webServer: {
    // Use the built standalone server for faster startup
    command: `cross-env PORT=${port} NEXT_PUBLIC_E2E=1 node .next/standalone/dashboard/server.js`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: __dirname,
  },
  use: { baseURL },
});
