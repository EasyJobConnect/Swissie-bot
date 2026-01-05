import { Queue } from 'bullmq';
import { redisConnection } from './connection';

/**
 * Job Data Structures
 */
export interface WorkflowPayload {
  workflowId: string;
  regionCode: 'AU' | 'EU' | 'US' | 'UK' | 'CA';
  tierFlags: {
    priority: 'high' | 'normal';
    channels: ('email' | 'chat' | 'voice')[];
  };
  attemptCount?: number;
  currentDay?: number;
  selectedChannel?: string;
  lastMessageSent?: string;
  customerResponse?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'escalated';
}

/**
 * Queue Names
 */
export enum QueueName {
  MAIN = 'main-queue',
  CONTROLLER = 'controller-queue',
  CHANNEL_SELECTOR = 'channel-selector-queue',
  MESSAGE_BUILDER = 'message-builder-queue',
  FOLLOW_UP = 'follow-up-queue',
  RESPONSE_PARSER = 'response-parser-queue',
  ESCALATION = 'escalation-queue',
  COMPLETION = 'completion-queue',
  DLQ = 'dead-letter-queue',
}

/**
 * Main Queue - Entry point from n8n
 */
export const mainQueue = new Queue<WorkflowPayload>(QueueName.MAIN, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Controller Queue - Main state machine
 */
export const controllerQueue = new Queue<WorkflowPayload>(QueueName.CONTROLLER, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Channel Selector Queue
 */
export const channelSelectorQueue = new Queue<WorkflowPayload>(QueueName.CHANNEL_SELECTOR, {
  connection: redisConnection,
});

/**
 * Message Builder Queue
 */
export const messageBuilderQueue = new Queue<WorkflowPayload>(QueueName.MESSAGE_BUILDER, {
  connection: redisConnection,
});

/**
 * Follow-up Engine Queue - Handles delayed jobs
 */
export const followUpQueue = new Queue<WorkflowPayload>(QueueName.FOLLOW_UP, {
  connection: redisConnection,
});

/**
 * Response Parser Queue
 */
export const responseParserQueue = new Queue<WorkflowPayload>(QueueName.RESPONSE_PARSER, {
  connection: redisConnection,
});

/**
 * Escalation Queue
 */
export const escalationQueue = new Queue<WorkflowPayload>(QueueName.ESCALATION, {
  connection: redisConnection,
});

/**
 * Completion Webhook Queue
 */
export const completionQueue = new Queue<WorkflowPayload>(QueueName.COMPLETION, {
  connection: redisConnection,
});

/**
 * Dead Letter Queue - For failed jobs
 */
export const deadLetterQueue = new Queue<WorkflowPayload>(QueueName.DLQ, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

console.log('📦 All BullMQ queues initialized');
