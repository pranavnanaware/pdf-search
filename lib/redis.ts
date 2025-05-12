import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug log to check if REDIS_URL is loaded
console.log('REDIS_URL from env:', process.env.REDIS_URL ? 'Set' : 'Not set');

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

// Parse Redis URL
const redisUrl = new URL(process.env.REDIS_URL);
const redisConfig = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port),
  username: redisUrl.username,
  password: redisUrl.password,
  tls: {
    rejectUnauthorized: false
  },
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

// Initialize Redis client with error handling
const redis = new Redis(redisConfig);

// Log Redis connection status
redis.on('connect', () => {
  console.log('🔌 Connected to Redis at:', process.env.REDIS_URL);
  // Log Redis client options
  console.log('Redis client options:', {
    host: redis.options.host,
    port: redis.options.port,
    db: redis.options.db,
    username: redis.options.username,
    password: redis.options.password ? '****' : undefined,
    tls: 'enabled'
  });
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Cache TTL in seconds (24 hours)
const CACHE_TTL = 24 * 60 * 60;

interface CacheResult {
  documentId: string;
  title: string;
  relevancyReport: {
    startPage: number;
    endPage: number;
  };
}

// Create a unique key from query and URL
function createCacheKey(query: string, url: string): string {
  return `search:${query}:${url}`;
}

export async function getCachedResult(query: string, url: string): Promise<CacheResult | null> {
  const key = createCacheKey(query, url);
  console.log('🔍 Checking Redis for key:', key);
  try {
    const cached = await redis.get(key);
    console.log('Redis get result:', cached ? 'Found' : 'Not found');
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting from Redis:', error);
    throw error;
  }
}

export async function setCachedResult(query: string, url: string, result: CacheResult): Promise<void> {
  const key = createCacheKey(query, url);
  console.log('💾 Caching result for key:', key);
  try {
    await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL);
    // Verify the key was set
    const exists = await redis.exists(key);
    console.log('Key verification after set:', exists ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Error setting in Redis:', error);
    throw error;
  }
}

export async function closeRedisConnection(): Promise<void> {
  console.log('🔌 Closing Redis connection...');
  try {
    await redis.quit();
    console.log('Redis connection closed successfully');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
    throw error;
  }
}

export default redis; 