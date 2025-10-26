// plugins/jwt.ts
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

export default fp(async (app) => {
  const secret = process.env.JWT_SECRET ?? 'test-secret';
  app.register(jwt, { secret });

  // เปิดเส้นทางสาธารณะ
  const open = new Set([
    '/health',
    '/readyz',
    '/api/v1/health',
    '/api/v1/auth/login',
  ]);
  app.addHook('onRequest', async (req, reply) => {
    const url = req.raw.url ?? '';
    if ([...open].some((p) => url.startsWith(p))) return;
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ message: 'unauthorized' });
    }
  });
});
