import { Elysia } from "elysia";
import { db } from "./db";
import { userRoute } from "./routes/user-route";
import { users } from "./db/schema";

const app = new Elysia()
  .use(userRoute)
  .get("/", () => ({
    status: "ok",
    message: "Bun + Elysia + Drizzle is running!",
  }))
  .get("/users", async () => {
    // This will error if DB is not connected, but it's for demonstration
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
