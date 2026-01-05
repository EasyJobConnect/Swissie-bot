# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         n8n Workflow                         │
│                    (Triggers with payload)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Queue (Entry)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Extended Controller Worker 🧠                   │
│          (State Machine: Day 0 → Day 7 Loop)                │
└────────┬───────────────────────────────────────────┬────────┘
         │                                            │
         │ Day < 7                                    │ Day >= 7
         ▼                                            ▼
┌──────────────────────────┐              ┌────────────────────┐
│  Channel Selector 🔀     │              │  Completion 📢     │
│  (Email/Voice/Chat)      │              │  (Webhook to n8n)  │
└──────────┬───────────────┘              └────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Message Builder ✉️       │
│  (Template + Variables)  │
└──────────┬───────────────┘
           │
           ├─────────┬─────────┬─────────┐
           ▼         ▼         ▼         ▼
    ┌─────────┐ ┌───────┐ ┌───────┐ ┌──────┐
    │ Email 📧│ │Voice📞│ │HTTP 🌐│ │SMS📱 │
    └─────────┘ └───────┘ └───────┘ └──────┘
           │         │         │         │
           └─────────┴─────────┴─────────┘
                     │
                     ▼
           ┌────────────────────┐
           │ Human Delays ⏳    │
           │ (30-90s / 6-18h)   │
           └─────────┬──────────┘
                     │
                     ▼
           ┌────────────────────┐
           │ Response Parser 🔍 │
           │ (Keyword Analysis) │
           └─────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │             │
   "yes/ok"      "no/stop"    No Response
        │            │             │
        ▼            ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌────────────┐
  │Success✅ │ │Failure❌ │ │Follow-up⏰│
  └────┬─────┘ └────┬─────┘ └─────┬──────┘
       │            │              │
       │            │              ├─ Day < 4 → Schedule Next Day
       │            │              │
       │            │              └─ Day >= 4 → Escalation 🚨
       │            │
       └────────────┴──────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ Completion Webhook  │
         │ (Back to n8n)       │
         └─────────────────────┘
```

## Worker Responsibilities

### 1. Extended Controller Worker 🧠
- **Role**: The Brain
- **Function**: Main state machine managing 7-day lifecycle
- **Actions**: 
  - Tracks current day (0-7)
  - Routes to appropriate worker based on state
  - Enforces 7-day limit

### 2. Channel Selector Worker 🔀
- **Role**: The Router
- **Function**: Decides communication channel
- **Logic**:
  - Day 0-2: Email first
  - Day 4: Switch to alternative (voice/chat)
  - Day 7: Priority channel or voice
  - Region overrides (e.g., EU prefers email)

### 3. Message Builder Worker ✉️
- **Role**: The Composer
- **Function**: Creates and sends messages
- **Actions**:
  - Loads template from S3 (encrypted)
  - Fills variables (customerName, topic, etc.)
  - Applies human delays (30-90s)
  - Shows typing indicators for chat
  - Routes to appropriate adapter

### 4. Follow-up Engine Worker ⏰
- **Role**: The Scheduler
- **Function**: Manages timing and delays
- **Delays**:
  - Day 1: 24 hours
  - Day 2: 48 hours
  - Day 4: 96 hours
  - Day 7: 168 hours
  - Between: Random 6-18 hours

### 5. Response Parser Worker 🔍
- **Role**: The Analyst
- **Function**: Analyzes customer responses
- **Keywords**:
  - Success: yes, ok, confirmed, done, approved, interested
  - Failure: no, stop, cancel, unsubscribe
  - Ambiguous: Continue workflow

### 6. Escalation Path Worker 🚨
- **Role**: The Backup Plan
- **Function**: Handles stalled workflows
- **Triggers**:
  - Day 4+ with no response
  - High-priority workflows get voice/chat
  - Notifies internal team

### 7. Completion Webhook Worker 📢
- **Role**: The Reporter
- **Function**: Sends final status to n8n
- **Payload**:
  - Status (completed/failed/escalated)
  - Outcome (success/timeout/declined)
  - Metadata (days, has response)

## Data Flow

```
Input (from n8n):
{
  workflowId: "wf_123",
  regionCode: "US",
  tierFlags: {
    priority: "high",
    channels: ["email", "chat", "voice"]
  }
}

↓ (enriched at each step)

Internal State:
{
  ...input,
  currentDay: 2,
  attemptCount: 3,
  selectedChannel: "email",
  lastMessageSent: "Hello customer...",
  customerResponse: "yes",
  status: "completed"
}

↓

Output (to n8n):
{
  workflowId: "wf_123",
  status: "completed",
  completedAt: "2025-11-21T12:00:00Z",
  totalDays: 2,
  outcome: "success",
  metadata: {
    finalDay: 2,
    hasResponse: true
  }
}
```

## Technology Stack

```
Application Layer:
├── Node.js 18+ (Runtime)
├── TypeScript 5.3 (Language)
└── PM2 (Process Manager)

Queue Layer:
├── BullMQ (Queue System)
└── Redis 6+ (Message Broker)

Communication Layer:
├── Nodemailer (Email - SMTP)
├── Twilio (Voice/SMS)
└── Axios (HTTP/Webhooks)

Storage Layer:
├── AWS S3 (Encrypted Config)
└── Redis (State Management)

Security:
├── AES-256 (Encryption)
└── Environment Variables (Secrets)

Infrastructure:
├── Docker (Containerization)
└── Docker Compose (Orchestration)
```

## Fault Tolerance

```
┌─────────────────┐
│   Job Attempt   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Success? │
    └────┬─────┘
         │
    ┌────▼────┐
    │  Fail?  │
    └────┬────┘
         │
    ┌────▼────────┐
    │ Retry (3x)  │
    └────┬────────┘
         │
    ┌────▼─────────┐
    │ Still Fail?  │
    └────┬─────────┘
         │
    ┌────▼──────────┐
    │ Dead Letter Q │
    │ (Manual Fix)  │
    └───────────────┘
```

## Scalability

- **Horizontal**: Add more worker instances
- **Vertical**: Increase Redis memory
- **Queue Priority**: High-priority jobs first
- **Concurrency**: 5 jobs per worker (configurable)
- **Rate Limiting**: Human delays prevent spam

## Security Measures

✅ No hardcoded templates (S3 encrypted)
✅ No customer PII in logs
✅ Environment variable validation
✅ Webhook payload masking
✅ AES-256 encryption
✅ Redis AUTH (optional)
✅ Docker security best practices

---

**This architecture ensures reliability, scalability, and security for enterprise workloads.**
