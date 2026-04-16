# Vibe Coding

A full-stack application featuring a secure REST API backend and a modern React frontend. Built to demonstrate a monorepo structure with a Bun-powered API and a Vite-powered web app.

---

## 🚀 Technology Stack

### Backend (`apps/api`)
- **Runtime:** [Bun](https://bun.sh/)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Key Libraries:** `bcrypt` (password hashing), `postgres` (DB client), `bun:test` (testing)

### Frontend (`apps/web`)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **UI Framework:** [React 19](https://react.dev/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components (powered by Base UI)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **API Client:** [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html) (type-safe, end-to-end)

---

## 🏗️ Architecture & File Structure

This is a **Bun Workspace monorepo** with two applications under the `apps/` directory.

```text
/
├── apps/
│   ├── api/                          // Backend application
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts          // DB connection driver
│   │   │   │   └── schema.ts         // Drizzle table schemas (users, sessions)
│   │   │   ├── lib/
│   │   │   │   └── errors.ts         // Custom error classes
│   │   │   ├── routes/
│   │   │   │   └── user-route.ts     // Elysia routing, middleware, and validation
│   │   │   ├── services/
│   │   │   │   └── users-service.ts  // Business logic layer
│   │   │   └── index.ts              // API entry point
│   │   └── tests/
│   │       └── user.test.ts          // E2E API integration tests
│   │
│   └── web/                          // Frontend application
│       └── src/
│           ├── components/
│           │   ├── ui/               // shadcn/ui primitives (Button, Card, etc.)
│           │   ├── Header.tsx        // App header with profile dropdown & theme toggle
│           │   ├── LoadingScreen.tsx // Full-screen loading spinner
│           │   ├── ErrorFallback.tsx // Error Boundary fallback UI
│           │   ├── ProtectedRoute.tsx    // Route guard for authenticated users
│           │   └── PublicOnlyRoute.tsx   // Route guard for unauthenticated users
│           ├── lib/
│           │   ├── auth.ts           // localStorage token store
│           │   ├── eden.ts           // Type-safe Eden Treaty API client
│           │   ├── schemas.ts        // Zod validation schemas for forms
│           │   └── utils.ts          // Utility functions (cn)
│           ├── pages/
│           │   ├── LoginPage.tsx     // Login form
│           │   ├── RegisterPage.tsx  // Registration form
│           │   ├── DashboardPage.tsx // User profile dashboard
│           │   └── NotFoundPage.tsx  // 404 page
│           ├── providers/
│           │   ├── AuthContext.tsx   // Auth context definition & useAuth hook
│           │   ├── AuthProvider.tsx  // Auth state manager (login, logout, session)
│           │   ├── ThemeContext.tsx  // Theme context definition & useTheme hook
│           │   └── ThemeProvider.tsx // Theme manager (light/dark/system)
│           ├── App.tsx               // Root component, routing, and provider setup
│           └── main.tsx              // Application entry point
├── package.json                      // Root workspace config & scripts
└── bun.lock
```

---

## 💾 Database Schema

1. **`users` Table**: Stores user profiles.
   - `id` *(Serial, PK)*
   - `name` *(Text)*
   - `email` *(Varchar, Unique)*
   - `password` *(Varchar, bcrypt hashed)*
   - `createdAt` *(Timestamp)*

2. **`sessions` Table**: Manages authentication tokens.
   - `id` *(Serial, PK)*
   - `tokenHash` *(Varchar)* — SHA-256 hashed token, never stored in plaintext.
   - `userId` *(Serial, FK → users.id)*
   - `expiresAt` *(Timestamp)* — 7-day expiry.
   - `createdAt` *(Timestamp)*

---

## 🔌 Available API Endpoints

**Base URL:** `http://localhost:9001`

> Protected endpoints require the `Authorization: Bearer <TOKEN>` header.

| Method | Endpoint | Description | Auth |
|:---:|:---|:---|:---:|
| `POST` | `/api/users/` | Register a new user | No |
| `POST` | `/api/users/login` | Log in and receive a session token | No |
| `GET` | `/api/users/current` | Get the currently authenticated user's profile | **Yes** |
| `DELETE` | `/api/users/logout` | Invalidate the current session token | **Yes** |

---

## ⚙️ Setup

### Prerequisites
- [Bun](https://bun.sh/) `>= 1.0`
- A running **PostgreSQL** instance

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mhafidzh3/vibe-coding.git
   cd vibe-coding
   ```

2. **Install all dependencies** (installs for all workspaces at once):
   ```bash
   bun install
   ```

3. **Configure the environment:**
   Duplicate `.env.example` and rename it to `.env` inside `apps/api/`. Update the connection string:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/vibe_db"
   ```

4. **Run database migrations:**
   ```bash
   bun run db:push
   ```
   > Run this from the `apps/api/` directory, or add a root-level script if needed.

---

## 🏃 How to Run

All commands are run from the **project root**.

### Run everything (API + Web) simultaneously:
```bash
bun run dev
```

### Run only the API backend:
```bash
bun run dev:api
```
The API will be available at `http://localhost:9001`.

### Run only the Web frontend:
```bash
bun run dev:web
```
The web app will be available at `http://localhost:9000`.

### Stop and Clean Up Ports
If you encounter "Port already in use" errors or need to shut down the background processes completely:
```bash
bun run stop
```
*Note: This command is Windows-specific and uses PowerShell to clear ports 9000 and 9001.*

> **Note:** The frontend uses a Vite proxy to forward `/api/*` requests to the API server. Both must be running for the full application to work correctly.

---

## 🧪 How to Test

Integration tests run against the API using Bun's built-in test runner.

```bash
bun test
```
> Run from the `apps/api/` directory.

> **Note:** Ensure your `.env` database allows destructive operations, as tests clear and recreate table data in `beforeEach` hooks.

---

## 🌐 Frontend Features

- 🔐 **Authentication**: Register, login, and persistent sessions via `localStorage`.
- 🌗 **Dark/Light/System Theme**: Persistent theme selection across sessions.
- 🛡️ **Route Guards**: Protected and public-only routes prevent unauthorized access.
- 📋 **Form Validation**: Inline validation powered by React Hook Form + Zod.
- 💥 **Error Boundary**: App-level crash protection with a friendly recovery UI.
- 📄 **404 Page**: Proper not-found experience instead of silent redirects.
