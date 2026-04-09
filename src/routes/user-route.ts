import { Elysia, t, type Static } from "elysia";
import { usersService } from "../services/users-service";
import { UnauthorizedError } from "../lib/errors";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const registerSchema = t.Object({
  name: t.String({ maxLength: 255 }),
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 255 })
});

const loginSchema = t.Object({
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ maxLength: 255 })
});

export const userRoute = new Elysia({ prefix: "/api/users" })
  // Public routes
  .post("/", ({ body }) => usersService.registerUser(body as Static<typeof registerSchema>), {
    body: registerSchema
  })
  .post("/login", ({ body }) => usersService.loginUser(body as Static<typeof loginSchema>), {
    body: loginSchema
  })
  // Protected routes
  .guard({
    async beforeHandle({ headers }) {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError();
      }
    }
  })
  .derive({ as: "scoped" }, async ({ headers }) => {
    const authHeader = headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.split(" ")[1] : "";
    
    if (!token) throw new UnauthorizedError();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      ),
    });

    if (!session || !session.userId) {
      throw new UnauthorizedError();
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      throw new UnauthorizedError();
    }

    return {
      user,
      session
    };
  })
  .get("/current", ({ user }) => usersService.getCurrentUser(user))
  .delete("/logout", ({ session }) => usersService.logoutUser(session.id));
