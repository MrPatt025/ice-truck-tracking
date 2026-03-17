#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_ROOT = normalizeApiRoot(
    process.env.ICE_TRUCK_API_URL ?? 'http://localhost:5000/api/v1'
);

const server = new McpServer({
    name: 'ice-truck-mcp-server',
    version: '1.0.0',
});

server.registerTool(
    'health_check',
    {
        description: 'Get backend health information',
    },
    async () => {
        const data = await getJson('/health');
        return response(data);
    }
);

server.registerTool(
    'list_trucks',
    {
        description: 'List trucks from the backend with optional filters',
        inputSchema: {
            status: z.string().optional(),
            search: z.string().optional(),
            page: z.number().int().positive().optional(),
            limit: z.number().int().positive().max(200).optional(),
        },
    },
    async ({ status, search, page, limit }) => {
        const query = new URLSearchParams();

        if (status) query.set('status', status);
        if (search) query.set('search', search);
        if (page) query.set('page', String(page));
        if (limit) query.set('limit', String(limit));

        const suffix = query.size > 0 ? `/trucks?${query.toString()}` : '/trucks';
        const data = await getJson(suffix);
        return response(data);
    }
);

server.registerTool(
    'get_truck',
    {
        description: 'Get a single truck by id',
        inputSchema: {
            id: z.string().min(1),
        },
    },
    async ({ id }) => {
        const data = await getJson(`/trucks/${encodeURIComponent(id)}`);
        return response(data);
    }
);

server.registerTool(
    'list_alerts',
    {
        description: 'List alerts with optional severity and status filters',
        inputSchema: {
            severity: z.string().optional(),
            status: z.string().optional(),
            page: z.number().int().positive().optional(),
            limit: z.number().int().positive().max(200).optional(),
        },
    },
    async ({ severity, status, page, limit }) => {
        const query = new URLSearchParams();

        if (severity) query.set('severity', severity);
        if (status) query.set('status', status);
        if (page) query.set('page', String(page));
        if (limit) query.set('limit', String(limit));

        const suffix = query.size > 0 ? `/alerts?${query.toString()}` : '/alerts';
        const data = await getJson(suffix);
        return response(data);
    }
);

function normalizeApiRoot(apiUrl: string): string {
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
}

async function getJson(path: string): Promise<unknown> {
    const url = `${API_ROOT}${path}`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Request failed (${res.status}) for ${url}: ${body || res.statusText}`);
    }

    return res.json();
}

function response(payload: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(payload, null, 2),
            },
        ],
    };
}

const transport = new StdioServerTransport();

try {
    await server.connect(transport);
} catch (error) {
    console.error('[ice-truck-mcp-server] fatal:', error);
    process.exit(1);
}
