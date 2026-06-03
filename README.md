# 💡 IdeaHub (formerly Product Collab Network)

A modern, highly-interactive internal social network and collaboration platform built for cross-functional product teams. IdeaHub centralizes product discussions, bug tracking, feature requests, and workflow management into a unified, Discord-style interface.

---

## ✨ Key Features

- **Dynamic Feed & Filtering:** Real-time feed for ideas, bugs, discussions, and feature requests. Filter by department, status, category, or priority.
- **Role-Based Access Control (RBAC):** Dedicated roles (Admin, Founder, Frontend, Backend, DevOps, AI/ML) that determine view/edit permissions and assignment capabilities.
- **Workflow & SLA Tracking:** Deep metrics on task statuses (`BACKLOG` to `DONE`), time spent in each stage, and SLA violation alerts.
- **Real-time Notifications:** WebSockets provide instant updates for mentions (`@username`), post updates, assignments, and comment replies.
- **AI-Powered Summarization:** BullMQ background workers leverage AI to automatically summarize lengthy comment threads and provide quick TL;DRs for unread posts.
- **Mentions & Rich Text:** Full markdown support in posts and comments, along with dynamic user mentioning.

---

## 🛠 Tech Stack

### Frontend (Hosted on Vercel)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **State Management:** Zustand
- **Routing:** React Router v6
- **Data Fetching & APIs:** Axios

### Backend (Hosted on Render)
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (REST API)
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Caching & Message Broker:** Redis (for BullMQ & WebSockets)
- **Realtime:** Socket.io
- **Job Queues:** BullMQ

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (running locally)
- [Redis](https://redis.io/) (running locally)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL and Redis credentials

# Push the schema to the database (and run seeds if any)
npx prisma db push

# Start the development server
npm run dev
```
The backend should now be running at `http://localhost:4000`.

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

---

## 🌍 Production Deployment Guide

IdeaHub is designed to be deployed across modern PaaS providers.

### Database & Redis (Render)
1. Provision a **PostgreSQL** instance on Render.
2. Provision a **Key Value (Redis)** instance on Render. 
3. *Note:* If connecting from an external service, make sure to add `0.0.0.0/0` to the IP Allowlist in the Redis Networking settings.

### Backend (Render Web Service)
1. Create a new Web Service on Render pointing to the `backend/` directory.
2. Set the start command to `npm run build && npm run start`.
3. Configure the Environment Variables:
   - `DATABASE_URL`: Your Render PostgreSQL External/Internal URL
   - `REDIS_URL`: Your Render Key Value `rediss://...` URL
   - `JWT_SECRET`: A secure random string
   - `PORT`: `4000`

### Frontend (Vercel)
1. Create a new Project on Vercel pointing to the `frontend/` directory.
2. Vercel will automatically detect the Vite setup.
3. Configure the Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://ideahub-api.onrender.com/api`)
4. *Note:* The included `vercel.json` automatically handles SPA routing (redirecting page refreshes to `index.html`).

---

## 🔒 Environment Variables Reference

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ideahub"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key"
PORT=4000
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:4000/api"
```

---

## 📄 License
MIT License
