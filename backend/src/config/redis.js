// Redis client configuration (ioredis)
const Redis = require('ioredis');
const config = require('./env');
const logger = require('./logger');

let client = null;

const getClient = () => {
    if (client) return client;

    client = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 200, 5000);
            return delay;
        },
        lazyConnect: true,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error', err));
    client.on('close', () => logger.warn('Redis connection closed'));

    return client;
};

/**
 * Cache-aside helper — get from cache or fetch & store
 * @param {string} key
 * @param {Function} fetchFn - async function returning data to cache
 * @param {number} ttl - seconds (default 60)
 */
const cacheOrFetch = async (key, fetchFn, ttl = 60) => {
    const redis = getClient();
    try {
        const cached = await redis.get(key);
        if (cached) {
            logger.debug({ key }, 'cache hit');
            return JSON.parse(cached);
        }
    } catch {
        // Redis down — fall through to fetch
    }

    const data = await fetchFn();

    try {
        await redis.setex(key, ttl, JSON.stringify(data));
    } catch {
        // Redis down — ignore
    }

    return data;
};

/** Invalidate a key or pattern */
const invalidate = async (pattern) => {
    const redis = getClient();
    try {
        if (pattern.includes('*')) {
            const keys = await redis.keys(pattern);
            if (keys.length) await redis.del(...keys);
        } else {
            await redis.del(pattern);
        }
    } catch {
        // Redis down — ignore
    }
};

/** Publish to a Redis channel (for horizontal scaling) */
const publish = async (channel, message) => {
    const redis = getClient();
    try {
        await redis.publish(channel, JSON.stringify(message));
    } catch {
        // ignore
    }
};

const close = async () => {
    if (client) {
        await client.quit();
        client = null;
    }
};

module.exports = { getClient, cacheOrFetch, invalidate, publish, close };
