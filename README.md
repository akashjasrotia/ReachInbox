# Full-stack Email Job Scheduler

A production-grade monorepo project that accepts email-send requests via API, schedules them for a specific time using BullMQ (backed by Redis), persists everything in a MySQL database, and sends emails via Ethereal Email.

## Architecture Decisions

### Scheduling and Persistence
- **State Machine & Idempotency**: Each recipient gets an individual `EmailJob` record in the database with a unique ID. The job transitions through `PENDING` -> `QUEUED` -> `PROCESSING` -> `SENT`/`FAILED`.
- **Database Locks**: To prevent double-sends or race conditions when processing jobs concurrently, the worker uses an atomic database update (`UPDATE ... WHERE status = 'QUEUED'`) before processing.
- **Restart Survival (Reconciler)**: On backend startup, a reconciliation script finds any DB rows stuck in `PENDING` or `QUEUED` that do not have an active corresponding BullMQ job, and re-enqueues them with a delay computed from their original `scheduledAt` time.

### Rate Limiting
- **Redis-Backed Counters**: Rate limiting is enforced using Redis keys formatted as `rate_limit:{senderIdentity}:{hour_timestamp}` with an expiry. This ensures that limits are safely applied across multiple worker instances and processes without relying on in-memory Node.js state.
- **Re-Delay Strategy**: When the hourly limit (e.g., `MAX_EMAILS_PER_HOUR`) is exceeded, the worker does not fail the job. Instead, it re-delays the job in BullMQ to the start of the next hour window and reverts its database status back to `QUEUED`. This preserves relative order without blocking the event loop.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL
- Redis

### 1. Environment Variables
Create a `.env` file in the `/backend` folder:
```env
PORT=3001
DATABASE_URL="mysql://root:password@localhost:3306/email_scheduler"
REDIS_URL="redis://localhost:6379"

# BullMQ Config
WORKER_CONCURRENCY=5
MAX_EMAILS_PER_HOUR=100
MIN_DELAY_BETWEEN_EMAILS_MS=0

# Ethereal Email Credentials (optional, defaults provided in code)
ETHEREAL_USER="your_ethereal_user"
ETHEREAL_PASS="your_ethereal_password"
```

Create a `.env.local` file in the `/frontend` folder:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="super_secret_string"
GOOGLE_CLIENT_ID="your_google_oauth_client_id"
GOOGLE_CLIENT_SECRET="your_google_oauth_client_secret"
```

### 2. Database Setup (Backend)
In the `/backend` directory, run:
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Running the Project
Since this is a monorepo, you can start both the backend and frontend simultaneously from the root directory using the workspace scripts.

From the root directory (`/Users/akashjasrotia/Desktop/ReachInbox`), run:
```bash
npm run dev
```

Alternatively, you can run them individually:
**Backend**:
```bash
cd backend
npm run dev
```

**Frontend**:
```bash
cd frontend
npm run dev
```

## Ethereal Email Credentials
Ethereal Email is a fake SMTP service designed for testing. To view the sent emails:
1. Go to [Ethereal Email](https://ethereal.email/) and create a free account.
2. Grab the User and Password from the dashboard.
3. Add them to your `backend/.env` file.
4. When the backend sends an email, the console will output a preview URL where you can view the email in your browser.
