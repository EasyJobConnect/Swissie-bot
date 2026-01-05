# Quick Start & Verification Guide

## 🚀 Step-by-Step Setup & Verification

### Step 1: Install Dependencies

```bash
cd /Users/rajatsingh/task-bot
npm install
```

**Verify:**
```bash
# Should complete without errors
# Check node_modules exists
ls node_modules | grep bullmq
```

---

### Step 2: Setup Environment

```bash
cp .env.example .env
```

**Edit `.env` with minimum required values:**
```bash
# Minimum for testing
REDIS_HOST=localhost
REDIS_PORT=6379
N8N_WEBHOOK_URL=https://webhook.site/your-unique-url
ENCRYPTION_KEY=my-super-secret-32-char-key!!
NODE_ENV=development
```

**Verify:**
```bash
cat .env | grep REDIS_HOST
```

---

### Step 3: Start Redis

**Option A - Docker (Recommended):**
```bash
docker run -d --name task-bot-redis -p 6379:6379 redis:7-alpine
```

**Option B - Docker Compose (Starts Everything):**
```bash
docker-compose up -d redis
```

**Option C - Local Redis:**
```bash
redis-server
```

**Verify Redis is Running:**
```bash
# Test connection
redis-cli ping
# Should return: PONG

# Or check Docker
docker ps | grep redis
```

---

### Step 4: Build the Project

```bash
npm run build
```

**Verify:**
```bash
# Check dist folder was created
ls dist/
# Should see: index.js, config/, queues/, workers/, adapters/, utils/

# Check for errors
echo $?
# Should return: 0
```

---

### Step 5: Start the Bot

**Option A - Development Mode (Recommended for Testing):**
```bash
npm run dev
```

**Option B - Production Mode:**
```bash
npm start
```

**Option C - With PM2:**
```bash
npm run pm2:start
```

**What You Should See:**
```
🚀 Starting Rajat Task Bot...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Redis connected successfully
✅ Environment variables validated

📦 Initializing BullMQ Workers...

🔄 Worker started for queue: main-queue
🔄 Worker started for queue: controller-queue
🔄 Worker started for queue: channel-selector-queue
🔄 Worker started for queue: message-builder-queue
🔄 Worker started for queue: follow-up-queue
🔄 Worker started for queue: response-parser-queue
🔄 Worker started for queue: escalation-queue
🔄 Worker started for queue: completion-queue
📦 All BullMQ queues initialized

✅ All workers initialized successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 System Status:
   • Workers: Running
   • Queues: Ready
   • Waiting for jobs from n8n...
```

**Verify Workers are Running:**

If using PM2:
```bash
pm2 status
# Should show: rajat-task-bot | online

pm2 logs
# Should show the startup logs above
```

---

### Step 6: Test with a Job

**Open a NEW terminal window and run:**
```bash
npx ts-node test-job.ts
```

**What You Should See:**
```
🧪 Adding test job to queue...

📋 Test Payload:
{
  "workflowId": "test-1732204800000",
  "regionCode": "US",
  "tierFlags": {
    "priority": "high",
    "channels": ["email", "chat", "voice"]
  }
}

✅ Job added successfully!
   Job ID: 1
   Workflow ID: test-1732204800000

👀 Watch the logs to see the workflow execute:
   npm run pm2:logs
   or check console if running with npm run dev
```

---

### Step 7: Watch the Execution

**In the bot's terminal (or PM2 logs), you should see:**

```
📥 [Main Queue] New job received: 1
🧠 [Controller] Processing workflow: test-1732204800000 (Day 0)
➡️  [Controller] Routing to Channel Selector (Day 0)
✅ Job 1 completed successfully

🔀 [Channel Selector] Selecting channel for test-1732204800000 (Day 0)
✅ [Channel Selector] Selected channel: email
✅ Job 2 completed successfully

✉️  [Message Builder] Building message for test-1732204800000
   Channel: email, Day: 0, Region: US
⏳ Waiting 45s (human-like delay)...
📧 [MOCK] Email sent:
   To: customer@example.com
   Subject: Initial Contact
   Body: Hello Valued Customer, we are reaching out regarding your recent inquiry...
➡️  [Message Builder] Message sent, routing to Response Parser
✅ Job 3 completed successfully

🔍 [Response Parser] Analyzing response for test-1732204800000 (Day 0)
   No customer response yet
➡️  [Response Parser] Scheduling follow-up for day 1
✅ Job 4 completed successfully

⏰ [Follow-up Engine] Scheduling next action for test-1732204800000
   Current Day: 0, Next Day: 1
⏳ [Follow-up Engine] Scheduling next action in 24 hours
✅ [Follow-up Engine] Follow-up scheduled for day 1
✅ Job 5 completed successfully
```

---

## ✅ Verification Checklist

### System Health Checks

```bash
# 1. Check Redis
redis-cli ping
# Expected: PONG

# 2. Check queues in Redis
redis-cli keys "*queue*"
# Should show multiple queue keys

# 3. Check if workers are processing
redis-cli LLEN "bull:main-queue:wait"
# Should be 0 if jobs are being processed

# 4. Check PM2 status (if using PM2)
pm2 status
# Should show: online

# 5. Check for errors
pm2 logs --err
# Should be empty or minimal

# 6. Check job counts
redis-cli LLEN "bull:main-queue:completed"
# Should show completed job count
```

---

## 🧪 Complete Test Scenarios

### Test 1: Basic Job Flow (Already Done Above)
✅ Job enters system → processes through all workers → completes

