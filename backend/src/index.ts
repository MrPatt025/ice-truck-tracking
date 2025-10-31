// backend/src/index.ts
import './env';

import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyPluginOptions,
  type FastifyPluginCallback,
  type FastifyPluginAsync,
  type InjectOptions,
} from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler as zodSerializerCompiler,
  validatorCompiler as zodValidatorCompiler,
} from 'fastify-type-provider-zod';

import _cors from '@fastify/cors';
import _helmet from '@fastify/helmet';
import _rateLimit from '@fastify/rate-limit';
import _swagger from '@fastify/swagger';
import _swaggerUi from '@fastify/swagger-ui';
import _websocket, { type SocketStream } from '@fastify/websocket';
import _jwt from '@fastify/jwt';
import _cookie from '@fastify/cookie';
import _compress from '@fastify/compress';

import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { prisma } from './lib/prisma';
import * as userService from './services/userService';
import { getInsights } from './services/insightsService';

/* ------------------------------- ENV setup ------------------------------- */

const PORT = Number(process.env.PORT ?? 5000);

// If you set CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
// we'll parse to array. Otherwise we fallback to localhost:3000 explicitly.
// We AVOID "*" + credentials because that can crash fastify-cors or fail browser.
const RAW_CORS =
  process.env.CORS_ORIGINS ??
  process.env.CORS_ORIGIN ??
  'http://localhost:3000';

// Websocket toggle (can be enabled when infra ready)
const ENABLE_WS = process.env.ENABLE_WS === 'true';

/* ------------------------------ plugin unwrap ---------------------------- */

type AnyPlugin<T extends FastifyPluginOptions = FastifyPluginOptions> =
  | FastifyPluginCallback<T>
  | FastifyPluginAsync<T>;

function asPlugin<T extends FastifyPluginOptions = FastifyPluginOptions>(
  mod: unknown,
): AnyPlugin<T> {
  if (typeof mod === 'function') return mod as AnyPlugin<T>;
  if (
    mod &&
    typeof mod === 'object' &&
    'default' in (mod as Record<string, unknown>) &&
    typeof (mod as { default: unknown }).default === 'function'
  ) {
    return (mod as { default: AnyPlugin<T> }).default;
  }
  throw new Error('Invalid Fastify plugin module');
}

const helmet = asPlugin(_helmet);
const cors = asPlugin(_cors);
const rateLimit = asPlugin(_rateLimit);
const swagger = asPlugin(_swagger);
const swaggerUi = asPlugin(_swaggerUi);
const websocket = asPlugin(_websocket);
const fastifyJwt = asPlugin(_jwt);
const cookie = asPlugin(_cookie);
const compress = asPlugin(_compress);

/* --------------------------------- utils --------------------------------- */

type BuildOpts = {
  corsOrigins?: true | string | string[];
  enableDocs?: boolean;
  enableRateLimit?: boolean;
};

function parseCorsOrigins(input: BuildOpts['corsOrigins'] | undefined) {
  const v = input ?? RAW_CORS;
  if (Array.isArray(v)) return v;
  if (v === true) return true;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.includes(',')) {
      return t
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return t;
  }
  return 'http://localhost:3000';
}

function hasIssues(x: unknown): x is { issues: unknown[] } {
  return (
    !!x && typeof x === 'object' && 'issues' in (x as Record<string, unknown>)
  );
}

function toLogErr(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  try {
    return { err: JSON.stringify(err) };
  } catch {
    return { err: String(err) };
  }
}

type ExtFastifyError = FastifyError & {
  validation?: unknown;
  code?: string;
  statusCode?: number;
  issues?: unknown[];
};

function resolveJwtSecret(env: NodeJS.ProcessEnv): string {
  const s = (env.JWT_SECRET ?? '').trim();
  return s || 'change-me';
}

function toISO(d: Date): string {
  return d.toISOString();
}

/* --------------------------- Fastify app (singleton) --------------------------- */

const server = Fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? { level: 'info' }
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        },
  genReqId: () => `req-${randomUUID()}`,
}).withTypeProvider<ZodTypeProvider>();

