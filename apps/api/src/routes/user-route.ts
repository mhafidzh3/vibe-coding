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
 * Response schemas for Swagger documentation.
 */
const registerResponseSchema = t.Object({
  data: t.String()
});

const loginResponseSchema = t.Object({
  data: t.String()
});

const currentUserResponseSchema = t.Object({
  data: t.Object({
    id: t.Number(),
    name: t.String(),
    email: t.String(),
    created_at: t.Any()
  })
});

const logoutResponseSchema = t.Object({
  data: t.String()
});

/**
 * Error schemas for Swagger documentation.
 */
const errorResponseSchema = t.Object({
  error: t.String()
});

const validationErrorSchema = t.Object({
  error: t.String(),
  details: t.Array(
    t.Object({
      field: t.String(),
      message: t.String()
    })
  )
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
    body: registerSchema,
    response: {
      200: registerResponseSchema,
      400: t.Union([errorResponseSchema, validationErrorSchema])
    },
    detail: { summary: "Register a new user" }
  })
  /**
   * Authenticate user credentials and issue an access token.
   */
  .post("/login", ({ body }) => usersService.loginUser(body as Static<typeof loginSchema>), {
    body: loginSchema,
    response: {
      200: loginResponseSchema,
      400: t.Union([errorResponseSchema, validationErrorSchema])
    },
    detail: { summary: "Login to your account" }
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
  .get("/current", ({ user }) => usersService.getCurrentUser(user), {
    response: {
      200: currentUserResponseSchema,
      401: errorResponseSchema
    },
    detail: { summary: "Get current user profile" }
  })
  /**
   * Invalidate the current session and logout.
   */
  .delete("/logout", ({ session }) => usersService.logoutUser(session.id), {
    response: {
      200: logoutResponseSchema,
      401: errorResponseSchema
    },
    detail: { summary: "Logout current session" }
  });
