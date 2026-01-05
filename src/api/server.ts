import http from 'http';
import { externalInteractionService } from '../services/external-interaction.service';

/**
 * Simple HTTP Server for External Interaction API
 * 
 * Lightweight server without Express - uses Node.js built-in http module
 */

const PORT = parseInt(process.env.API_PORT || '3000', 10);

/**
 * Parse JSON body from request
 */
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Create HTTP server
 */
export function createApiServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || '';
    const method = req.method || '';

    try {
      // POST /api/external/process
      if (method === 'POST' && url === '/api/external/process') {
        const dataset = await parseBody(req);
        console.log('📨 [API] Received dataset:', JSON.stringify(dataset, null, 2));

        const result = await externalInteractionService.processDataset(dataset);
        sendJson(res, 200, result);
        return;
      }

      // GET /api/external/status/:workflowId
      if (method === 'GET' && url.startsWith('/api/external/status/')) {
        const workflowId = url.split('/').pop() || '';
        const status = await externalInteractionService.getWorkflowStatus(workflowId);

        if (!status) {
          sendJson(res, 404, {
            error: 'Workflow not found',
            workflow_id: workflowId,
          });
          return;
        }

        sendJson(res, 200, {
          workflow_id: workflowId,
          ...status,
        });
        return;
      }

      // POST /api/external/cancel
      if (method === 'POST' && url === '/api/external/cancel') {
        const body = await parseBody(req);
        const { workflowId } = body;

        if (!workflowId) {
          sendJson(res, 400, { error: 'workflowId is required' });
          return;
        }

        const result = await externalInteractionService.cancelWorkflow(workflowId);
        sendJson(res, 200, result);
        return;
      }

      // GET /api/health
      if (method === 'GET' && url === '/api/health') {
        sendJson(res, 200, {
          status: 'healthy',
          service: 'rajat-task-bot',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 404 Not Found
      sendJson(res, 404, {
        error: 'Not Found',
        path: url,
      });
    } catch (error) {
      console.error('❌ [API] Error handling request:', error);
      sendJson(res, 500, {
        action_result: 'FAILED',
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  return server;
}

/**
 * Start API server
 */
export function startApiServer(): void {
  const server = createApiServer();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 API Server running on port ${PORT}`);
    console.log(`   POST http://localhost:${PORT}/api/external/process`);
    console.log(`   GET  http://localhost:${PORT}/api/external/status/:workflowId`);
    console.log(`   POST http://localhost:${PORT}/api/external/cancel`);
    console.log(`   GET  http://localhost:${PORT}/api/health\n`);
  });

  server.on('error', (error) => {
    console.error('❌ API Server error:', error);
    process.exit(1);
  });
}
