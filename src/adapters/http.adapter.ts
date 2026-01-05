import axios, { AxiosResponse } from 'axios';

/**
 * HTTP message structure for chat/webhook
 */
export interface HttpMessage {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Send HTTP request
 */
export async function sendHttpRequest(message: HttpMessage): Promise<AxiosResponse> {
  try {
    const method = message.method || 'POST';
    
    console.log(`🌐 Sending ${method} request to: ${message.url}`);
    
    const response = await axios({
      method,
      url: message.url,
      headers: message.headers || {
        'Content-Type': 'application/json',
      },
      data: message.body,
      timeout: 30000,
    });

    console.log(`✅ HTTP request successful: ${response.status}`);
    return response;
  } catch (error) {
    console.error('❌ HTTP request failed:', error);
    throw new Error(`HTTP request failed: ${error}`);
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhook(url: string, payload: any): Promise<void> {
  await sendHttpRequest({
    url,
    method: 'POST',
    body: payload,
  });
}

/**
 * Send chat message (generic HTTP adapter)
 */
export async function sendChatMessage(
  webhookUrl: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await sendHttpRequest({
    url: webhookUrl,
    method: 'POST',
    body: {
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}

/**
 * Mock HTTP request (for testing)
 */
export async function mockSendHttpRequest(message: HttpMessage): Promise<void> {
  console.log('🌐 [MOCK] HTTP request:');
  console.log(`   Method: ${message.method || 'POST'}`);
  console.log(`   URL: ${message.url}`);
  console.log(`   Body:`, JSON.stringify(message.body, null, 2).substring(0, 200));
}
