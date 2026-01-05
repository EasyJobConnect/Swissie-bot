import { mainQueue } from '../queues/definitions';
import { WorkflowPayload } from '../queues/definitions';

/**
 * External Interaction Service
 * 
 * Generic layer for processing external datasets and triggering workflows.
 * This is the entry point for external systems (like n8n) to interact with the bot.
 */

/**
 * Action result types
 */
export type ActionResult = 
  | 'SENT'        // Message was sent immediately
  | 'ENQUEUED'    // Job was added to queue for processing
  | 'ESCALATED'   // Workflow was escalated
  | 'COMPLETED'   // Workflow completed successfully
  | 'FAILED';     // Workflow failed

/**
 * Process result interface
 */
export interface ProcessResult {
  action_result: ActionResult;
  workflow_id: string;
}

/**
 * External Interaction Service Class
 */
export class ExternalInteractionService {
  /**
   * Process a dataset from external systems (e.g., n8n)
   * 
   * @param dataset - Any dataset containing workflow information
   * @returns ProcessResult with action_result and workflow_id
   */
  async processDataset(dataset: any): Promise<ProcessResult> {
    try {
      console.log('🔄 [External Interaction] Processing dataset:', JSON.stringify(dataset, null, 2));

      // Validate and extract workflow data
      const workflowData = this.validateAndExtractWorkflowData(dataset);

      // Add job to main queue
      const job = await mainQueue.add('external-job', workflowData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      console.log(`✅ [External Interaction] Job enqueued: ${job.id} for workflow: ${workflowData.workflowId}`);

      // Return success result
      return {
        action_result: 'ENQUEUED',
        workflow_id: workflowData.workflowId,
      };
    } catch (error) {
      console.error('❌ [External Interaction] Error processing dataset:', error);

      // Generate fallback workflow ID
      const fallbackWorkflowId = dataset?.workflowId || `error-${Date.now()}`;

      return {
        action_result: 'FAILED',
        workflow_id: fallbackWorkflowId,
      };
    }
  }

  /**
   * Validate and extract workflow data from dataset
   * 
   * @param dataset - Raw dataset from external system
   * @returns Validated WorkflowPayload
   */
  private validateAndExtractWorkflowData(dataset: any): WorkflowPayload {
    // Extract or generate workflow ID
    const workflowId = dataset.workflowId || 
                       dataset.workflow_id || 
                       dataset.id || 
                       `wf_${Date.now()}`;

    // Extract region code
    const regionCode = this.extractRegionCode(dataset);

    // Extract tier flags
    const tierFlags = this.extractTierFlags(dataset);

    // Build workflow payload
    const workflowPayload: WorkflowPayload = {
      workflowId,
      regionCode,
      tierFlags,
      currentDay: dataset.currentDay || 0,
      status: dataset.status || 'pending',
    };

    // Add optional fields if present
    if (dataset.selectedChannel) {
      workflowPayload.selectedChannel = dataset.selectedChannel;
    }
    if (dataset.lastMessageSent) {
      workflowPayload.lastMessageSent = dataset.lastMessageSent;
    }
    if (dataset.customerResponse) {
      workflowPayload.customerResponse = dataset.customerResponse;
    }

    return workflowPayload;
  }

  /**
   * Extract region code from dataset
   */
  private extractRegionCode(dataset: any): 'AU' | 'EU' | 'US' | 'UK' | 'CA' {
    const region = dataset.regionCode || 
                   dataset.region || 
                   dataset.country || 
                   'US';

    // Map common variations to valid regions
    const regionMap: Record<string, 'AU' | 'EU' | 'US' | 'UK' | 'CA'> = {
      'australia': 'AU',
      'europe': 'EU',
      'united states': 'US',
      'usa': 'US',
      'united kingdom': 'UK',
      'canada': 'CA',
    };

    const normalized = region.toString().toUpperCase();
    
    // Check if it's already a valid region code
    if (['AU', 'EU', 'US', 'UK', 'CA'].includes(normalized)) {
      return normalized as 'AU' | 'EU' | 'US' | 'UK' | 'CA';
    }

    // Try to map from full name
    const mapped = regionMap[region.toString().toLowerCase()];
    return mapped || 'US'; // Default to US
  }

  /**
   * Extract tier flags from dataset
   */
  private extractTierFlags(dataset: any): {
    priority: 'high' | 'normal';
    channels: ('email' | 'chat' | 'voice')[];
  } {
    // Extract priority
    const priority = dataset.tierFlags?.priority || 
                     dataset.priority || 
                     'normal';

    // Extract channels
    let channels = dataset.tierFlags?.channels || 
                   dataset.channels || 
                   ['email'];

    // Ensure channels is an array
    if (!Array.isArray(channels)) {
      channels = [channels];
    }

    // Validate channels
    const validChannels: ('email' | 'chat' | 'voice')[] = channels.filter((ch: string) =>
      ['email', 'chat', 'voice'].includes(ch.toLowerCase())
    );

    // Default to email if no valid channels
    if (validChannels.length === 0) {
      validChannels.push('email');
    }

    return {
      priority: priority === 'high' ? 'high' : 'normal',
      channels: validChannels as ('email' | 'chat' | 'voice')[],
    };
  }

  /**
   * Get workflow status (for external queries)
   * 
   * @param workflowId - The workflow ID to check
   * @returns Current status or null if not found
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    status: string;
    currentDay: number;
  } | null> {
    try {
      // In a real implementation, you'd query Redis or a database
      // For now, this is a placeholder
      console.log(`🔍 [External Interaction] Checking status for: ${workflowId}`);
      
      // TODO: Query actual job status from BullMQ
      return null;
    } catch (error) {
      console.error('❌ [External Interaction] Error getting workflow status:', error);
      return null;
    }
  }

  /**
   * Cancel a workflow (for external cancellation requests)
   * 
   * @param workflowId - The workflow ID to cancel
   * @returns Success status
   */
  async cancelWorkflow(workflowId: string): Promise<{
    action_result: ActionResult;
    workflow_id: string;
  }> {
    try {
      console.log(`🛑 [External Interaction] Cancelling workflow: ${workflowId}`);
      
      // TODO: Implement actual job cancellation logic
      
      return {
        action_result: 'COMPLETED',
        workflow_id: workflowId,
      };
    } catch (error) {
      console.error('❌ [External Interaction] Error cancelling workflow:', error);
      return {
        action_result: 'FAILED',
        workflow_id: workflowId,
      };
    }
  }
}

/**
 * Export singleton instance
 */
export const externalInteractionService = new ExternalInteractionService();
