/**
 * Test script for External Interaction API
 * 
 * This demonstrates how external systems (like n8n) can send data to the bot
 */

const http = require('http');

const API_URL = 'http://localhost:3000';

/**
 * Make HTTP request
 */
function makeRequest(method: string, path: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test the external interaction API
 */
async function testExternalApi() {
  console.log('🧪 Testing External Interaction API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const health = await makeRequest('GET', '/api/health');
    console.log('✅ Health:', health);
    console.log('');

    // Test 2: Process dataset (simple format)
    console.log('2️⃣  Testing process endpoint (simple format)...');
    const result1 = await makeRequest('POST', '/api/external/process', {
      workflowId: 'test-api-001',
      regionCode: 'US',
      priority: 'high',
      channels: ['email', 'chat'],
    });
    console.log('✅ Result:', result1);
    console.log('');

    // Test 3: Process dataset (n8n format with nested tierFlags)
    console.log('3️⃣  Testing process endpoint (n8n format)...');
    const result2 = await makeRequest('POST', '/api/external/process', {
      workflowId: 'test-api-002',
      regionCode: 'EU',
      tierFlags: {
        priority: 'normal',
        channels: ['email', 'voice'],
      },
    });
    console.log('✅ Result:', result2);
    console.log('');

    // Test 4: Process dataset (minimal data - auto-detection)
    console.log('4️⃣  Testing process endpoint (auto-detection)...');
    const result3 = await makeRequest('POST', '/api/external/process', {
      id: 'auto-123',
      region: 'Australia',
      priority: 'high',
    });
    console.log('✅ Result:', result3);
    console.log('');

    // Test 5: Get workflow status
    console.log('5️⃣  Testing status endpoint...');
    const status = await makeRequest('GET', `/api/external/status/${result1.workflow_id}`);
    console.log('✅ Status:', status);
    console.log('');

    // Test 6: Cancel workflow
    console.log('6️⃣  Testing cancel endpoint...');
    const cancelResult = await makeRequest('POST', '/api/external/cancel', {
      workflowId: result1.workflow_id,
    });
    console.log('✅ Cancel result:', cancelResult);
    console.log('');

    console.log('🎉 All API tests completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Workflow 1: ${result1.workflow_id} - ${result1.action_result}`);
    console.log(`   • Workflow 2: ${result2.workflow_id} - ${result2.action_result}`);
    console.log(`   • Workflow 3: ${result3.workflow_id} - ${result3.action_result}`);
  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

// Run tests
testExternalApi().catch(console.error);
