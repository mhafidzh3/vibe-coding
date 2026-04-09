import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UnauthorizedError, BadRequestError, ConflictError } from "../lib/errors";

export type RegisterPayload = typeof users.$inferInsert;
export type LoginPayload = Pick<RegisterPayload, "email" | "password">;

export const usersService = {
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

    return { data: rawToken };
  },

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
