# External Interaction Service API

## Overview

The External Interaction Service provides a generic layer for external systems (like n8n) to interact with the Rajat Task Bot. It accepts any dataset format and automatically processes it into the bot's workflow system.

## Service Location

```
src/services/external-interaction.service.ts
```

## Public Method

```typescript
async processDataset(dataset: any): Promise<{
  action_result: string;   // "SENT", "ENQUEUED", "ESCALATED", "COMPLETED", "FAILED"
  workflow_id: string;
}>
```

## API Endpoints

### 1. Process Dataset (Main Endpoint)

**POST** `/api/external/process`

Send any dataset to be processed by the bot.

**Request Body Examples:**

```json
// Simple format
{
  "workflowId": "wf_123",
  "regionCode": "US",
  "priority": "high",
  "channels": ["email", "chat"]
}

// n8n format (with tierFlags)
{
  "workflowId": "wf_456",
  "regionCode": "EU",
  "tierFlags": {
    "priority": "normal",
    "channels": ["email", "voice"]
  }
}

// Minimal format (auto-detection)
{
  "id": "789",
  "region": "Australia",
  "priority": "high"
}
```

**Response:**

```json
{
  "action_result": "ENQUEUED",
  "workflow_id": "wf_123"
}
```

**Action Results:**
- `ENQUEUED` - Job successfully added to queue
- `SENT` - Message sent immediately
- `ESCALATED` - Workflow escalated
- `COMPLETED` - Workflow completed
- `FAILED` - Processing failed

---

### 2. Get Workflow Status

**GET** `/api/external/status/:workflowId`

Check the current status of a workflow.

**Response:**

```json
{
  "workflow_id": "wf_123",
  "status": "in_progress",
  "currentDay": 2
}
```

---

### 3. Cancel Workflow

**POST** `/api/external/cancel`

Cancel an active workflow.

**Request Body:**

```json
{
  "workflowId": "wf_123"
}
```

**Response:**

```json
{
  "action_result": "COMPLETED",
  "workflow_id": "wf_123"
}
```

---

### 4. Health Check

**GET** `/api/health`

Check if the API server is running.

**Response:**

```json
{
  "status": "healthy",
  "service": "rajat-task-bot",
  "timestamp": "2025-11-22T12:00:00.000Z"
}
```

---

## Configuration

Add to `.env`:

```bash
API_PORT=3000  # Default port for API server
```

---

## Usage from n8n

### HTTP Request Node Configuration

**Method:** POST  
**URL:** `http://localhost:3000/api/external/process`  
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "workflowId": "{{$json.id}}",
  "regionCode": "{{$json.region}}",
  "tierFlags": {
    "priority": "{{$json.priority}}",
    "channels": {{$json.channels}}
  }
}
```

---

## Testing

### Start the bot:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Test the API:
```bash
npx ts-node test-api.ts
```

### Or use curl:

**Process a dataset:**
```bash
curl -X POST http://localhost:3000/api/external/process \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "test-001",
    "regionCode": "US",
    "tierFlags": {
      "priority": "high",
      "channels": ["email"]
    }
  }'
```

**Check health:**
```bash
curl http://localhost:3000/api/health
```

---

## Features

### ✅ Flexible Dataset Format

The service automatically detects and extracts:
- Workflow ID from: `workflowId`, `workflow_id`, or `id`
- Region from: `regionCode`, `region`, or `country`
- Priority from: `tierFlags.priority` or `priority`
- Channels from: `tierFlags.channels` or `channels`

### ✅ Smart Defaults

- Default region: `US`
- Default priority: `normal`
- Default channel: `email`

### ✅ Region Mapping

Automatically maps region names:
- "Australia" → `AU`
- "Europe" → `EU`
- "United States" / "USA" → `US`
- "United Kingdom" → `UK`
- "Canada" → `CA`

### ✅ Validation

- Validates channel types (email, chat, voice)
- Ensures valid region codes
- Generates workflow ID if missing

---

## Example Integration

### Node.js
```javascript
const http = require('http');

const data = JSON.stringify({
  workflowId: 'wf_001',
  regionCode: 'US',
  tierFlags: {
    priority: 'high',
    channels: ['email', 'chat']
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/external/process',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(JSON.parse(body));
  });
});

req.write(data);
req.end();
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:3000/api/external/process',
    json={
        'workflowId': 'wf_001',
        'regionCode': 'US',
        'tierFlags': {
            'priority': 'high',
            'channels': ['email', 'chat']
        }
    }
)

print(response.json())
# Output: {'action_result': 'ENQUEUED', 'workflow_id': 'wf_001'}
```

---

## Architecture

```
External System (n8n)
    ↓
HTTP POST /api/external/process
    ↓
ExternalInteractionService.processDataset()
    ↓
Validates & Transforms Dataset
    ↓
Adds Job to BullMQ Main Queue
    ↓
Returns { action_result, workflow_id }
```

---

## Error Handling

All errors return:

```json
{
  "action_result": "FAILED",
  "workflow_id": "error-1234567890",
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Production Deployment

### Environment Variables
```bash
API_PORT=3000
NODE_ENV=production
```

### PM2 Configuration

The API server starts automatically with the workers when you run:
```bash
npm run pm2:start
```

### Docker

The API is exposed on port 3000 in the Docker container.

---

## Support

For issues or questions, refer to:
- `README.md` - Complete documentation
- `SETUP.md` - Setup guide
- `test-api.ts` - API test examples
