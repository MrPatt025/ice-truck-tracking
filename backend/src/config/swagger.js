'use strict';

/**
 * backend/src/config/swagger.js
 * Zero-deps OpenAPI spec + Fastify route registrar.
 * Serves:
 *   - /api-docs.json (raw OpenAPI)
 *   - /api-docs      (Swagger UI via CDN)
 */

/** @type {import('openapi-types').OpenAPIV3.Document} */
const specs = {
  openapi: '3.0.3',
  info: {
    title: 'Ice Truck Tracking API',
    version: '1.0.0',
    description: 'REST API for health, auth, trucks, and alerts.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'health' },
    { name: 'auth' },
    { name: 'trucks' },
    { name: 'alerts' },
  ],
  components: {
    schemas: {
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['status'],
      },
      ApiHealth: {
        type: 'object',
        properties: { ok: { type: 'boolean', example: true } },
        required: ['ok'],
      },
      Truck: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int32', example: 1 },
          name: { type: 'string', example: 'ICE-TRK-001' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name'],
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int32', example: 1 },
          level: { type: 'string', enum: ['INFO', 'WARN', 'ERROR'] },
          message: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          truckId: { type: 'integer', format: 'int32' },
        },
        required: ['id', 'level', 'message'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
        required: ['username', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer', format: 'int32' },
              username: { type: 'string' },
              role: { type: 'string' },
            },
            required: ['id', 'username', 'role'],
          },
          token: { type: 'string' },
        },
        required: ['user', 'token'],
      },
      Error: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          error: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['statusCode', 'message'],
      },
    },
    parameters: {
      Page: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
      Sort: {
        name: 'sort',
        in: 'query',
        schema: {
          type: 'string',
          enum: ['name', 'createdAt', 'updatedAt'],
          default: 'name',
        },
      },
      Order: {
        name: 'order',
        in: 'query',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Liveness probe',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['health'],
        summary: 'API health probe',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiHealth' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/v1/trucks': {
      get: {
        tags: ['trucks'],
        summary: 'List trucks',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Sort' },
          { $ref: '#/components/parameters/Order' },
        ],
        responses: {
          200: {
            description: 'Array of trucks',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Truck' },
                },
              },
            },
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['trucks'],
        summary: 'Create truck',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Truck' },
              },
            },
          },
          409: {
            description: 'Duplicate name',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          400: {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/v1/alerts': {
      get: {
        tags: ['alerts'],
        summary: 'List alerts',
        responses: {
          200: {
            description: 'Array of alerts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Alert' },
                },
              },
            },
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Register docs routes on a Fastify instance without extra deps.
 * @param {import('fastify').FastifyInstance} app
 */
function registerSwagger(app) {
  app.get('/api-docs.json', async (_req, reply) => reply.send(specs));

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>body { margin:0 } #swagger-ui { width:100%; height:100vh }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api-docs.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`;

  app.get('/api-docs', async (_req, reply) =>
    reply.type('text/html; charset=utf-8').send(html),
  );
}

module.exports = { specs, registerSwagger };
