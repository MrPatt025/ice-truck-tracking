// backend/src/index.ts
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
  type FastifyError,
  type FastifyPluginOptions,
  type FastifyPluginCallback,
  type FastifyPluginAsync,
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
import _etag from '@fastify/etag';

import { z, ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';
import * as userService from './services/userService';
import type { PublicUser, Role } from './services/userService';

const PORT = Number(process.env.PORT ?? 5000);
const CORS_ORIGINS = process.env.CORS_ORIGINS ?? '*';

// ---- plugin unwrap + types ---------------------------------------------------
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
const etag = asPlugin(_etag);

// ---- small utils -------------------------------------------------------------
type BuildOpts = {
  logger?: FastifyServerOptions['logger'];
  corsOrigins?: true | string | string[];
  enableDocs?: boolean;
  enableRateLimit?: boolean;
  forTest?: boolean;
};

function parseCorsOrigins(input: BuildOpts['corsOrigins'] | undefined) {
  const v = input ?? CORS_ORIGINS;
  if (Array.isArray(v)) return v;
  if (v === true) return true;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '*') return '*';
    if (t.includes(',')) {
      return t
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return t;
  }
  return '*';
}

function hasIssues(x: unknown): x is { issues: unknown[] } {
  return (
    !!x && typeof x === 'object' && 'issues' in (x as Record<string, unknown>)
  );
}

function toLogErr(err: unknown) {
  return err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { err: String(err) };
}

type ExtFastifyError = FastifyError & {
  validation?: unknown;
  code?: string;
  statusCode?: number;
  issues?: unknown[];
};

