import { Job } from 'bullmq';
import { WorkflowPayload, channelSelectorQueue, completionQueue } from '../queues/definitions';

/**
 * Extended Controller Worker
 * The Brain - Main state machine that manages the 7-day lifecycle
 */
export async function processControllerJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, currentDay = 0, status = 'pending' } = job.data;

  console.log(`🧠 [Controller] Processing workflow: ${workflowId} (Day ${currentDay})`);

  // Check if we've reached the 7-day limit
  if (currentDay >= 7) {
    console.log(`⏱️  [Controller] 7-day limit reached for ${workflowId}, moving to completion`);
    await completionQueue.add('timeout-completion', {
      ...job.data,
      status: 'failed',
      currentDay,
    });
    return;
  }

  // Check if workflow is already completed or failed
  if (status === 'completed' || status === 'failed') {
    console.log(`✅ [Controller] Workflow ${workflowId} already ${status}`);
    await completionQueue.add('final-completion', job.data);
    return;
  }

  // Initialize workflow state
  const updatedPayload: WorkflowPayload = {
    ...job.data,
    currentDay,
    status: 'in_progress',
    attemptCount: (job.data.attemptCount || 0) + 1,
  };

  // Route to channel selector for the current day
  console.log(`➡️  [Controller] Routing to Channel Selector (Day ${currentDay})`);
  await channelSelectorQueue.add(`select-channel-day-${currentDay}`, updatedPayload, {
    attempts: 3,
  });
}