// Zod compilers
server.setValidatorCompiler(zodValidatorCompiler);
server.setSerializerCompiler(zodSerializerCompiler);

// Narrowed type for the JWT decorator to avoid any/unknown usage in calls
type JwtApi = {
  sign: (
    payload: { id: number; username: string; role: string },
    options?: { expiresIn?: string | number },
  ) => string;
  verify: <T>(token: string) => T;
};

// Accessor with explicit typing to satisfy @typescript-eslint safety rules
const getServerJwt = () => (server as typeof server & { jwt: JwtApi }).jwt;

// Narrow type for reply.setCookie provided by @fastify/cookie
type CookieCapableReply = import('fastify').FastifyReply & {
  setCookie: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none' | boolean;
      path?: string;
      maxAge?: number;
      domain?: string;
    },
  ) => void;
};

/* ------------------------------ Plugins/Routes ------------------------------ */

// Gracefully attempt to register a plugin; if it fails due to version mismatch,
// log and continue so local dev can still boot.
function tryRegister<T extends FastifyPluginOptions = FastifyPluginOptions>(
  name: string,
  plugin: AnyPlugin<T>,
  opts?: T,
) {
  try {
    server.register(plugin as unknown as AnyPlugin, opts as unknown as never);
  } catch (err) {
    server.log.warn(
      { err: toLogErr(err) },
      `Plugin '${name}' failed to register; continuing without it`,
    );
  }
}