### Test 2: Success Response (Simulate Customer Reply)

Create a file `test-success-response.ts`:
```typescript
import { responseParserQueue } from './src/queues/definitions';

async function testSuccessResponse() {
  await responseParserQueue.add('test-success', {
    workflowId: 'test-success-123',
    regionCode: 'US',
    tierFlags: { priority: 'high', channels: ['email'] },
    currentDay: 1,
    customerResponse: 'yes, I am interested',
  });
  
  console.log('✅ Success response test job added');
  await responseParserQueue.close();
}

testSuccessResponse();
```

Run:
```bash
npx ts-node test-success-response.ts
```

**Expected in logs:**
```
✅ [Response Parser] Success keyword detected: "yes, I am interested"
📢 [Completion] Sending webhook for workflow: test-success-123
   Status: completed
   Outcome: success
```

### Test 3: Failure Response

Create `test-failure-response.ts`:
```typescript
import { responseParserQueue } from './src/queues/definitions';

async function testFailureResponse() {
  await responseParserQueue.add('test-failure', {
    workflowId: 'test-failure-123',
    regionCode: 'US',
    tierFlags: { priority: 'high', channels: ['email'] },
    currentDay: 2,
    customerResponse: 'no thanks, stop contacting me',
  });
  
  console.log('✅ Failure response test job added');
  await responseParserQueue.close();
}

testFailureResponse();
```

**Expected in logs:**
```
❌ [Response Parser] Failure keyword detected: "no thanks, stop contacting me"
📢 [Completion] Sending webhook for workflow: test-failure-123
   Status: failed
   Outcome: declined
```

### Test 4: 7-Day Timeout

Create `test-timeout.ts`:
```typescript
import { controllerQueue } from './src/queues/definitions';

async function testTimeout() {
  await controllerQueue.add('test-timeout', {
    workflowId: 'test-timeout-123',
    regionCode: 'US',
    tierFlags: { priority: 'normal', channels: ['email'] },
    currentDay: 7, // Simulate day 7
  });
  
  console.log('✅ Timeout test job added');
  await controllerQueue.close();
}

testTimeout();
```

**Expected in logs:**
```
⏱️  [Controller] 7-day limit reached for test-timeout-123, moving to completion
📢 [Completion] Sending webhook for workflow: test-timeout-123
   Status: failed
   Outcome: timeout
```

---

## 📊 Monitoring Commands

```bash
# View all logs
npm run pm2:logs

# View only errors
pm2 logs --err

# Monitor in real-time
pm2 monit

# Check queue status
redis-cli
> KEYS *queue*
> LLEN bull:main-queue:wait
> LLEN bull:main-queue:completed
> LLEN bull:dead-letter-queue:wait

# Check job details
redis-cli
> HGETALL bull:main-queue:1
```

---

## 🔍 Debug Mode

For more detailed logs, add to `.env`:
```bash
LOG_LEVEL=debug
```

Then restart:
```bash
npm run pm2:restart
```

---

## 🛑 Stop Everything

```bash
# Stop PM2
npm run pm2:stop

# Or if running in dev mode, just Ctrl+C

# Stop Redis (Docker)
docker stop task-bot-redis

# Or stop everything with docker-compose
docker-compose down
```

---

## ✅ Success Criteria

Your bot is working correctly if:

1. ✅ All 8 workers start without errors
2. ✅ Redis shows "PONG" when pinged
3. ✅ Test job completes and flows through all workers
4. ✅ Mock messages appear in logs (email/SMS/voice)
5. ✅ Response parser correctly identifies keywords
6. ✅ Follow-up engine schedules delayed jobs
7. ✅ Completion webhook fires (check webhook.site if you used that)
8. ✅ No errors in PM2 logs or console

---

## 🆘 Common Issues

### Issue: "Cannot find module 'bullmq'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Redis connection refused"
```bash
# Check if Redis is running
docker ps | grep redis

# Or start it
docker start task-bot-redis
```

### Issue: "Environment variables not validated"
```bash
# Check .env file exists
cat .env

# Ensure required vars are set
export REDIS_HOST=localhost
export N8N_WEBHOOK_URL=https://webhook.site/your-url
export ENCRYPTION_KEY=your-32-char-key-here-12345
```

### Issue: Workers not processing jobs
```bash
# Check worker status
pm2 status

# Restart workers
npm run pm2:restart

# Check for blocking issues
redis-cli CLIENT LIST
```

---

## 🎯 Quick Verification Script

Save this as `verify.sh`:
```bash
#!/bin/bash

echo "🔍 Verifying Rajat Task Bot..."
echo ""

# Check Node.js
echo "1. Node.js version:"
node --version

# Check npm packages
echo "2. Checking BullMQ:"
npm list bullmq --depth=0

# Check Redis
echo "3. Redis connection:"
redis-cli ping

# Check build
echo "4. Build output:"
ls dist/ 2>/dev/null && echo "✅ Build exists" || echo "❌ Need to run 'npm run build'"

# Check env
echo "5. Environment file:"
test -f .env && echo "✅ .env exists" || echo "❌ Need to copy .env.example"

# Check PM2
echo "6. PM2 status:"
pm2 status 2>/dev/null || echo "No PM2 processes (use 'npm run dev' instead)"

echo ""
echo "Verification complete!"
```

Run:
```bash
chmod +x verify.sh
./verify.sh
```

---

**You're all set! Follow these steps and your bot will be up and running.** 🚀
