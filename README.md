# Vibe Coding - Secure User Authenticated API

A secure, highly-performant backend REST API built with Bun, Elysia, and Drizzle ORM. The application is designed to manage user registrations, authenticate profiles, and securely manage access sessions utilizing token hashing and expiration limits.

## 🚀 Technology Stack

- **Runtime Environment:** [Bun](https://bun.sh/)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **ORM (Object Relational Mapping):** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL

### Key Libraries
- `elysia` — For fast, declarative routing and runtime type validation.
- `drizzle-orm` / `drizzle-kit` — For strictly typed database schema generation and interactions.
- `bcrypt` — For securely hashing and verifying passwords.
- `postgres` — PostgreSQL client for Node/Bun.
- `bun:test` — Built-in, ultra-fast test runner handling the API integration tests.

---

## 🏗️ Architecture & File Structure

The codebase is organized into layered conceptual boundaries handling routing, business logic execution, and database definitions:

```text
/
├── src/
│   ├── db/
│   │   ├── index.ts           // Driver initialization and DB connection
│   │   └── schema.ts          // Core mapping of tables (users, sessions) and relations
│   ├── lib/
│   │   └── errors.ts          // Standardized custom Error classes (e.g. UnauthorizedError)
│   ├── routes/
│   │   └── user-route.ts      // Elysia routing, authentication middleware, and validation schemas
│   ├── services/
│   │   └── users-service.ts   // Business logic layer executing database actions
│   └── index.ts               // Application entry point configuring global error handling
├── tests/
│   └── user.test.ts           // Integrated E2E application testing specifications
├── drizzle/                   // Persistent storage of SQL migration snapshots
├── package.json
└── tsconfig.json
```

---

## 💾 Database Schema

The database relies on establishing relation-mapped tables optimizing lookup queries:

1. **`users` Table**: Stores authenticated profiles.
   - `id` *(Serial, PK)*
   - `name` *(Text)*
   - `email` *(Varchar, Unique Limit)*
   - `password` *(Varchar, Hashed via Bcrypt)*
   - `createdAt` *(Timestamp)*

2. **`sessions` Table**: Manages authorized tokens correlating to users.
   - `id` *(Serial, PK)*
   - `tokenHash` *(Varchar)* — Storing SHA-256 tokens rather than plaintext.
   - `userId` *(Serial, FK references users.id)*
   - `expiresAt` *(Timestamp)* — Defined lifespan (7 Days configuration limit).
   - `createdAt` *(Timestamp)*

---

## 🔌 Available API

The following RESTful endpoints are exposed by the server. 
**Note:** Protected endpoints require supplying the `Authorization` header utilizing the Bearer format (`Bearer <YOUR_TOKEN>`).

| HTTP Method | Endpoint | Description | Auth Required |
|:---:|:---|:---|:---:|
| `POST` | `/api/users/` | Registers a new user. Returns `{ data: "OK" }` | No |
| `POST` | `/api/users/login` | Logins and creates an active session. Returns token. | No |
| `GET` | `/api/users/current` | Retrieves the profile data for the authenticated account. | **Yes** |
| `DELETE` | `/api/users/logout` | Terminates the current active session token for the user. | **Yes** |

*(There are also diagnostic routes available at `/` and `/users`.)*

---

## ⚙️ How to Setup the Project

1. **Clone the repository** to your local machine.
2. **Install all package dependencies** utilizing Bun's fast installer:
   ```bash
   bun install
   ```
3. **Configure the Environment**:
   Duplicate the `.env.example` file and rename it directly to `.env`. Update the `DATABASE_URL` entry matching your local PostgreSQL instance:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/vibe_db"
   ```
4. **Push Database Migrations**:
   Synchronize your configured empty database with the Drizzle schema directly:
   ```bash
   bun run db:push
   ```

---

## 🏃🏿‍♂️ How to Run the Application

Execute the Bun development server which utilizes Hot Module Reloading (HMR) to watch for file changes automatically:

```bash
bun run dev
```
You will receive console feedback indicating `🦊 Elysia is running at localhost:3000`.

---

## 🧪 How to Test the Application

System-level behavior validation integrates deeply into Elysia's `app.handle` mock environments. The integration specifications verify registration limits, validation, standard token logic, and strict expiration rules.

Execute the integrated test runner:

```bash
bun test
```

*Note: Ensure your targeted `.env` database instance allows deletion actions as the tests will destruct table objects repeatedly through the `beforeEach` hook setups.*
