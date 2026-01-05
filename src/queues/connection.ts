import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
import { logRedisStatus } from '../utils/worker-logger';

dotenv.config();

/**
 * Validate Redis configuration from environment
 */
function validateRedisEnv(): { url?: string; host?: string; port?: number; password?: string; db?: number } {
  // Support REDIS_URL for direct connection string
  if (process.env.REDIS_URL) {
    console.log('📋 [Redis] Using REDIS_URL from environment');
    return { url: process.env.REDIS_URL };
  }

  // Fallback to individual env vars
  const host = process.env.REDIS_HOST;
  const portStr = process.env.REDIS_PORT || '6379';
  const port = parseInt(portStr, 10);

  if (!host) {
    throw new Error(
      'Redis configuration error: Either REDIS_URL or REDIS_HOST must be set. ' +
      'No Redis connection parameters found in environment variables.'
    );
  }

  console.log('📋 [Redis] Using REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB from environment');

  return {
    host,
    port,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  };
}

/**
 * Create and export Redis connection for BullMQ
 */
const redisConfig = validateRedisEnv();

export const redisConnection = new Redis({
  ...(redisConfig.url ? { url: redisConfig.url } : {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
  }),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: any) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

/**
 * Redis connection event handlers
 */
redisConnection.on('ready', () => {
  console.log('✅ [Redis] Connection ready and authenticated');
});

redisConnection.on('connect', () => {
  logRedisStatus('connected');
});

redisConnection.on('error', (err: Error) => {
  logRedisStatus('error', err.message);
  // Critical: Redis connection failure should crash the process
  // Workers cannot function without Redis
  if (redisConnection.status !== 'ready' && redisConnection.status !== 'connect') {
    console.error('❌ [Redis] FATAL: Redis disconnected. Terminating worker process.');
    process.exit(1);
  }
});

redisConnection.on('close', () => {
  console.warn('⚠️  [Redis] Connection closed');
});

redisConnection.on('reconnecting', () => {
  console.warn('⏳ [Redis] Attempting to reconnect...');
});

export default redisConnection;
