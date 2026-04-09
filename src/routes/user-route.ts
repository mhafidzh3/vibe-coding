import { Elysia, t, type Static } from "elysia";
import { usersService } from "../services/users-service";
import { UnauthorizedError } from "../lib/errors";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

/**
 * Registration request body validation schema.
 * Enforces email format and password length.
 */
const registerSchema = t.Object({
  name: t.String({ maxLength: 255 }),
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 255 })
});

/**
 * Login request body validation schema.
 */
const loginSchema = t.Object({
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ maxLength: 255 })
});

/**
 * Main router for standard user operations:
 * - Public: Registration and Login
 * - Protected: Profile retrieval and Logout
 */
export const userRoute = new Elysia({ prefix: "/api/users" })
  // Public routes
  /**
   * Register a new user.
   * Expects payload mapped to registerSchema.
   */
  .post("/", ({ body }) => usersService.registerUser(body as Static<typeof registerSchema>), {
    body: registerSchema
  })
  /**
   * Authenticate user credentials and issue an access token.
   */
  .post("/login", ({ body }) => usersService.loginUser(body as Static<typeof loginSchema>), {
    body: loginSchema
  })
  // Protected routes
  /**
   * Authorization Middleware (.derive)
   * Runs before protected route handlers to parse the Bearer token,
   * hash it, lookup the session safely, and assign the authenticated
   * user object directly to the request context.
   */
  .derive({ as: "scoped" }, async ({ headers }) => {
    const authHeader = headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.split(" ")[1] : "";
    
    if (!token) throw new UnauthorizedError();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const sessionWithUser = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      ),
      with: {
        user: true
      }
    });

    if (!sessionWithUser || !sessionWithUser.user) {
      throw new UnauthorizedError();
    }

    return {
      user: sessionWithUser.user,
      session: sessionWithUser
    };
  })
  /**
   * Retrieve the currently logged-in user profile metrics.
   * Relies on the user object injected by the authorization derive.
   */
  .get("/current", ({ user }) => usersService.getCurrentUser(user))
  /**
   * Invalidate the current session and logout.
   */
  .delete("/logout", ({ session }) => usersService.logoutUser(session.id));
