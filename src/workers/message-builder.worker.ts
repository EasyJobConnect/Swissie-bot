import { Job } from 'bullmq';
import { WorkflowPayload, responseParserQueue } from '../queues/definitions';
import { getConfigBundle, findTemplate } from '../config/s3-loader';
import { sendEmail, mockSendEmail } from '../adapters/email.adapter';
import { sendSms, mockSendSms, makeVoiceCall, mockMakeVoiceCall } from '../adapters/voice.adapter';
import { sendChatMessage, mockSendHttpRequest } from '../adapters/http.adapter';
import { humanSleep } from '../utils/human-delays';
import { showSmartTypingIndicator } from '../utils/typing-indicator';
import { config } from '../config/secrets';

/**
 * Message Builder Worker
 * The Composer - Fetches templates, fills variables, and sends messages
 */
export async function processMessageBuilderJob(job: Job<WorkflowPayload>): Promise<void> {
  const { workflowId, regionCode, selectedChannel, currentDay = 0 } = job.data;

  console.log(`✉️  [Message Builder] Building message for ${workflowId}`);
  console.log(`   Channel: ${selectedChannel}, Day: ${currentDay}, Region: ${regionCode}`);

  // Load config bundle
  const configBundle = await getConfigBundle();

  // Find appropriate template
  const template = findTemplate(configBundle, currentDay, selectedChannel || 'email', regionCode);

  if (!template) {
    console.warn(`⚠️  No template found for day ${currentDay}, channel ${selectedChannel}, region ${regionCode}`);
    // Use a default message
    const defaultMessage = `Follow-up message for workflow ${workflowId}`;
    await sendMessage(selectedChannel || 'email', defaultMessage, job.data);
    return;
  }

  // Fill template variables
  const filledMessage = fillTemplateVariables(template.body, {
    customerName: 'Valued Customer', // Would come from job.data in production
    topic: 'your recent inquiry',
    workflowId,
  });

  // Human-like delay before sending
  await humanSleep(30, 90);

  // Show typing indicator for chat
  if (selectedChannel === 'chat') {
    await showSmartTypingIndicator(filledMessage);
  }

  // Send via appropriate adapter
  await sendMessage(selectedChannel || 'email', filledMessage, job.data, template.subject);

  // Update payload with sent message
  const updatedPayload: WorkflowPayload = {
    ...job.data,
    lastMessageSent: filledMessage,
  };

  // Move to response parser (which will handle follow-ups)
  console.log(`➡️  [Message Builder] Message sent, routing to Response Parser`);
  await responseParserQueue.add('check-response', updatedPayload, {
    delay: 3600000, // Check after 1 hour
  });
}

/**
 * Fill template variables
 */
function fillTemplateVariables(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return filled;
}

/**
 * Send message via appropriate channel
 */
async function sendMessage(
  channel: string,
  message: string,
  payload: WorkflowPayload,
  subject?: string
): Promise<void> {
  const useMock = config.app.nodeEnv === 'development';

  switch (channel) {
    case 'email':
      if (useMock) {
        await mockSendEmail({
          to: 'customer@example.com',
          subject: subject || 'Message',
          body: message,
        });
      } else {
        await sendEmail({
          to: 'customer@example.com', // Would come from payload
          subject: subject || 'Message',
          body: message,
        });
      }
      break;

    case 'voice':
      if (useMock) {
        await mockMakeVoiceCall({ to: '+1234567890', message });
      } else {
        await makeVoiceCall({ to: '+1234567890', message });
      }
      break;

    case 'chat':
      if (useMock) {
        await mockSendHttpRequest({
          url: 'https://chat.example.com/webhook',
          body: { message, workflowId: payload.workflowId },
        });
      } else {
        await sendChatMessage('https://chat.example.com/webhook', message, {
          workflowId: payload.workflowId,
        });
      }
      break;

    default:
      // Default to SMS
      if (useMock) {
        await mockSendSms({ to: '+1234567890', body: message });
      } else {
        await sendSms({ to: '+1234567890', body: message });
      }
  }
}
