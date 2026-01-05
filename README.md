# Task Bot

Enterprise-grade 7-day multi-channel support resolution bot built with Node.js, TypeScript, BullMQ, and Redis.

## 🎯 Overview

This bot manages a 7-day customer engagement lifecycle. It receives jobs from n8n, attempts to resolve queries via Email/Voice/Chat over 7 days, and reports final status back via webhook.

### Key Features

- **Multi-Channel Communication**: Email, Voice (Twilio), and HTTP/Chat
- **State Machine Architecture**: 7 specialized workers handling different aspects
- **Human-like Behavior**: Random delays (30-90s), typing indicators, 6-18h follow-ups
- **Enterprise Security**: Encrypted templates loaded from S3, no hardcoded content
- **Fault Tolerance**: BullMQ with Redis, automatic retries, dead letter queue
- **Production Ready**: Docker, PM2, graceful shutdown, comprehensive logging

## 📁 Project Structure

```
├── Dockerfile
├── pm2.config.js
├── package.json
├── tsconfig.json
├── .env.example
└── src
    ├── index.ts                        # Entry point
    ├── /config
    │   ├── s3-loader.ts                # S3 config loader with encryption
    │   └── secrets.ts                  # Environment validation
    ├── /queues
    │   ├── connection.ts               # Redis connection
    │   ├── definitions.ts              # Queue definitions
    │   └── job-processor.ts            # Worker routing
    ├── /workers
    │   ├── extended-controller.worker.ts   # Main state machine
    │   ├── channel-selector.worker.ts      # Channel routing
    │   ├── message-builder.worker.ts       # Template processing
    │   ├── follow-up-engine.worker.ts      # Delay scheduler
    │   ├── response-parser.worker.ts       # Response analysis
    │   ├── escalation-path.worker.ts       # Escalation handler
    │   └── completion-webhook.worker.ts    # Final reporting
    ├── /adapters
    │   ├── email.adapter.ts            # Email (Nodemailer)
    │   ├── voice.adapter.ts            # Voice/SMS (Twilio)
    │   └── http.adapter.ts             # HTTP/Chat/Webhooks
    └── /utils
        ├── human-delays.ts             # Random delays
        ├── typing-indicator.ts         # Chat typing simulation
        └── encryption.ts               # AES-256 encryption
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Redis 6.x or higher
- Docker (optional)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start Redis** (if not already running):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run in development:**
   ```bash
   npm run dev
   ```

6. **Run in production:**
   ```bash
   npm start
   # Or with PM2:
   npm run pm2:start
   ```

### Docker Setup

```bash
# Build image
docker build -t rajat-task-bot .

# Run with docker-compose
docker-compose up -d
```

## 📊 Worker Flow

```
n8n → Main Queue
  ↓
Extended Controller (State Machine)
  ↓
Channel Selector (Email/Voice/Chat)
  ↓
Message Builder (Template + Variables)
  ↓
Adapter (Send via Email/Voice/HTTP)
  ↓
Response Parser (Keyword Analysis)
  ↓
├─→ Success → Completion Webhook
├─→ Failure → Completion Webhook
├─→ No Response → Follow-up Engine → (Delay 6-18h) → Controller
└─→ Day 4+ No Response → Escalation Path
```

## 📥 Input Payload (from n8n)

```json
{
  "workflowId": "wf_123456789",
  "regionCode": "AU" | "EU" | "US" | "UK" | "CA",
  "tierFlags": {
    "priority": "high" | "normal",
    "channels": ["email", "chat", "voice"]
  }
}
```

## 📤 Output Webhook (to n8n)

```json
{
  "workflowId": "wf_123456789",
  "status": "completed" | "failed" | "escalated",
  "completedAt": "2025-11-21T12:00:00Z",
  "totalDays": 3,
  "outcome": "success" | "timeout" | "declined" | "unknown",
  "metadata": {
    "finalDay": 3,
    "hasResponse": true
  }
}
```

## 🔑 Environment Variables

See `.env.example` for all required variables. Key ones:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# S3 (for encrypted templates)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=task-bot-configs

# Encryption
ENCRYPTION_KEY=your-32-char-key

# Webhook
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/completion

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password

# Twilio (Voice/SMS)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🧪 Testing

### Mock Mode (Development)

When `NODE_ENV=development`, all adapters use mock implementations (console.log only).

### Test Job

Add a test job to Redis:

```typescript
// Using BullMQ Board or Redis CLI
await mainQueue.add('test-job', {
  workflowId: 'test-123',
  regionCode: 'US',
  tierFlags: {
    priority: 'high',
    channels: ['email']
  }
});
```

## 📋 Success/Failure Keywords

**Success** (triggers completion):
- yes, ok, confirmed, done, approved, interested

**Failure** (triggers completion with failure):
- no, stop, cancel, unsubscribe

## ⏰ Timing Logic

- **Initial message**: 30-90 seconds delay
- **Day 1 follow-up**: 24 hours
- **Day 2 follow-up**: 48 hours  
- **Day 4 follow-up**: 96 hours (switches channel)
- **Day 7 final**: 168 hours (last attempt)
- **Between follow-ups**: Random 6-18 hours

## 🔒 Security Features

- ✅ No hardcoded templates (loaded from S3)
- ✅ AES-256 encryption for sensitive config
- ✅ Environment variable validation
- ✅ Masked data in webhooks
- ✅ No customer PII in logs

## 🛠️ PM2 Commands

```bash
npm run pm2:start    # Start with PM2
npm run pm2:stop     # Stop all processes
npm run pm2:restart  # Restart all
npm run pm2:logs     # View logs
```

## 📊 Monitoring

- **Queue Status**: Use BullMQ Board or Redis CLI
- **Logs**: PM2 logs or Docker logs
- **Dead Letter Queue**: Check `dead-letter-queue` in Redis

## 🐛 Troubleshooting

**Workers not processing jobs:**
- Check Redis connection
- Verify environment variables
- Check PM2 logs: `npm run pm2:logs`

**No messages sent:**
- Verify adapter credentials (SMTP, Twilio)
- Check `NODE_ENV` (development = mock mode)
- Review worker logs

**S3 config not loading:**
- Verify AWS credentials
- Check bucket/key names
- System falls back to mock config in development

## 🤝 Contributing

This is an enterprise project. Contact the team lead before making changes.

## 📄 License

MIT

---

**Built with ❤️ for enterprise-grade automation**
