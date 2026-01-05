import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { WorkflowPayload, QueueName, deadLetterQueue } from './definitions';
import { logRetry, logDLQ, logWorkerBoot, logHeartbeat } from '../utils/worker-logger';

/**
 * Worker lifecycle state
 */
let activeWorkerCount = 0;

/**
 * Base worker configuration
 */
const workerOptions = {
  connection: redisConnection,
  autorun: true,
  concurrency: 5,
};

/**
 * Start heartbeat monitoring
 */
function startWorkerHeartbeat(queueName: QueueName): void {
  setInterval(() => {
    logHeartbeat(queueName);
  }, 60000); // Every 60 seconds
}

/**
 * Error handler - sends failed jobs to DLQ
 */
export async function handleJobFailure(job: Job<WorkflowPayload> | null, error: Error): Promise<void> {
  const jobId = job?.id || 'unknown';
  const queueName = job?.queueName || 'unknown';
  const attempt = job?.attemptsMade || 0;
  const maxAttempts = job?.opts?.attempts || 3;

  // Log retry or DLQ based on attempt count
  if (attempt < maxAttempts) {
    logRetry(jobId, queueName, attempt, maxAttempts, error.message);
  } else if (job && attempt >= maxAttempts) {
    logDLQ(jobId, queueName, attempt);

    try {
      await deadLetterQueue.add('failed-job', {
        ...job.data,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString(),
        attempts: attempt,
        queue: queueName,
      } as any);
    } catch (dlqError) {
      console.error(`❌ [DLQ] Failed to add job to DLQ:`, dlqError);
    }
  }
}

/**
 * Success logger - opaque completion webhook confirmation
 */
export function logJobSuccess(job: Job<WorkflowPayload>): void {
  console.log(`✅ [Job Success] Job completed`, {
    timestamp: new Date().toISOString(),
    worker: true,
    job_id: job.id,
    queue: job.queueName,
    event: 'success',
  });
}

/**
 * Create a worker with standard error handling and observability
 */
export function createWorker(
  queueName: QueueName,
  processor: (job: Job<WorkflowPayload>) => Promise<any>
): Worker<WorkflowPayload> {
  const worker = new Worker<WorkflowPayload>(queueName, processor, workerOptions);

  // Log worker startup using structured logging
  activeWorkerCount++;
  logWorkerBoot(queueName);

  // Start heartbeat for this worker
  startWorkerHeartbeat(queueName);

  worker.on('completed', (job: Job<WorkflowPayload>) => {
    logJobSuccess(job);
  });

  worker.on('failed', (job: Job<WorkflowPayload> | undefined, err: Error) => {
    handleJobFailure(job || null, err);
  });

  worker.on('error', (err: Error) => {
    console.error(`❌ [Worker Error] Unhandled error in worker`, {
      timestamp: new Date().toISOString(),
      worker: true,
      queue: queueName,
      event: 'error',
      error_message: err.message,
    });
  });

  // Ensure process crashes on fatal errors
  worker.on('drained', () => {
    console.log(`📋 [Worker] Queue drained`, {
      timestamp: new Date().toISOString(),
      worker: true,
      queue: queueName,
      event: 'drained',
    });
  });

  return worker;
}
