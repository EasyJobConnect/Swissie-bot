/**
 * Worker Observability Logger
 * 
 * Provides structured, opaque logging for worker failures without inspecting job payloads.
 * All logs include: timestamp, worker flag, env, job_id, attempt number, status
 */

export interface FailureLogPayload {
  timestamp: string;
  env: string;
  worker: true;
  job_id: string;
  queue: string;
  attempt: number;
  max_attempts: number;
  status: 'retry' | 'dlq' | 'error';
  error_message: string;
  pid?: number;
}

export interface RetryLogPayload {
  timestamp: string;
  env: string;
  worker: true;
  job_id: string;
  queue: string;
  attempt: number;
  max_attempts: number;
  status: 'retry';
  reason: string;
}

export interface DLQLogPayload {
  timestamp: string;
  env: string;
  worker: true;
  job_id: string;
  queue: string;
  total_attempts: number;
  status: 'dlq';
  event: 'moved_to_dlq';
}

/**
 * Log a job retry (opaque - no payload inspection)
 */
export function logRetry(
  jobId: string,
  queueName: string,
  attempt: number,
  maxAttempts: number,
  errorMessage: string
): void {
  const payload: RetryLogPayload = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    worker: true,
    job_id: jobId,
    queue: queueName,
    attempt,
    max_attempts: maxAttempts,
    status: 'retry',
    reason: errorMessage,
  };

  console.warn(`🔄 [Retry] Job will be retried`, payload);
}

/**
 * Log a job moving to DLQ (opaque - no payload inspection)
 */
export function logDLQ(
  jobId: string,
  queueName: string,
  totalAttempts: number
): void {
  const payload: DLQLogPayload = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    worker: true,
    job_id: jobId,
    queue: queueName,
    total_attempts: totalAttempts,
    status: 'dlq',
    event: 'moved_to_dlq',
  };

  console.error(`⚠️  [DLQ] Job exhausted retries and moved to Dead Letter Queue`, payload);
}

/**
 * Log a worker startup
 */
export function logWorkerBoot(queueName: string): void {
  console.log(`🔄 [Worker Boot] Worker started`, {
    timestamp: new Date().toISOString(),
    worker: true,
    queue: queueName,
    event: 'boot',
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
  });
}

/**
 * Log worker heartbeat (minimal, opaque)
 */
export function logHeartbeat(queueName: string): void {
  console.log(`💓 [Heartbeat] Worker alive`, {
    timestamp: new Date().toISOString(),
    worker: true,
    queue: queueName,
    event: 'heartbeat',
    pid: process.pid,
  });
}

/**
 * Log system startup completion
 */
export function logSystemReady(): void {
  console.log(`✅ [System] Ready for jobs`, {
    timestamp: new Date().toISOString(),
    worker: true,
    event: 'system_ready',
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
  });
}

/**
 * Log Redis connection status
 */
export function logRedisStatus(status: 'connected' | 'error' | 'disconnected', message?: string): void {
  const logLevel = status === 'connected' ? 'log' : 'error';
  const method = console[logLevel as 'log' | 'error'];

  method(`🔌 [Redis] Connection ${status}`, {
    timestamp: new Date().toISOString(),
    worker: true,
    event: `redis_${status}`,
    message: message || undefined,
    pid: process.pid,
  });
}
