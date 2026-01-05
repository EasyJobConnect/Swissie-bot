import { Job } from 'bullmq';
import { WorkflowPayload, messageBuilderQueue } from '../queues/definitions';

/**
 * Channel Selector Worker
 * The Router - Decides which channel to use based on region, tier, and day
 */
export async function processChannelSelectorJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, regionCode, tierFlags, currentDay = 0 } = job.data;

  console.log(`🔀 [Channel Selector] Selecting channel for ${workflowId} (Day ${currentDay})`);

  // Channel selection logic
  let selectedChannel: string;

  // Day 0-2: Try email first
  if (currentDay <= 2) {
    selectedChannel = tierFlags.channels.includes('email') ? 'email' : tierFlags.channels[0];
  }
  // Day 4: Switch to alternative channel if available
  else if (currentDay === 4) {
    const alternatives = tierFlags.channels.filter((c) => c !== 'email');
    selectedChannel = alternatives.length > 0 ? alternatives[0] : 'email';
  }
  // Day 7: Use priority channel or voice as last resort
  else {
    if (tierFlags.priority === 'high' && tierFlags.channels.includes('voice')) {
      selectedChannel = 'voice';
    } else {
      selectedChannel = tierFlags.channels.includes('chat')
        ? 'chat'
        : tierFlags.channels[0];
    }
  }

  // Region-specific overrides
  if (regionCode === 'EU' && selectedChannel === 'voice') {
    // EU might prefer email/chat due to GDPR
    selectedChannel = 'email';
  }

  console.log(`✅ [Channel Selector] Selected channel: ${selectedChannel}`);

  // Update payload and route to message builder
  const updatedPayload: WorkflowPayload = {
    ...job.data,
    selectedChannel,
  };

  await messageBuilderQueue.add(`build-message-${selectedChannel}`, updatedPayload);
}
