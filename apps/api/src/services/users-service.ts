import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UnauthorizedError, BadRequestError, ConflictError } from "../lib/errors";

export type RegisterPayload = typeof users.$inferInsert;
export type LoginPayload = Pick<RegisterPayload, "email" | "password">;

export const usersService = {
  /**
   * Registers a new user into the database.
   * Checks for email duplication and enforces password hashing before storage.
   *
   * @param payload User registration objects containing name, email, and plaintext password
   * @throws ConflictError if the email already exists in the registry
   * @returns Indication object `{ data: "OK" }` upon successful creation
   */
  async registerUser({ name, email, password }: RegisterPayload) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
      });
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictError("Email already registered");
      }
      throw error;
    }

    return { data: "OK" };
  },

  /**
   * Authenticates user and issues a dual-token payload (Access & Refresh).
   * Implements secure hashing and separate expiration boundaries.
   *
   * @param payload Object containing email and plaintext password attempts
   * @throws BadRequestError on invalid credentials
   * @returns Raw tokens to be stored in HttpOnly cookies
   */
  async loginUser({ email, password }: LoginPayload) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new BadRequestError("Wrong Email or Password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError("Wrong Email or Password");
    }

    // Access Token (15 mins)
    const accessToken = crypto.randomBytes(32).toString("hex");
    const accessTokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
    const accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15);

    // Refresh Token (7 days)
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);

    await db.insert(sessions).values({
      tokenHash: accessTokenHash,
      refreshTokenHash: refreshTokenHash,
      userId: user.id,
      expiresAt: accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
    });

    return { accessToken, refreshToken };
  },

  /**
   * Validates a refresh token, rotates it, and issues a new dual-token set.
   * Implements Token Rotation for enhanced security.
   *
   * @param refreshToken The raw refresh token from the browser cookie
   * @returns New set of tokens
   */
  async refreshSession(refreshToken: string) {
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.refreshTokenHash, refreshTokenHash),
        gt(sessions.refreshTokenExpiresAt, new Date())
      ),
    });

    if (!session || !session.userId) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Delete the old session before issuing new tokens (Rotation)
    await db.delete(sessions).where(eq(sessions.id, session.id));

    // Issue brand new tokens and session
    const newAccessToken = crypto.randomBytes(32).toString("hex");
    const newAccessTokenHash = crypto.createHash("sha256").update(newAccessToken).digest("hex");
    const newAccessTokenExpiresAt = new Date();
    newAccessTokenExpiresAt.setMinutes(newAccessTokenExpiresAt.getMinutes() + 15);

    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const newRefreshTokenExpiresAt = new Date();
    newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 7);

    await db.insert(sessions).values({
      tokenHash: newAccessTokenHash,
      refreshTokenHash: newRefreshTokenHash,
      userId: session.userId,
      expiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  /**
   * Retrieves user profile for a verified session.
   */
  async getCurrentUser(user: typeof users.$inferSelect) {
    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.createdAt,
      },
    };
  },

  /**
   * Voids the active session record.
   */
  async logoutUser(sessionId: number) {
    const result = await db.delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();

    if (result.length === 0) {
      throw new UnauthorizedError();
    }

    return { data: "OK" };
  },
};
