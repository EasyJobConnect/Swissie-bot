import { Job } from 'bullmq';
import { WorkflowPayload, completionQueue, messageBuilderQueue } from '../queues/definitions';

/**
 * Escalation Path Worker
 * The Backup Plan - Handles workflows that need special attention
 */
export async function processEscalationJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, regionCode, tierFlags, currentDay = 0 } = job.data;

  console.log(`🚨 [Escalation] Handling escalation for ${workflowId}`);
  console.log(`   Tier: ${tierFlags.priority}, Day: ${currentDay}`);

  // High-priority workflows get immediate attention
  if (tierFlags.priority === 'high') {
    console.log(`⚡ [Escalation] High-priority workflow - attempting direct contact`);

    // Try voice channel if available
    if (tierFlags.channels.includes('voice')) {
      await messageBuilderQueue.add('escalation-voice', {
        ...job.data,
        selectedChannel: 'voice',
        status: 'escalated',
      });
      return;
    }

    // Try chat as backup
    if (tierFlags.channels.includes('chat')) {
      await messageBuilderQueue.add('escalation-chat', {
        ...job.data,
        selectedChannel: 'chat',
        status: 'escalated',
      });
      return;
    }
  }

  // For normal priority or if channels exhausted, notify and complete
  console.log(`📋 [Escalation] Moving to completion with escalation status`);

  // Send escalation notification (in production, this might page someone)
  await notifyEscalation(workflowId, regionCode, tierFlags.priority);

  // Mark as escalated and complete
  await completionQueue.add('escalation-completion', {
    ...job.data,
    status: 'escalated',
  });
}

/**
 * Send escalation notification to internal system
 */
async function notifyEscalation(
  workflowId: string,
  regionCode: string,
  priority: string
): Promise<void> {
  // In production, this would send to Slack, PagerDuty, etc.
  console.log(`📢 [Escalation] NOTIFICATION SENT:`);
  console.log(`   Workflow: ${workflowId}`);
  console.log(`   Region: ${regionCode}`);
  console.log(`   Priority: ${priority}`);
  console.log(`   Action Required: Manual intervention needed`);
}
