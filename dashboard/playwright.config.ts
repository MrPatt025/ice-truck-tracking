import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: __dirname,
  },
  use: { baseURL },
});
