# Task 3: Quick Start Testing Guide

## Prerequisites
- Redis running locally (or docker)
- Node.js with npm
- Workspace set up with dependencies installed

---

## 1️⃣ Start Redis

```bash
# Option A: Docker (recommended)
docker run -d -p 6379:6379 redis:latest

# Option B: Local Redis
redis-server

# Verify connection
redis-cli ping
# Expected: PONG
```

---

## 2️⃣ Set Environment Variables

```bash
# Method A: Direct (prefer REDIS_URL)
export REDIS_URL=redis://localhost:6379
export NODE_ENV=development
export ENABLE_WORKERS=true

# Method B: Using .env file
cat > .env << EOF
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
ENABLE_WORKERS=true
N8N_WEBHOOK_URL=http://localhost:8080/webhook
ENCRYPTION_KEY=test-encryption-key-32-chars-long
EOF
```

---

## 3️⃣ Start the Worker

```bash
npm start

# Expected output:
# 🚀 Starting Rajat Task Bot...
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📍 [Startup] Process started at 2025-01-05T10:15:30.123Z
# {
#   "timestamp": "2025-01-05T10:15:30.123Z",
#   "worker": true,
#   "event": "startup",
#   "pid": 12345,
#   "env": "development"
# }
#
# 📋 [Redis] Using REDIS_URL from environment
# ✅ [Redis] Connection ready and authenticated
# ✅ [Redis] Connected successfully
#
# 📦 Initializing BullMQ Workers...
#
# 🔄 [Worker Boot] Worker started
# {
#   "timestamp": "2025-01-05T10:15:31.456Z",
#   "worker": true,
#   "queue": "main-queue",
#   "event": "boot",
#   "pid": 12345,
# }
# ... (repeated for each queue)
#
# ✅ All workers initialized successfully!
```

---

## 4️⃣ Verify Heartbeat (Production Liveness)

```bash
# Worker logs heartbeat every 60 seconds:
# 💓 [Heartbeat] Worker alive
# {
#   "timestamp": "2025-01-05T10:16:31.789Z",
#   "worker": true,
#   "queue": "controller-queue",
#   "event": "heartbeat",
#   "pid": 12345
# }
```

---

## 5️⃣ Test Retry Behavior (Forced Failure)

### Option A: Manually via Redis CLI

```bash
redis-cli

# Add a job to fail
> lpush bull:controller-queue:wait '{"test":"will-fail"}'

# Worker logs should show:
# 🔄 [Retry] Job will be retried
# {
#   "timestamp": "2025-01-05T10:20:00.000Z",
#   "env": "development",
#   "worker": true,
#   "job_id": "opaque-uuid-1",
#   "queue": "controller-queue",
#   "attempt": 1,
#   "max_attempts": 3,
#   "status": "retry",
#   "reason": "Error message..."
# }
```

### Option B: Via HTTP API (if running)

```bash
# Send a job that will fail
curl -X POST http://localhost:3000/api/jobs/test \
  -H "Content-Type: application/json" \
  -d '{"force_failure": true}'
```

---

## 6️⃣ Watch for DLQ Transition

After 3 retries fail, watch for:

```bash
# Console output:
# ⚠️  [DLQ] Job moved to Dead Letter Queue
# {
#   "timestamp": "2025-01-05T10:22:00.000Z",
#   "env": "development",
#   "worker": true,
#   "job_id": "opaque-uuid-1",
#   "queue": "controller-queue",
#   "total_attempts": 3,
#   "status": "dlq",
#   "event": "moved_to_dlq"
# }

# Verify in Redis DLQ queue:
redis-cli
> lrange bull:dead-letter-queue:default 0 -1
```

---

## 7️⃣ Test Completion Webhook (Opaque Dispatch)

```bash
# Send a successful job:
curl -X POST http://localhost:3000/api/jobs/complete \
  -H "Content-Type: application/json" \
  -d '{"workflowId": "test-123", "status": "completed"}'

# Watch for opaque webhook dispatch (no payload inspection):
# ✅ [Completion] Webhook dispatched successfully
# {
#   "timestamp": "2025-01-05T10:30:01.000Z",
#   "worker": true,
#   "job_id": "opaque-uuid-2",
#   "queue": "completion-queue",
#   "event": "webhook_dispatched",
#   "status": "completed"
# }
# Note: No payload fields logged!
```

---

## 8️⃣ Verify Redis Connection Failure Handling

```bash
# Stop Redis while worker is running:
redis-cli shutdown

# Worker logs should show:
# ❌ [Redis] Connection error
# ❌ [Redis] FATAL: Redis disconnected. Terminating worker process.

# Check exit code:
echo $?  # Should be 1
```

---

## 9️⃣ Verify Missing Env Configuration

```bash
# Unset REDIS_URL:
unset REDIS_URL
unset REDIS_HOST

# Start worker:
npm start

# Expected error:
# ❌ Environment validation failed: Error: Redis configuration error:
# Either REDIS_URL or REDIS_HOST must be set.
# ❌ [Startup] Terminating: Missing required environment variables

# Exit code: 1
```

---

## 🔟 Monitor Logs for Observability

### Filter for worker-related logs:
```bash
npm start 2>&1 | grep '"worker": true'
```

### Check retry attempts:
```bash
npm start 2>&1 | grep '"status": "retry"'
```

### Monitor DLQ transitions:
```bash
npm start 2>&1 | grep '"status": "dlq"'
```

### Verify opaque behavior (no payload fields):
```bash
npm start 2>&1 | grep 'workflowId'
# Should NOT find any - jobs are opaque!
```

---

## 📊 Success Criteria

| Test | Expected Behavior | ✓ |
|------|-------------------|---|
| **Worker Boots** | Startup logs with timestamp + PID | - |
| **Heartbeat** | Log every 60s confirming liveness | - |
| **Retry** | Attempt logged with counter (1/3, 2/3, 3/3) | - |
| **DLQ** | Moved to DLQ after max retries | - |
| **Webhook** | Dispatch logged without payload inspection | - |
| **Opaque** | No workflowId or semantic fields logged | - |
| **Fail-Fast** | Exit code 1 on Redis disconnect | - |
| **Env-Only** | Redis configured from env, not code | - |

---

## 🐛 Debugging

### Worker not starting?
```bash
# Check Redis connection:
redis-cli ping

# Check environment:
echo $REDIS_URL
echo $REDIS_HOST
```

### Not seeing heartbeat?
```bash
# Heartbeat is every 60 seconds, can be modified in:
# src/queues/job-processor.ts > startWorkerHeartbeat()
```

### Job not failing as expected?
```bash
# Check queue name in logs matches expected queue
# Check error is thrown in processor function
```

### Logs hard to read?
```bash
# Pretty-print JSON:
npm start 2>&1 | jq '.' | grep -A 10 '"status": "retry"'
```

---

## ✅ Checklist

- [ ] Redis running
- [ ] REDIS_URL or REDIS_HOST set
- [ ] Worker starts successfully
- [ ] Heartbeat visible every 60s
- [ ] Retry logging shows attempt counters
- [ ] DLQ transition logged after max retries
- [ ] Completion webhook logged opaquely
- [ ] No workflowId or semantic fields in logs
- [ ] Disconnect causes exit code 1
- [ ] Missing env causes validation failure

**Status:** All checks pass? ✅ Task 3 implementation verified!
