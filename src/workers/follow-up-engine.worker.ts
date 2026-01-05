import { Job } from 'bullmq';
import { WorkflowPayload, controllerQueue } from '../queues/definitions';
import { getDayDelay, getFollowUpDelay } from '../utils/human-delays';

/**
 * Follow-up Engine Worker
 * The Scheduler - Manages delays and schedules next steps in the workflow
 */
export async function processFollowUpJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, currentDay = 0 } = job.data;

  console.log(`⏰ [Follow-up Engine] Scheduling next action for ${workflowId}`);
  console.log(`   Current Day: ${currentDay}, Next Day: ${currentDay + 1}`);

  // Check if we've exceeded the 7-day limit
  if (currentDay >= 7) {
    console.log(`⏱️  [Follow-up Engine] 7-day limit reached, no more follow-ups`);
    return;
  }

  // Calculate delay for the next action
  let delay: number;

  // Use predefined day delays for key days (1, 2, 4, 7)
  if ([1, 2, 4, 7].includes(currentDay + 1)) {
    delay = getDayDelay(currentDay + 1);
  } else {
    // Use random 6-18 hour delay for other days
    delay = getFollowUpDelay();
  }

  console.log(`⏳ [Follow-up Engine] Scheduling next action in ${Math.round(delay / 3600000)} hours`);

  // Schedule the next controller job with delay
  await controllerQueue.add(
    `followup-day-${currentDay + 1}`,
    {
      ...job.data,
      currentDay: currentDay + 1,
    },
    {
      delay, // Delay in milliseconds
      attempts: 3,
    }
  );

  console.log(`✅ [Follow-up Engine] Follow-up scheduled for day ${currentDay + 1}`);
}
