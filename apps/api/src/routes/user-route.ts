import { Elysia, t, type Static } from "elysia";
import { usersService } from "../services/users-service";
import { UnauthorizedError } from "../lib/errors";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { rateLimit } from "elysia-rate-limit";

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
  message: t.String()
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
  .use(rateLimit({ 
    max: Number(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === "test" ? 100 : 20),
    duration: 60000,
    generator: (req, server) => {
        // Fallback for tests or environments without real IP
        return (server?.requestIP(req)?.address) || req.headers.get("x-forwarded-for") || "127.0.0.1";
    },
    errorResponse: new Response(
        JSON.stringify({ error: "Rate limit exceeded" }), 
        { status: 429, headers: { "Content-Type": "application/json" } }
    )
  }))
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
   * Authenticate user credentials and issue access/refresh tokens.
   */
  .post("/login", async ({ body, cookie: { auth_token, refresh_token } }) => {
    const { accessToken, refreshToken } = await usersService.loginUser(body as Static<typeof loginSchema>);
    
    auth_token!.set({
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
      sameSite: "lax"
    });

    refresh_token!.set({
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 86400, // 7 days
      path: "/",
      sameSite: "lax"
    });

    return { message: "Login successful" };
  }, {
    body: loginSchema,
    response: {
      200: loginResponseSchema,
      400: t.Union([errorResponseSchema, validationErrorSchema])
    },
    detail: { summary: "Login to your account" }
  })
  /**
    * Refresh the session using the Refresh Token.
    * Uses Token Rotation to issue new set of tokens.
    */
  .post("/refresh", async ({ cookie: { auth_token, refresh_token } }) => {
      const currentRefreshToken = refresh_token?.value as string;
      if (!currentRefreshToken) throw new UnauthorizedError("Refresh token missing");

      const { accessToken, refreshToken } = await usersService.refreshSession(currentRefreshToken);

      auth_token!.set({
          value: accessToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 15 * 60,
          path: "/",
          sameSite: "lax"
      });

      refresh_token!.set({
          value: refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 86400,
          path: "/",
          sameSite: "lax"
      });

      return { message: "Session refreshed" };
  }, {
      response: {
          200: t.Object({ message: t.String() }),
          401: errorResponseSchema
      },
      detail: { summary: "Refresh session tokens" }
  })
  // Protected routes
  /**
   * Authorization Middleware (.derive)
   * Runs before protected route handlers to parse the Bearer token,
   * hash it, lookup the session safely, and assign the authenticated
   * user object directly to the request context.
   */
  .derive({ as: "scoped" }, async ({ cookie: { auth_token } }) => {
    const token = auth_token?.value as string;
    
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
  .delete("/logout", async ({ session, cookie: { auth_token, refresh_token } }) => {
    const result = await usersService.logoutUser(session.id);
    auth_token!.remove();
    refresh_token!.remove();
    return result;
  }, {
    response: {
      200: logoutResponseSchema,
      401: errorResponseSchema
    },
    detail: { summary: "Logout current session" }
  });
