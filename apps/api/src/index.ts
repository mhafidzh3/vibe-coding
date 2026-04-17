import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { userRoute } from "./routes/user-route";
import { users } from "./db/schema";
import { UnauthorizedError, BadRequestError, ConflictError } from "./lib/errors";
import { logger } from "./lib/logger";

export const app = new Elysia()
  .use(cors())
  // Structured logging middleware
  .onBeforeHandle(({ request }) => {
    (request as any).startTime = Date.now();
  })
  .onAfterHandle(({ request, set }) => {
    const start = (request as any).startTime || Date.now();
    const duration = Date.now() - start;
    const url = new URL(request.url);
    
    logger.info({
      method: request.method,
      path: url.pathname,
      status: set.status,
      duration: `${duration}ms`,
    }, `HTTP ${request.method} ${url.pathname}`);
  })
  .use(swagger({
    documentation: {
      info: {
        title: "Vibe Coding API",
        version: "1.0.0",
        description: "Secure, performant User Authentication API with session management."
      }
    }
  }))
  .error({
    UNAUTHORIZED: UnauthorizedError,
    BAD_REQUEST: BadRequestError,
    CONFLICT: ConflictError,
  })
  .onError(({ code, error, set }) => {
    switch (code) {
      case "UNAUTHORIZED":
        set.status = 401;
        return { error: error.message };
      case "BAD_REQUEST":
      case "CONFLICT":
        set.status = 400;
        return { error: error.message };
      case "VALIDATION":
        set.status = 400;
        return { 
          error: "Validation failed", 
          details: error.all.map(err => ({
            field: err.path.slice(1) || "root",
            message: err.message
          }))
        };
      case "NOT_FOUND":
        set.status = 404;
        return { error: "Not Found" };
      default:
        logger.error({ error }, "Unhandled server error");
        set.status = 500;
        return { error: "Internal Server Error" };
    }
  })
  .get("/", () => ({
    status: "ok",
    message: "Bun + Elysia + Drizzle is running!",
  }))
  .get("/users", async () => {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error) {
      return { error: "Database connection failed or not configured yet." };
    }
  })
  .use(userRoute);


if (import.meta.main) {
  app.listen({ port: 9001, hostname: "0.0.0.0" });
  logger.info(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}

export type App = typeof app;
