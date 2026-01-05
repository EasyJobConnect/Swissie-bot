# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd /Users/rajatsingh/task-bot
npm install
```

This will install all required packages:
- BullMQ & Redis (queue system)
- TypeScript & ts-node (development)
- Nodemailer (email)
- Twilio (voice/SMS)
- AWS SDK (S3 config loading)
- Axios (HTTP requests)
- PM2 (process management)

## Step 2: Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials. **Minimum required**:
- `REDIS_HOST=localhost`
- `N8N_WEBHOOK_URL=https://your-n8n.com/webhook/completion`
- `ENCRYPTION_KEY=your-32-character-encryption-key-here`

## Step 3: Start Redis

**Option A - Docker (if Docker Desktop is running):**
```bash
docker run -d --name task-bot-redis -p 6379:6379 redis:7-alpine
```

**Option B - Local Redis (Homebrew - Recommended for Mac):**
```bash
# Install if not already installed
brew install redis

# Start Redis
redis-server

# Or run as background service
brew services start redis
```

**Option C - Docker Compose (starts everything):**
```bash
docker-compose up -d
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

## Step 4: Build the Project

```bash
npm run build
```

**Expected output:**
```
> rajat-task-bot@1.0.0 build
> tsc

# Should complete with no errors
```

## Step 5: Run the Bot

**Development mode (Recommended for testing):**
```bash
npm run dev
```

**What you should see:**
```
🚀 Starting Rajat Task Bot...
✅ Redis connected successfully
✅ Environment variables validated
🔄 Worker started for queue: main-queue
🔄 Worker started for queue: controller-queue
... (6 more workers)
✅ All workers initialized successfully!
🎯 Waiting for jobs from n8n...
```

**Production mode:**
```bash
npm run build
npm start
```

**Production with PM2:**
```bash
npm run pm2:start
npm run pm2:logs  # View logs
```

## Step 6: Test It

**Add a test job (open a NEW terminal):**
```bash
cd /Users/rajatsingh/task-bot
npx ts-node test-job.ts
```

**Expected output:**
```
🧪 Adding test job to queue...
📋 Test Payload: { workflowId: "test-123", ... }
✅ Job added successfully!
```

**Watch it execute (in the bot terminal):**

You should see the workflow execute through all stages:
```
📥 [Main Queue] New job received: 1
🧠 [Controller] Processing workflow
🔀 [Channel Selector] Selected channel: email
✉️  [Message Builder] Building message
⏳ Waiting 30-90s (human-like delay)...
📧 [MOCK] Email sent: ...
🔍 [Response Parser] Analyzing response
⏰ [Follow-up Engine] Scheduling next action in 24 hours
✅ Follow-up scheduled for day 1
```

## What Happens Next

1. The test job enters the Main Queue
2. Extended Controller picks it up and routes to Channel Selector
3. Channel Selector chooses a channel (email/voice/chat)
4. Message Builder fetches template and sends message
5. Response Parser waits for customer response
6. Follow-up Engine schedules next action based on day
7. After 7 days or customer response, Completion Webhook fires

## Mock Mode & S3 Config

**Mock Mode:**
By default (`NODE_ENV=development`), all messages are printed to console only - **no actual emails/SMS sent**. This is perfect for testing!

**S3 Configuration:**
If S3 credentials are not configured, the bot automatically falls back to mock templates. You'll see:
```
⚠️  Using mock configuration (S3 not available)
```

This is expected and allows you to test without setting up AWS S3!

**To send real messages in production:**
1. Set `NODE_ENV=production` in `.env`
2. Configure SMTP/Twilio credentials
3. Optionally configure AWS S3 for encrypted templates

## Monitoring

**View queue status in Redis:**
```bash
redis-cli keys "*queue*"
redis-cli LLEN "bull:main-queue:completed"
redis-cli LLEN "bull:main-queue:wait"
```

**View logs:**
```bash
# If using PM2
npm run pm2:logs

# If using npm run dev
# Just watch the console output
```

**Monitor queues (optional):**
```bash
npx bull-board
# Opens a web UI for monitoring BullMQ queues
```

## Troubleshooting

**Docker daemon not running:**
```bash
# Make sure Docker Desktop is running
# Or use local Redis instead: brew install redis && redis-server
```

**Build errors:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Redis connection refused:**
```bash
# Check if Redis is running
redis-cli ping

# Or restart Redis
redis-server
```

**TypeScript errors about unused variables:**
- These have been fixed in the latest code
- Run `npm run build` to verify

## Next Steps

1. ✅ **You're already running!** Test job completed successfully
2. Configure your actual n8n webhook URL (optional)
3. Setup AWS S3 bucket with encrypted templates (optional - mock works fine)
4. Add real customer data to job payloads
5. Configure email/Twilio credentials for production
6. Setup monitoring/alerting

## Success Checklist

- ✅ Redis running (`redis-cli ping` returns PONG)
- ✅ Dependencies installed (`node_modules` folder exists)
- ✅ Project builds (`npm run build` completes)
- ✅ Bot starts (`npm run dev` shows all workers running)
- ✅ Test job processes (see workflow logs in console)
- ✅ Mock messages appear (email/SMS/voice printed to console)

---

**Need help?** Check README.md or QUICK_START.md for more detailed documentation.
