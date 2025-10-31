// backend/src/env.ts
// Load environment variables and validate using envalid
// In dev/test, dotenv-flow loads .env*.local files automatically

import 'dotenv-flow/config';
import { cleanEnv, bool, num, port, str } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
  }),
  PORT: port({ default: 5000 }),

  // CORS
  CORS_ORIGINS: str({ default: 'http://localhost:3000' }),
  CORS_ORIGIN: str({ default: '' }),

  // Security
  JWT_SECRET: str({ default: 'change-me' }),
  REQUIRE_AUTH: bool({ default: false }),

  // Rate limit
  RATE_LIMIT_MAX: num({ default: 120 }),
  RATE_LIMIT_WINDOW: str({ default: '1 minute' }),

  // WebSocket
  ENABLE_WS: bool({ default: false }),

  // Demo/test helpers
  DEMO_REGISTER: bool({ default: true }),
  DEMO_CREDS: str({ default: '' }),
  ADMIN_USER: str({ default: 'admin' }),
  ADMIN_PASS: str({ default: 'admin' }),

  // Observability / headers
  REQUEST_ID_HEADER: str({ default: 'x-request-id' }),

  // Database (optional during early dev; Prisma will validate separately)
  DATABASE_URL: str({ default: '' }),
});

// Optionally: propagate normalized values back to process.env for code relying on process.env
process.env.NODE_ENV = env.NODE_ENV;
process.env.PORT = String(env.PORT);
process.env.CORS_ORIGINS = env.CORS_ORIGINS;
process.env.CORS_ORIGIN = env.CORS_ORIGIN;
process.env.JWT_SECRET = env.JWT_SECRET;
process.env.REQUIRE_AUTH = String(env.REQUIRE_AUTH);
process.env.RATE_LIMIT_MAX = String(env.RATE_LIMIT_MAX);
process.env.RATE_LIMIT_WINDOW = env.RATE_LIMIT_WINDOW;
process.env.ENABLE_WS = String(env.ENABLE_WS);
process.env.DEMO_REGISTER = String(env.DEMO_REGISTER);
process.env.DEMO_CREDS = env.DEMO_CREDS;
process.env.ADMIN_USER = env.ADMIN_USER;
process.env.ADMIN_PASS = env.ADMIN_PASS;
process.env.REQUEST_ID_HEADER = env.REQUEST_ID_HEADER;
process.env.DATABASE_URL = env.DATABASE_URL;
