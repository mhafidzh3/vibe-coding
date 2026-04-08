import { Elysia } from "elysia";
import { db } from "./db";
import { userRoute } from "./routes/user-route";
import { users } from "./db/schema";
import { UnauthorizedError, BadRequestError, ConflictError } from "./lib/errors";

const app = new Elysia()
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
        console.error(error);
        set.status = 500;
        return { error: "Internal Server Error" };
    }
  })
  .use(userRoute)
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
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