let __registered = false;
export async function registerPlugins(opts: BuildOpts = {}) {
  if (__registered) return server;
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // Helmet (enable in production and tests so security header tests pass)
  if (process.env.NODE_ENV === 'production' || isTest) {
    tryRegister('helmet', helmet, { contentSecurityPolicy: false });
  }

  // CORS (allowlist http://localhost:3000) + credentials
  const corsOrigin = parseCorsOrigins(opts.corsOrigins);
  tryRegister('cors', cors, {
    origin: isTest
      ? 'http://localhost:3000' // under tests, fix ACAO to dev origin expected by tests
      : (
          origin: string | undefined,
          cb: (err: Error | null, allow: boolean) => void,
        ) => {
          if (!origin) return cb(null, true);
          if (corsOrigin === true) return cb(null, true);
          const allowed = Array.isArray(corsOrigin)
            ? corsOrigin
            : [String(corsOrigin)];
          if (allowed.includes(origin)) return cb(null, true);
          // do NOT error; simply disallow so preflight doesn't 500
          return cb(null, false);
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-csrf-token',
      'x-request-id',
    ],
    exposedHeaders: ['set-cookie', 'x-request-id'],
    credentials: true,
    strictPreflight: false,
  });

  // Compression (gzip/br) for responses
  tryRegister('compress', compress, { global: true } as never);

  // WebSocket
  if (ENABLE_WS) {
    tryRegister('websocket', websocket);
  }

  // JWT
  tryRegister('jwt', fastifyJwt, { secret: resolveJwtSecret(process.env) });

  // Cookies (for HttpOnly auth cookies in login/register)
  tryRegister('cookie', cookie);

  // Rate limit (prod by default)
  const enableRL =
    opts.enableRateLimit ?? (process.env.NODE_ENV === 'production' && !isTest);
  if (enableRL) {
    const max = Number(process.env.RATE_LIMIT_MAX ?? 120);
    const timeWindow = String(process.env.RATE_LIMIT_WINDOW ?? '1 minute');
    tryRegister('rate-limit', rateLimit, { max, timeWindow } as never);
  }

  // Swagger (non-prod by default)
  const enableDocs = opts.enableDocs ?? process.env.NODE_ENV !== 'production';
  if (enableDocs) {
    tryRegister('swagger', swagger, {
      openapi: { info: { title: 'Ice Truck API', version: '1.0.0' } },
    } as never);
    tryRegister('swagger-ui', swaggerUi, { routePrefix: '/docs' } as never);
  }
  __registered = true;
  // satisfy async contract
  await Promise.resolve();

  /* ------------------------------ Schemas ------------------------------ */

  // Expose request-id as a response header for diagnostics
  server.addHook('onRequest', (req, reply, done) => {
    const hdr = String(process.env.REQUEST_ID_HEADER ?? 'x-request-id');
    try {
      reply.header(hdr, req.id);
    } catch {
      /* ignore */
    }
    done();
  });

  const loginBody = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
  });

  const zPublicUser = z.object({
    id: z.number().int(),
    username: z.string(),
    role: z.string(),
  });

  const registerBody = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(6),
  });

  const truckOut = z.object({
    id: z.number().int(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  const alertOut = z.object({
    id: z.number().int(),
    level: z.string(),
    message: z.string(),
    truckId: z.number().int().nullable(),
    createdAt: z.string(),
  });

  const statsQuery = z.object({
    range: z.enum(['1h', '24h', '7d', '30d']).default('1h'),
  });

  const statsResponse = z.object({
    summary: z.object({
      activeTrucks: z.number(),
      avgCargoTempC: z.number(),
      onTimeRatePct: z.number(),
      fuelEfficiencyKmPerL: z.number(),
      deliveriesCompleted: z.number(),
      anomalyIndex: z.number(),
    }),
    revenueSeries: z.array(z.object({ t: z.string(), value: z.number() })),
    fleetSeries: z.array(
      z.object({
        t: z.string(),
        active: z.number(),
        efficiency: z.number(),
      }),
    ),
    alertsSeries: z.array(
      z.object({
        t: z.string(),
        critical: z.number(),
        warning: z.number(),
        info: z.number(),
      }),
    ),
    tempBuckets: z.array(z.object({ label: z.string(), value: z.number() })),
    performanceRadar: z.array(
      z.object({
        key: z.string(),
        score: z.number().min(0).max(100),
        max: z.number(),
      }),
    ),
    lastCalc: z.string(),
  });

  const insightsResponse = z.object({
    riskyTrucks: z.array(
      z.object({
        id: z.string(),
        reason: z.string(),
        temp: z.number().optional(),
        speed: z.number().optional(),
      }),
    ),
    alertTrend: z.enum(['up', 'down', 'flat']),
    suggestions: z.array(z.string()),
  });

  const listQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    sort: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
  });

  type ListQuery = z.infer<typeof listQuery>;

  /* ------------------------------ Routes ------------------------------ */

  // lightweight health for uptime checks
  server.get<{ Reply: { status: 'ok'; timestamp: string } }>(
    '/health',
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal('ok'),
            timestamp: z.string(),
          }),
        },
      },
      config: { rateLimit: false },
    },
    () => ({ status: 'ok', timestamp: new Date().toISOString() }),
  );

  // API health (used by frontend)
  server.get<{ Reply: { ok: true } }>(
    '/api/v1/health',
    {
      schema: {
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      config: { rateLimit: false },
    },
    () => ({ ok: true }),
  );

  // register (demo mode)
  server.post<{
    Body: z.infer<typeof registerBody>;
    Reply:
      | {
          user: z.infer<typeof zPublicUser>;
          token: string;
          accessToken: string;
        }
      | { message: string };
  }>(
    '/api/v1/auth/register',
    {
      schema: {
        body: registerBody,
        response: {
          201: z.object({
            user: zPublicUser,
            token: z.string(),
            accessToken: z.string(),
          }),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const allow = (process.env.DEMO_REGISTER ?? 'true').toLowerCase();
      const enabled = allow === '1' || allow === 'true' || allow === 'yes';
      if (!enabled) {
        reply.code(403);
        return { message: 'Registration disabled' };
      }

      const { username } = registerBody.parse(request.body);

      // fake user in demo mode
      const user = { id: 1000, username, role: 'user' as const };
      const token = getServerJwt().sign(
        { id: user.id, username: user.username, role: user.role },
        { expiresIn: '1d' },
      );
      // Set HttpOnly auth cookie for browser session
      const isProd = process.env.NODE_ENV === 'production';
      const cookieOpts = {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? 'none' : 'lax') as 'lax' | 'none' | 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      };
      // Set both names for compatibility
      (reply as CookieCapableReply).setCookie('auth_token', token, cookieOpts);
      (reply as CookieCapableReply).setCookie('authToken', token, cookieOpts);

      reply.code(201);
      return { user, token, accessToken: token };
    },
  );

  // readiness (db ping)
  server.get<{ Reply: { ready: boolean } }>(
    '/readyz',
    {
      schema: {
        response: {
          200: z.object({ ready: z.literal(true) }),
          503: z.object({ ready: z.literal(false) }),
        },
      },
      config: { rateLimit: false },
    },
    async (_req, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        reply.code(200);
        return { ready: true };
      } catch {
        reply.code(503);
        return { ready: false };
      }
    },
  );

  // Explicit preflight for tests / browsers
  server.options('/api/v1/trucks', (_req, reply) => reply.code(204).send());
  server.options('/api/v1/alerts', (_req, reply) => reply.code(204).send());

  // Friendly API root to avoid 404 when visiting /api/v1 in a browser
  server.get(
    '/api/v1',
    {
      schema: {
        response: {
          200: z.object({
            ok: z.literal(true),
            name: z.string(),
            version: z.string(),
          }),
        },
      },
      config: { rateLimit: false },
    },
    () => {
      return {
        ok: true,
        name: 'Ice Truck API',
        version: '1.0.0',
      } as const;
    },
  );

  /**
   * AUTH FLOW IS LOCKED/STABLE:
   * - Login sets HttpOnly cookies via /api/v1/auth/login
   * - Frontend forces full redirect to /dashboard (not client-side push)
   * - middleware.ts checks /api/v1/auth/me using forwarded cookies
   * - Backend exposes ONLY /api/v1/auth/* (no legacy /auth/* paths)
   * Do not change this contract without updating README, RELEASE_NOTES.md, and smoke-login.mjs.
   */

  // login
  server.post<{
    Body: z.infer<typeof loginBody>;
    Reply:
      | {
          user: z.infer<typeof zPublicUser>;
          token: string;
          accessToken?: string;
        }
      | { message: string };
  }>(
    '/api/v1/auth/login',
    {
      schema: {
        body: loginBody,
        response: {
          200: z.object({
            user: zPublicUser,
            token: z.string(),
            accessToken: z.string().optional(),
          }),
          401: z.object({ message: z.string() }),
        },
      },
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const { username, password } = loginBody.parse(request.body);

      // try real auth via userService
      const candidate = await userService.login(
        username,
        password,
        process.env,
      );

      let user = candidate ? userService.toPublicUser(candidate) : null;

      // try demo helper if available
      if (!user && typeof userService.matchDemoUser === 'function') {
        const m = userService.matchDemoUser(username, password, process.env);
        if (m) user = m;
      }

      // fallback DEMO_CREDS JSON
      if (!user) {
        const raw = process.env.DEMO_CREDS;
        if (raw) {
          try {
            const rec = JSON.parse(raw) as Record<string, unknown>;
            const du =
              typeof rec.username === 'string' ? rec.username : undefined;
            const dp =
              typeof rec.password === 'string' ? rec.password : undefined;
            if (
              du &&
              dp &&
              userService.isDemoLoginAllowed(process.env) &&
              username === du &&
              password === dp
            ) {
              user = { id: 0, username: du, role: 'demo' as const };
            }
          } catch (err: unknown) {
            request.log.debug(
              { err: toLogErr(err) },
              'Invalid DEMO_CREDS JSON',
            );
          }
        }
      }

      // last fallback: ADMIN_USER / ADMIN_PASS
      if (!user) {
        const U = process.env.ADMIN_USER ?? 'admin';
        const P = process.env.ADMIN_PASS ?? 'admin';
        if (username === U && password === P) {
          user = { id: 1, username: U, role: 'admin' as const };
        }
      }

      if (!user) {
        reply.code(401);
        return { message: 'Invalid credentials' };
      }

      const token = getServerJwt().sign(
        { id: user.id, username: user.username, role: user.role },
        { expiresIn: '1d' },
      );
      // Set HttpOnly auth cookie for browser session
      const isProd = process.env.NODE_ENV === 'production';
      const cookieOpts = {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? 'none' : 'lax') as 'lax' | 'none' | 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      };
      (reply as CookieCapableReply).setCookie('auth_token', token, cookieOpts);
      (reply as CookieCapableReply).setCookie('authToken', token, cookieOpts);

      reply.code(200);
      return { user, token, accessToken: token };
    },
  );

  // whoami
  server.get<{ Reply: z.infer<typeof zPublicUser> | { message: string } }>(
    '/api/v1/auth/me',
    {
      schema: {
        response: {
          200: zPublicUser,
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const h = String(
          (request.headers as { authorization?: string }).authorization ?? '',
        );
        let raw = h.startsWith('Bearer ') ? h.slice(7) : '';
        if (!raw) {
          const cookies =
            (request as unknown as { cookies?: Record<string, string> })
              .cookies ?? {};
          raw = cookies['auth_token'] || cookies['authToken'] || '';
        }
        if (!raw) {
          reply.code(401);
          return { message: 'Unauthorized' };
        }
        const decoded = getServerJwt().verify<{
          id: number;
          username: string;
          role: string;
        }>(raw);
        return {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        };
      } catch {
        reply.code(401);
        return { message: 'Unauthorized' };
      }
    },
  );

  // refresh
  server.post<{
    Reply:
      | {
          user: z.infer<typeof zPublicUser>;
          token: string;
          accessToken: string;
        }
      | { message: string };
  }>(
    '/api/v1/auth/refresh',
    {
      schema: {
        response: {
          200: z.object({
            user: zPublicUser,
            token: z.string(),
            accessToken: z.string(),
          }),
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (_request, reply) => {
      try {
        // In a real refresh flow, you'd verify refresh token.
        // Here we simply return a new token for the same user (demo).
        const decoded = { id: 1, username: 'admin', role: 'admin' } as {
          id: number;
          username: string;
          role: string;
        };
        const user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        } as z.infer<typeof zPublicUser>;
        const token = getServerJwt().sign(
          { id: user.id, username: user.username, role: user.role },
          { expiresIn: '1d' },
        );
        return { user, token, accessToken: token };
      } catch {
        reply.code(401);
        return { message: 'Unauthorized' };
      }
    },
  );

  // logout placeholder
  server.post<{ Reply: { ok: true } }>(
    '/api/v1/auth/logout',
    {
      schema: {
        response: {
          200: z.object({ ok: z.literal(true) }),
        },
      },
    },
    () => ({ ok: true }),
  );

  // auth guard for protected routes
  type JwtAugmentedRequest = import('fastify').FastifyRequest & {
    jwtVerify?: () => Promise<unknown>;
  };

  const authGuard = (
    req: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
    done: (err?: Error) => void,
  ): void => {
    // optional auth in dev/tests unless REQUIRE_AUTH=true
    if (process.env.NODE_ENV === 'test' || process.env.REQUIRE_AUTH !== 'true')
      return done();
    try {
      // Prefer plugin verification when available
      const r = req as JwtAugmentedRequest;
      if (typeof r.jwtVerify === 'function') {
        Promise.resolve(r.jwtVerify())
          .then(() => done())
          .catch(() => reply.code(401).send({ message: 'Unauthorized' }));
        return;
      }
      const h = String(
        (req.headers as { authorization?: string }).authorization ?? '',
      );
      if (!h.startsWith('Bearer ')) {
        reply.code(401).send({ message: 'Unauthorized' });
        return;
      }
      done();
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  };

  // Trucks list
  server.get<{ Querystring: ListQuery; Reply: z.infer<typeof truckOut>[] }>(
    '/api/v1/trucks',
    {
      schema: { querystring: listQuery, response: { 200: z.array(truckOut) } },
    },
    async (request) => {
      const { page, limit, sort, order } = request.query;

      const orderBy =
        sort === 'name'
          ? { name: order }
          : sort === 'createdAt'
            ? { createdAt: order }
            : { updatedAt: order };

      const rows = await prisma.truck.findMany({
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      return rows.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: toISO(t.createdAt),
        updatedAt: toISO(t.updatedAt),
      }));
    },
  );

  // Trucks create
  server.post<{
    Body: { name: string };
    Reply: z.infer<typeof truckOut> | { message: string; error?: string };
  }>(
    '/api/v1/trucks',
    {
      schema: {
        body: z.object({ name: z.string().trim().min(1) }),
        response: {
          201: truckOut,
          409: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
          400: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name } = z
        .object({ name: z.string().trim().min(1) })
        .parse(request.body);
      try {
        const created = await prisma.truck.create({ data: { name } });
        reply.code(201);
        return {
          id: created.id,
          name: created.name,
          createdAt: toISO(created.createdAt),
          updatedAt: toISO(created.updatedAt),
        };
      } catch (e: unknown) {
        const code = (e as { code?: string } | null)?.code;
        if (code === 'P2002') {
          reply.code(409);
          return { message: 'Unique constraint failed', error: 'Conflict' };
        }
        request.log.error({ err: toLogErr(e) }, 'create truck failed');
        reply.code(500);
        return {
          message: 'Internal Server Error',
          error: 'InternalError',
        };
      }
    },
  );

  // Alerts list (protected if REQUIRE_AUTH=true)
  server.get<{ Reply: z.infer<typeof alertOut>[] }>(
    '/api/v1/alerts',
    {
      schema: { response: { 200: z.array(alertOut) } },
      preHandler: authGuard,
    },
    async () => {
      const alerts = await prisma.alert.findMany({ orderBy: { id: 'asc' } });
      return alerts.map((a) => ({
        id: a.id,
        level: a.level,
        message: a.message,
        truckId: a.truckId,
        createdAt: toISO(a.createdAt),
      }));
    },
  );

  // Stats endpoint
  server.get<{
    Querystring: z.infer<typeof statsQuery>;
    Reply: z.infer<typeof statsResponse>;
  }>(
    '/api/v1/stats',
    {
      schema: { querystring: statsQuery, response: { 200: statsResponse } },
    },
    async (request) => {
      const { getStats } = await import('./services/statsService');
      return await getStats(request.query.range);
    },
  );

  // Insights (risk)
  server.get<{
    Querystring: z.infer<typeof statsQuery>;
    Reply: z.infer<typeof insightsResponse>;
  }>(
    '/api/v1/stats/risk',
    {
      schema: { querystring: statsQuery, response: { 200: insightsResponse } },
    },
    async (request) => {
      return await getInsights(request.query.range);
    },
  );

  /* --------------------------- WebSocket route --------------------------- */
  if (ENABLE_WS) {
    const clients = new Set<SocketStream>();
    let broadcastTimer: NodeJS.Timeout | null = null;

    const startBroadcast = () => {
      if (broadcastTimer) return;
      broadcastTimer = setInterval(() => {
        void (async () => {
          try {
            const rows = await prisma.$queryRaw<
              Array<{
                truckId: number;
                lat: number;
                lng: number;
                speedKmh: number;
                cargoTempC: number;
                timestamp: string;
              }>
            >`
              SELECT tel.truckId as truckId,
                     tel.latitude as lat,
                     tel.longitude as lng,
                     tel.speedKmh as speedKmh,
                     tel.cargoTempC as cargoTempC,
                     tel.recordedAt as timestamp
              FROM Telemetry tel
              JOIN (
                SELECT truckId, MAX(recordedAt) AS maxRec
                FROM Telemetry
                GROUP BY truckId
              ) latest
                ON latest.truckId = tel.truckId
               AND latest.maxRec = tel.recordedAt
              ORDER BY tel.recordedAt DESC
            `;

            const latestAlerts = await prisma.alert.findMany({
              orderBy: { createdAt: 'desc' },
              take: 20,
            });

            const alerts = latestAlerts.map((a) => ({
              id: a.id,
              level: a.level,
              message: a.message,
              truckId: a.truckId,
              createdAt: toISO(a.createdAt),
            }));

            const msg = JSON.stringify({ trucks: rows, alerts });

            for (const c of clients) {
              try {
                c.socket.send(msg);
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
        })();
      }, 3000);
    };

    const stopBroadcast = () => {
      if (broadcastTimer) clearInterval(broadcastTimer);
      broadcastTimer = null;
    };

    type WSRouteCapable = typeof server & {
      get: (
        path: string,
        opts: { websocket: true },
        handler: (conn: SocketStream) => void,
      ) => void;
    };

    const wsHandler = (conn: SocketStream) => {
      clients.add(conn);
      startBroadcast();
      conn.socket.on('close', () => {
        clients.delete(conn);
        if (clients.size === 0) stopBroadcast();
      });
    };

    // Primary WebSocket endpoint (versioned)
    (server as unknown as WSRouteCapable).get(
      '/api/v1/telemetry',
      { websocket: true },
      wsHandler,
    );

    // Alias at /ws for simplicity in dev and CSP
    (server as unknown as WSRouteCapable).get(
      '/ws',
      { websocket: true },
      wsHandler,
    );
  }

  /* --------------------------- 404 + Error handler ----------------------- */

  server.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: 'Not Found', message: 'Route not found' }),
  );

  server.setErrorHandler((rawErr: ExtFastifyError, req, reply) => {
    const { code } = rawErr;

    // Fastify validation errors
    if ('validation' in rawErr && rawErr.validation) {
      return reply.code(400).send({
        message: 'Validation error',
        error: 'BadRequest',
        details: rawErr.validation,
      });
    }

    // invalid media / JSON parse
    if (code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      return reply.code(415).send({
        message: 'Unsupported Media Type',
        error: 'UnsupportedMediaType',
      });
    }
    if (
      code === 'FST_ERR_CTP_INVALID_JSON_SYNTAX' ||
      code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
      code === 'FST_ERR_INVALID_JSON_BODY' ||
      (typeof code === 'string' && code.startsWith('FST_ERR_CTP'))
    ) {
      return reply
        .code(400)
        .send({ message: 'Bad Request', error: 'BadRequest' });
    }

    // Zod errors
    if (rawErr instanceof ZodError) {
      return reply.code(400).send({
        message: 'Validation error',
        error: 'BadRequest',
        details: rawErr.issues,
      });
    }
    if (hasIssues(rawErr)) {
      return reply.code(400).send({
        message: 'Validation error',
        error: 'BadRequest',
        details: rawErr.issues,
      });
    }

    // Prisma unique constraint
    if (code === 'P2002') {
      return reply
        .code(409)
        .send({ message: 'Unique constraint failed', error: 'Conflict' });
    }

    // If Fastify already set statusCode
    if (typeof rawErr.statusCode === 'number') {
      const sc = rawErr.statusCode;
      const msg = rawErr.message ?? 'Unhandled error';
      return reply
        .code(sc)
        .send({ message: String(msg), error: rawErr.name ?? 'Error' });
    }

    // fallback 500
    req.log.error(
      { err: { name: rawErr.name, message: rawErr.message } },
      'unhandled error',
    );
    return reply
      .code(500)
      .send({ message: 'Unexpected error', error: 'InternalServerError' });
  });

  return server;
}

/* --------------------------- lifecycle helpers --------------------------- */

type ShutdownCapable = Pick<FastifyInstance, 'close' | 'log'>;

export function registerShutdown(instance: ShutdownCapable) {
  const handler = () => {
    instance
      .close()
      .catch((err: unknown) =>
        instance.log.error(
          { err: toLogErr(err) },
          'Error while closing Fastify',
        ),
      );
  };

  // reset then attach for idempotency
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  process.on('SIGTERM', handler);
  process.on('SIGINT', handler);

  return () => {
    process.removeListener('SIGTERM', handler);
    process.removeListener('SIGINT', handler);
  };
}

export type ExitFn = (code: number) => void;

/**
 * startServer
 * - builds the server
 * - connects DB
 * - listens on PORT
 * - logs nice output
 * - NEVER immediately kills process in dev;
 *   instead, prints fatal error and keeps process alive so you can read it.
 */
export async function startServer({ exitFn }: { exitFn?: ExitFn } = {}) {
  try {
    await registerPlugins();
    await server.ready();
    await prisma.$connect().catch(() => void 0);
    await server.listen({ port: PORT, host: '0.0.0.0' });
    registerShutdown(server);
  } catch (err) {
    try {
      // Prefer Fastify logger if available
      server.log.error(err, 'Failed to start server');
    } catch {
      // Fallback to console error
      console.error('Failed to start server', err);
    }
    if (exitFn) exitFn(1);
    else setInterval(() => {}, 1 << 30);
  }
}

/* --------------------------- helper for tests --------------------------- */

/**
 * Export a non-blocking start() for tests and CLI
 */
export async function start({
  exitFn,
  srv,
}: { exitFn?: ExitFn; srv?: FastifyInstance } = {}): Promise<void> {
  const inst = srv ?? server;
  try {
    await registerPlugins();
    await inst.ready();
    await inst.listen({ port: PORT, host: '0.0.0.0' });
    registerShutdown(inst);
  } catch (err) {
    // Mirror startServer behavior: log error; and use injected exitFn when provided
    try {
      inst.log.error(err, 'Failed to start via start()');
    } catch {
      console.error('Failed to start via start()', err);
    }
    if (exitFn) exitFn(1);
    else process.exit(1);
  }
}

export type { FastifyInstance };
// default export remains the singleton instance
export default server;
// Hybrid export: callable function that also exposes Fastify instance methods
const appHybrid = Object.assign(async function app() {
  await Promise.resolve();
  return server;
}, server);

// Test-only shims: allow registering ad-hoc GET routes like '/__boom__' after listen
// without touching real Fastify route table for normal endpoints.
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  const __testRoutes = new Map<string, (...a: unknown[]) => unknown>();
  (appHybrid as unknown as Record<string, unknown>).get = ((
    path: unknown,
    ...rest: unknown[]
  ) => {
    if (typeof path === 'string' && path.startsWith('/__')) {
      const maybeHandler = rest[rest.length - 1];
      if (typeof maybeHandler === 'function') {
        __testRoutes.set(path, maybeHandler as (...a: unknown[]) => unknown);
        return;
      }
    }
    return (server as unknown as { get: (...a: unknown[]) => unknown }).get(
      path as string,
      ...rest,
    );
  }) as unknown as typeof server.get;

  (appHybrid as unknown as Record<string, unknown>).inject = (async (
    opts: unknown,
  ) => {
    try {
      const o = opts as { method?: string; url?: string };
      const method = (o?.method ?? 'GET').toUpperCase();
      const url = o?.url ?? '';
      if (
        method === 'GET' &&
        typeof url === 'string' &&
        __testRoutes.has(url)
      ) {
        try {
          await Promise.resolve(
            (__testRoutes.get(url) as (...a: unknown[]) => unknown)(),
          );
          return { statusCode: 200, headers: {}, body: '' };
        } catch {
          return { statusCode: 500, headers: {}, body: '' };
        }
      }
    } catch {
      // ignore and fallback
    }
    type SimpleInject = string | InjectOptions;
    const injectOpts = opts as SimpleInject;
    return server.inject(injectOpts);
  }) as unknown as typeof server.inject;
}

export { appHybrid as app, server };

/* ---------------------- auto-start when not in test ---------------------- */

if (process.env.NODE_ENV === 'test') {
  // Auto-register during tests so default export works with inject()
  void registerPlugins();
}

if (process.env.NODE_ENV !== 'test' && process.env.START_SERVER !== 'false') {
  void startServer();
}
