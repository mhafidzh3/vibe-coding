# Vibe Coding

A full-stack application featuring a secure REST API backend and a modern React frontend. Built to demonstrate a monorepo structure with a Bun-powered API and a Vite-powered web app.

---

## 🚀 Technology Stack

### Backend (`apps/api`)
- **Runtime:** [Bun](https://bun.sh/)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Security:** `elysia-rate-limit` (brute-force protection), `bcrypt` (password hashing)
- **Logging:** `pino` (structured JSON logging) + `pino-pretty` (readable dev logs)

### Frontend (`apps/web`)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **UI Framework:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Routing:** [React Router v7](https://reactrouter.com/) (with **Lazy Loading**)
- **UX:** UI Skeletons for perceived performance
- **API Client:** [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html) with **Auto-Refresh Interceptor**

---

## 🏗️ Architecture & File Structure

This is a **Bun Workspace monorepo** with two applications under the `apps/` directory.

```text
/
├── .github/workflows/
│   └── ci.yml                        // GitHub Actions CI Pipeline
├── apps/
│   ├── api/                          // Backend application
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts          // DB connection driver
│   │   │   │   └── schema.ts         // Drizzle table schemas with indexing
│   │   │   ├── lib/
│   │   │   │   ├── errors.ts         // Custom error classes
│   │   │   │   └── logger.ts         // Structured Pino logger
│   │   │   ├── routes/
│   │   │   │   └── user-route.ts     // Rate-limited routing & HttpOnly cookies
│   │   │   ├── services/
│   │   │   │   └── users-service.ts  // Logic for Dual-Token Auth & Rotation
│   │   │   └── index.ts              // API entry point with HTTP logger
│   │   └── tests/
│   │       └── user.test.ts          // Integration tests for Security & Auth
│   │
│   └── web/                          // Frontend application
│       └── src/
│           ├── components/
│           │   ├── ui/               // UI primitives including Skeleton
│           │   ├── DashboardSkeleton.tsx // Structural page wireframe
│           │   ├── ProtectedRoute.tsx    // Auth guard
│           │   └── ...
│           ├── lib/
│           │   └── eden.ts           // Eden Client with 401 transparent-refresh
│           ├── providers/
│           │   ├── AuthProvider.tsx  // Auth state & silent-session-cleanup
│           │   └── ...
│           ├── App.tsx               // Lazy Loading & Suspense setup
│           └── main.tsx              // Application entry point
├── package.json                      // Root scripts for project-wide lint/test
└── bun.lock
```

---

## 🛡️ Security Implementation

This project implements a industrial-grade **Dual-Token Opaque Authentication** system:

1. **Access Token (`auth_token`)**: Short-lived (15 min), stored in `HttpOnly`, `Secure` cookie.
2. **Refresh Token (`refresh_token`)**: Long-lived (7 days), stored in `HttpOnly`, `Secure` cookie.
3. **Session Rotation**: Every token refresh invalidates the previous refresh token and issues a brand-new pair.
4. **Opaque Strategy**: Tokens are high-entropy random strings. Only their **SHA-256 hashes** are stored in the database.
5. **Rate Limiting**: Critical authentication routes are protected by IP-based rate limiting (configurable via `RATE_LIMIT_MAX`).

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:9001`

| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/users/` | Register a new user |
| `POST` | `/api/users/login` | Log in (sets HttpOnly cookies) |
| `POST` | `/api/users/refresh` | Rotate session tokens |
| `GET` | `/api/users/current` | Get current user (needs valid cookie) |
| `DELETE` | `/api/users/logout` | Clear current session & cookies |

---

## ⚙️ Setup

### Prerequisites
- [Bun](https://bun.sh/) `>= 1.2`
- Docker Desktop (for PostgreSQL)

### Steps

1. **Clone & Install:**
   ```bash
   git clone https://github.com/mhafidzh3/vibe-coding.git
   cd vibe-coding
   bun install
   ```

2. **Environment:**
   Duplicate `.env.example` in `apps/api/` and update `DATABASE_URL`.
   Added variables:
   - `RATE_LIMIT_MAX`: Requests per minute (default: 20).

3. **Database:**
   ```bash
   docker-compose up -d  # Start Postgres
   bun run --filter @vibe/api db:push
   ```

4. **Runs:**
   ```bash
   bun run dev         # Run everything
   bun run lint        # Lint whole workspace
   bun run test        # Run E2E Backend tests
   ```

---

## 🌐 UX & Performance Features

- ⚡ **Lazy Loading**: Route-level code splitting reduces initial load time.
- 🖼️ **Skeletons**: Structural placeholders prevent layout shift during page loads.
- 🔄 **Transparent Refresh**: Frontend automatically detects expired access tokens and refreshes them via the HttpOnly refresh token without user interruption.
- 🛑 **Global Interceptor**: If a session is terminally lost, the app dispatches a global event to instantly clear UI state and redirect to login.
