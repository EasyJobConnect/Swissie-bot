/**
 * Test Script for Rajat Task Bot
 * 
 * This script helps you test the bot by adding sample jobs to the queue.
 * Run with: ts-node test-job.ts
 */

import { mainQueue } from './src/queues/definitions';
import { WorkflowPayload } from './src/queues/definitions';

async function addTestJob() {
  console.log('🧪 Adding test job to queue...\n');

  const testPayload: WorkflowPayload = {
    workflowId: `test-${Date.now()}`,
    regionCode: 'US',
    tierFlags: {
      priority: 'high',
      channels: ['email', 'chat', 'voice'],
    },
  };

  console.log('📋 Test Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('');

  const job = await mainQueue.add('test-workflow', testPayload);

  console.log(`✅ Job added successfully!`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Workflow ID: ${testPayload.workflowId}`);
  console.log('');
  console.log('👀 Watch the logs to see the workflow execute:');
  console.log('   npm run pm2:logs');
  console.log('   or check console if running with npm run dev');
  console.log('');

  // Close the queue connection
  await mainQueue.close();
  process.exit(0);
}

// Run the test
addTestJob().catch((error) => {
  console.error('❌ Error adding test job:', error);
  process.exit(1);
});
