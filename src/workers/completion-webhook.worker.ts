import { Job } from 'bullmq';
import { WorkflowPayload } from '../queues/definitions';
import { sendWebhook } from '../adapters/http.adapter';
import { config } from '../config/secrets';

/**
 * Completion Webhook Worker
 * The Reporter - Sends final status back to n8n
 * 
 * NOTE: This worker does NOT inspect or validate payload semantics.
 * It treats all webhook payloads as opaque messages to be dispatched.
 */
export async function processCompletionJob(job: Job<WorkflowPayload>): Promise<void> {
  const jobId = job.id;
  const { workflowId, status, currentDay, customerResponse } = job.data;

  console.log(`📢 [Completion] Processing completion job`, {
    timestamp: new Date().toISOString(),
    worker: true,
    job_id: jobId,
    queue: 'completion-queue',
    event: 'dispatch_webhook',
  });

  // Prepare webhook payload with masked data (no sensitive info)
  // OPAQUE: We do not interpret the semantics of this data
  const webhookPayload = {
    workflowId,
    status: status || 'completed',
    completedAt: new Date().toISOString(),
    totalDays: currentDay || 0,
    outcome: determineOutcome(status, customerResponse),
    metadata: {
      finalDay: currentDay,
      hasResponse: !!customerResponse,
    },
  };

  try {
    // Send to n8n webhook - OPAQUE dispatch, no validation
    await sendWebhook(config.webhook.url, webhookPayload);

    console.log(`✅ [Completion] Webhook dispatched successfully`, {
      timestamp: new Date().toISOString(),
      worker: true,
      job_id: jobId,
      queue: 'completion-queue',
      event: 'webhook_dispatched',
      status: webhookPayload.status,
    });
  } catch (error) {
    console.error(`❌ [Completion] Failed to dispatch webhook`, {
      timestamp: new Date().toISOString(),
      worker: true,
      job_id: jobId,
      queue: 'completion-queue',
      event: 'webhook_failed',
      error_message: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Determine the outcome based on status and response
 * OPAQUE: This is treated as message content, not business logic interpretation
 */
function determineOutcome(
  status?: string,
  customerResponse?: string
): 'success' | 'timeout' | 'declined' | 'unknown' {
  if (status === 'completed' && customerResponse) {
    return 'success';
  }
  if (status === 'failed' && customerResponse) {
    return 'declined';
  }
  if (status === 'failed') {
    return 'timeout';
  }
  return 'unknown';
}
