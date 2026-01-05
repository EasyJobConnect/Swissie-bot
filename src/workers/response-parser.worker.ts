import { Job } from 'bullmq';
import { WorkflowPayload, completionQueue, followUpQueue, escalationQueue } from '../queues/definitions';
import { getConfigBundle } from '../config/s3-loader';

/**
 * Response Parser Worker
 * The Analyst - Analyzes customer responses and determines next steps
 */
export async function processResponseParserJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, customerResponse, currentDay = 0 } = job.data;

  console.log(`🔍 [Response Parser] Analyzing response for ${workflowId} (Day ${currentDay})`);

  // If no response yet, check if we should follow up or escalate
  if (!customerResponse) {
    console.log(`   No customer response yet`);

    // If we're past day 4 and no response, escalate
    if (currentDay >= 4) {
      console.log(`➡️  [Response Parser] No response by day ${currentDay}, escalating`);
      await escalationQueue.add('escalate-workflow', {
        ...job.data,
        status: 'escalated',
      });
      return;
    }

    // Otherwise, schedule a follow-up
    console.log(`➡️  [Response Parser] Scheduling follow-up for day ${currentDay + 1}`);
    await followUpQueue.add('schedule-followup', {
      ...job.data,
      currentDay: currentDay + 1,
    });
    return;
  }

  // Load config to get keywords
  const configBundle = await getConfigBundle();
  const { success: successKeywords, failure: failureKeywords } = configBundle.keywords;

  // Analyze the response
  const normalizedResponse = customerResponse.toLowerCase().trim();

  // Check for success keywords
  const isSuccess = successKeywords.some((keyword) =>
    normalizedResponse.includes(keyword.toLowerCase())
  );

  // Check for failure keywords
  const isFailure = failureKeywords.some((keyword) =>
    normalizedResponse.includes(keyword.toLowerCase())
  );

  if (isSuccess) {
    console.log(`✅ [Response Parser] Success keyword detected: "${customerResponse}"`);
    await completionQueue.add('success-completion', {
      ...job.data,
      status: 'completed',
      customerResponse,
    });
    return;
  }

  if (isFailure) {
    console.log(`❌ [Response Parser] Failure keyword detected: "${customerResponse}"`);
    await completionQueue.add('failure-completion', {
      ...job.data,
      status: 'failed',
      customerResponse,
    });
    return;
  }

  // Ambiguous response - continue with follow-up if under 7 days
  console.log(`❓ [Response Parser] Ambiguous response, continuing workflow`);
  if (currentDay < 7) {
    await followUpQueue.add('continue-followup', {
      ...job.data,
      currentDay: currentDay + 1,
    });
  } else {
    // Max days reached
    await completionQueue.add('timeout-completion', {
      ...job.data,
      status: 'failed',
    });
  }
}
