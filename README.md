# Athwart Loop - Internal Product Collaboration Social Network

A lightweight, Discord-style discussion and workflow platform specifically designed for internal product teams. Athwart Loop centralizes ideas, bugs, feature requests, and discussions, making cross-department collaboration seamless and intelligent.

## 🚀 Features

- **Real-Time Collaboration**: Instant notifications, threaded comments, reactions, and `@mentions` powered by Socket.io.
- **Workflows & Departments**: Categorize posts by departments, assign ownership, and track progression through customizable workflow statuses (Backlog -> Todo -> In Progress -> Done).
- **AI Intelligence**: Automated AI-generated workflow summaries using the Grok API, providing concise catch-ups on long threads.
- **SLA & Metric Tracking**: Built-in SLA tracking for posts, calculating time-in-status and identifying bottlenecks in product cycles.
- **Audit Logging**: Comprehensive activity timeline tracking changes to posts, assignments, and statuses.
- **Role-Based Access Control (RBAC)**: Secure access handling with specific department roles (Admin, Founder, Frontend, Backend, DevOps, AI/ML).

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand (State Management), React-Router
- **Backend**: Node.js 18, Express, TypeScript, Prisma ORM, Socket.io
- **Database**: PostgreSQL
- **Caching & Pub/Sub**: In-memory mapping
- **AI Integration**: Grok API

## 📂 Project Structure

```text
athwart-loop/
├── backend/                  # Node.js API Server
│   ├── prisma/               # Database schema and migrations
│   ├── src/
│   │   ├── config/           # Environment and DB config
│   │   ├── controllers/      # Route controllers
│   │   ├── dtos/             # Data Transfer Objects
│   │   ├── middleware/       # Express middlewares (Auth, Error, RBAC)
│   │   ├── routes/           # API routing
│   │   ├── services/         # Business logic (Feed, Intelligence, Socket, Storage)
│   │   ├── socket/           # Real-time WebSocket handlers
│   │   └── validations/      # Validation schemas
│   └── docker-compose.yml    # Local PostgreSQL configuration
│
└── frontend/                 # React Web Client
    ├── src/
    │   ├── api/              # Axios instance and API calls
    │   ├── components/       # Reusable UI components & layouts
    │   ├── lib/              # Socket.io client setup & utils
    │   ├── pages/            # View components (Dashboard, Feed, Auth)
    │   ├── stores/           # Zustand state management
    │   └── types/            # TypeScript interfaces
```

## 🏎️ Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL running locally (or via Docker using the provided `docker-compose.yml`)

```bash
cd backend
cp .env.example .env      # Edit credentials if needed
npm install

# Start local PostgreSQL container (optional)
docker-compose up -d

# Initialize database
npx prisma migrate dev --name init

# Start development server
npm run dev               # http://localhost:4000
```


### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start the Vite development server
npm run dev
```
The frontend should now be running at `http://localhost:5173`.

## ⚙️ Environment Variables

### `backend/.env.example`
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/athwart_loop?schema=public"
JWT_SECRET="super-secret-key"
PORT=4000
GROK_API_KEY="your-grok-api-key"
```

### `frontend/.env.example`
```env
VITE_API_URL=http://localhost:4000/api
```

## 📨 Weekly digest (n8n)

Handbook Section 6 delivers a weekly "you asked, we did it" summary over the existing WhatsApp/email path Athwart already uses. The backend exposes the data; n8n owns the schedule and delivery.

- **Endpoint:** `GET /api/digest/weekly`
- **Auth:** header `X-Digest-Token: $DIGEST_TOKEN` (must match `backend/.env`). When `DIGEST_TOKEN` is unset the endpoint returns 503 — a safe default.
- **Rotation:** treat the token like a credential. Rotate quarterly, keep out of client bundles, log every call server-side.
- **Payload shape:**
  ```json
  {
    "windowStart": "...",
    "windowEnd":   "...",
    "newPosts":    { "total": 12, "top": [ { "postNumber": "LOOP-2026-0042", "commentCount": 8, ... } ] },
    "resolved":    [ { "postNumber": "...", "resolution": "ANSWERED", "resolverFirstName": "Pushkar" } ],
    "awaiting":    { "questions": [...], "ideas": [...] },
    "namedRecognition": { "firstName": "Pushkar", "resolvedCount": 3 }
  }
  ```
- **n8n recipe:** Schedule (Fri 10:00) → HTTP Request (GET with the header) → Format → WhatsApp/Email node. Keep the message tight — the endpoint is intentionally PII-light (first names only).

## 📜 License
MIT
