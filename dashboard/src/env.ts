import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Server-side environment variables (never exposed to client)
   */
  server: {
    BACKEND_API_BASE_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  /**
   * Client-side environment variables (exposed to browser via NEXT_PUBLIC_ prefix)
   */
  client: {
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
    NEXT_PUBLIC_WS_URL: z.string().url().optional(),
    NEXT_PUBLIC_ENABLE_TELEMETRY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),
  },

  /**
   * Runtime environment mapping
   * MUST manually specify process.env values for validation
   */
  runtimeEnv: {
    // Server
    BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    // Client
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_ENABLE_TELEMETRY: process.env.NEXT_PUBLIC_ENABLE_TELEMETRY,
  },

  /**
   * Skip validation in build step (validation happens at runtime)
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Empty string = not set (makes .env.example clearer)
   */
  emptyStringAsUndefined: true,
});