// ---- server ------------------------------------------------------------------
export function buildServer(opts: BuildOpts = {}): FastifyInstance {
  const envIsProd = process.env.NODE_ENV === 'production';

  const server = Fastify({
    logger:
      opts.logger ??
      (opts.forTest
        ? false
        : envIsProd
          ? { level: 'info' }
          : {
              transport: { target: 'pino-pretty', options: { colorize: true } },
            }),
    genReqId: () => `req-${Math.random().toString(36).slice(2, 10)}`,
  }).withTypeProvider<ZodTypeProvider>();

  // Zod compilers ต้องมาก่อนทุก route/plugin ที่มี schema
  server.setValidatorCompiler(zodValidatorCompiler);
  server.setSerializerCompiler(zodSerializerCompiler);

  // Plugins
  server.register(helmet, { contentSecurityPolicy: false });
  server.register(cors, {
    origin:
      envIsProd && !opts.forTest ? parseCorsOrigins(opts.corsOrigins) : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: envIsProd && !opts.forTest,
    strictPreflight: false,
  });
  server.register(etag);

  const enableRL = opts.enableRateLimit ?? envIsProd;
  if (enableRL) {
    server.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  }

  if (opts.enableDocs !== false) {
    server.register(swagger, {
      openapi: { info: { title: 'Ice Truck API', version: '1.0.0' } },
    });
    server.register(swaggerUi, { routePrefix: '/docs' });
  }

  // Schemas
  const loginBody = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });
  const zPublicUser = z.object({
    id: z.number().int(),
    username: z.string(),
    role: z.string(),
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
  const listQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    sort: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
  });
  const createTruckBody = z.object({ name: z.string().trim().min(1) });
  const errorOut = z.object({
    message: z.string(),
    error: z.string().optional(),
    details: z.unknown().optional(),
  });

  type ListQuery = z.infer<typeof listQuery>;
  type TruckOut = z.infer<typeof truckOut>;
  type AlertOut = z.infer<typeof alertOut>;
  type LoginBody = z.infer<typeof loginBody>;
  type TruckSortField = 'name' | 'createdAt' | 'updatedAt';

  // Health
  server.get<{ Reply: { status: 'ok'; timestamp: string } }>(
    '/health',
    {
      schema: {
        response: {
          200: z.object({ status: z.literal('ok'), timestamp: z.string() }),
        },
      },
    },
    () => ({ status: 'ok', timestamp: new Date().toISOString() }),
  );

  server.get<{ Reply: { ok: true } }>(
    '/api/v1/health',
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    () => ({ ok: true }),
  );

  server.get<{ Reply: { ready: boolean } }>(
    '/readyz',
    {
      schema: {
        response: {
          200: z.object({ ready: z.literal(true) }),
          503: z.object({ ready: z.literal(false) }),
        },
      },
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

  // Explicit preflight for tests
  server.options('/api/v1/trucks', (_req, reply) => {
    reply.code(204).send();
  });
  server.options('/api/v1/alerts', (_req, reply) => {
    reply.code(204).send();
  });

  // Auth
  server.post<{
    Body: LoginBody;
    Reply: { user: PublicUser; token: string } | { message: string };
  }>(
    '/api/v1/auth/login',
    {
      schema: {
        body: loginBody,
        response: {
          200: z.object({ user: zPublicUser, token: z.string() }),
          401: errorOut,
        },
      },
    },
    async (request, reply) => {
      const { username, password } = loginBody.parse(request.body);

      const candidate = await userService.login(
        username,
        password,
        process.env,
      );
      let user: PublicUser | null = candidate
        ? userService.toPublicUser(candidate)
        : null;

      if (!user && typeof userService.matchDemoUser === 'function') {
        const m = userService.matchDemoUser(username, password, process.env);
        if (m) user = m;
      }

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
              user = { id: 0, username: du, role: 'demo' as Role };
            }
          } catch (err: unknown) {
            request.log.debug(
              { err: toLogErr(err) },
              'Invalid DEMO_CREDS JSON',
            );
          }
        }
      }

      if (!user) {
        const U = process.env.ADMIN_USER ?? 'admin';
        const P = process.env.ADMIN_PASS ?? 'admin';
        if (username === U && password === P) {
          user = { id: 1, username: U, role: 'admin' as Role };
        }
      }

      if (!user) {
        reply.status(401);
        return { message: 'Invalid credentials' };
      }

      const secret =
        (typeof userService.resolveJwtSecret === 'function'
          ? userService.resolveJwtSecret(process.env)
          : (process.env.JWT_SECRET ?? '').trim()) || 'change-me-in-prod';

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        secret,
        { expiresIn: '1d' },
      );
      reply.code(200);
      return { user, token };
    },
  );

  // Trucks list
  server.get<{ Querystring: ListQuery; Reply: TruckOut[] }>(
    '/api/v1/trucks',
    {
      schema: { querystring: listQuery, response: { 200: z.array(truckOut) } },
    },
    async (request) => {
      const { page, limit, sort, order } = request.query;

      const orderBy =
        (sort as TruckSortField) === 'name'
          ? { name: order }
          : (sort as TruckSortField) === 'createdAt'
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
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    },
  );

  // Trucks create
  server.post<{
    Body: { name: string };
    Reply: TruckOut | z.infer<typeof errorOut>;
  }>(
    '/api/v1/trucks',
    {
      schema: {
        body: createTruckBody,
        response: { 201: truckOut, 409: errorOut, 400: errorOut },
      },
    },
    async (request, reply) => {
      const { name } = createTruckBody.parse(request.body);
      try {
        const created = await prisma.truck.create({ data: { name } });
        reply.code(201);
        return {
          id: created.id,
          name: created.name,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      } catch (e: unknown) {
        const code = (e as { code?: string } | null)?.code;
        if (code === 'P2002') {
          reply.code(409);
          return { message: 'Unique constraint failed', error: 'Conflict' };
        }
        request.log.error({ err: toLogErr(e) }, 'create truck failed');
        reply.code(500);
        return { message: 'Internal Server Error', error: 'InternalError' };
      }
    },
  );

  // Alerts list
  server.get<{ Reply: AlertOut[] }>(
    '/api/v1/alerts',
    { schema: { response: { 200: z.array(alertOut) } } },
    async () => {
      const alerts = await prisma.alert.findMany({ orderBy: { id: 'asc' } });
      return alerts.map((a) => ({
        id: a.id,
        level: a.level,
        message: a.message,
        truckId: a.truckId,
        createdAt: a.createdAt.toISOString(),
      }));
    },
  );

  // 404
  server.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: 'Not Found', message: 'Route not found' }),
  );

  // Global error handler
  server.setErrorHandler((rawErr: ExtFastifyError, req, reply) => {
    const code = rawErr.code;

    // Fastify validation
    if ('validation' in rawErr && rawErr.validation) {
      return reply.code(400).send({
        message: 'Validation error',
        error: 'BadRequest',
        details: rawErr.validation,
      });
    }

    // invalid media type or JSON parse errors
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

    // Zod validation
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

    // Prisma unique
    if (code === 'P2002') {
      return reply
        .code(409)
        .send({ message: 'Unique constraint failed', error: 'Conflict' });
    }

    // Preserve provided status
    if (typeof rawErr.statusCode === 'number') {
      const sc = rawErr.statusCode;
      const msg = rawErr.message ?? 'Unhandled error';
      return reply
        .code(sc)
        .send({ message: String(msg), error: rawErr.name ?? 'Error' });
    }

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

// ---- lifecycle helpers -------------------------------------------------------
export function registerShutdown(instance: FastifyInstance) {
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
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  process.on('SIGTERM', handler);
  process.on('SIGINT', handler);
  return () => {
    process.removeListener('SIGTERM', handler);
    process.removeListener('SIGINT', handler);
  };
}

export type ExitFn = (code: number) => never;
export type StartOptions = { srv?: FastifyInstance; exitFn?: ExitFn };

// สร้าง server ดีฟอลต์ก่อนใช้ภายใน start เพื่อกัน TDZ
const defaultServer = buildServer({ logger: false });

export async function start(
  srv: FastifyInstance,
  exitFn?: ExitFn,
): Promise<void>;
export async function start(opts?: StartOptions): Promise<void>;
export async function start(arg1?: unknown, arg2?: unknown): Promise<void> {
  const isFastifyInstance = (x: unknown): x is FastifyInstance =>
    !!x && typeof (x as { listen?: unknown }).listen === 'function';

  let srv: FastifyInstance;
  let exit: ExitFn;

  if (isFastifyInstance(arg1)) {
    srv = arg1;
    exit =
      typeof arg2 === 'function'
        ? (arg2 as ExitFn)
        : (((code: number) => process.exit(code)) as ExitFn);
  } else {
    const opts = (arg1 as StartOptions) ?? {};
    srv = opts.srv ?? defaultServer;
    exit = opts.exitFn ?? ((code: number) => process.exit(code));
  }

  try {
    await srv.listen({ port: PORT, host: '0.0.0.0' });
    registerShutdown(srv);
    srv.log.info(`Server listening on http://0.0.0.0:${PORT}`);
  } catch (err: unknown) {
    try {
      srv.log.error({ err: toLogErr(err) }, 'server start failed');
    } catch (inner: unknown) {
      // ในบางกรณี logger อาจยังไม่พร้อม

      console.error(inner);
    }
    exit(1);
  }
}

export async function app(buildOpts?: BuildOpts) {
  const s = buildServer({ logger: false, ...buildOpts });
  await s.ready();
  return s;
}

export type { FastifyInstance };

export default defaultServer;

// auto-start นอกโหมดทดสอบ
if (process.env.NODE_ENV !== 'test' && process.env.START_SERVER !== 'false') {
  void start({ srv: defaultServer });
}
