import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
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
   * Authenticates user matching email and compares against stored bcrypt hash.
   * Generates a secure, 32-byte hex token upon successful validation.
   * Stores the generated SHA-256 token hash alongside a 7-day expiration boundary.
   *
   * @param payload Object containing email and plaintext password attempts
   * @throws BadRequestError on invalid email match or password resolution failure
   * @returns Raw token string utilized as Bearer for downstream requests
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

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(sessions).values({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return { token: rawToken };
  },

  /**
   * Retrieves comprehensive user profile payload.
   * As isolation is managed by upstream middleware, this function acts purely
   * to construct the response map for the verified active token's owner.
   *
   * @param user Pre-verified user reference injected by route guard
   * @returns Unwrapped safe response structure containing user identifiers
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
   * Voids the active session record effectively revoking underlying authorization.
   * Targets specific connection ID preventing mass-termination on multiple client layouts.
   *
   * @param sessionId Session PK extracted natively by route middleware
   * @throws UnauthorizedError If session could not be found or removed effectively
   * @returns Successful deletion object
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
