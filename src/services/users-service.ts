import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// Payload types for better introspection and type safety
export type RegisterPayload = typeof users.$inferInsert;
export type LoginPayload = Pick<RegisterPayload, "email" | "password">;

export const usersService = {
  async registerUser({ name, email, password }: RegisterPayload) {
    // 1. Check if email already registered (Graceful check)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // 2. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      // 3. Create user
      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
      });
    } catch (error: any) {
      // Handle race conditions (Postgres unique violation 23505)
      if (error.code === "23505") {
        throw new Error("Email already registered");
      }
      throw error;
    }

    return { data: "OK" };
  },

  async loginUser({ email, password }: LoginPayload) {
    // 1. Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new Error("Wrong Email or Password");
    }

    // 2. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Wrong Email or Password");
    }

    // 3. Generate UUID token
    const token = crypto.randomUUID();

    // 4. Create session
    await db.insert(sessions).values({
      token,
      email: user.email,
      userId: user.id,
    });

    return { data: token };
  },

  async getCurrentUser(sessionToken: string) {
    // 1. Find session by token
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, sessionToken),
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    // 2. Find user by userId from session
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      throw new Error("Unauthorized");
    }

    // 3. Return user profile
    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.createdAt,
      },
    };
  },

  async logoutUser(sessionToken: string) {
    // 1. Find and delete session by token
    const result = await db.delete(sessions)
      .where(eq(sessions.token, sessionToken))
      .returning();

    if (result.length === 0) {
      throw new Error("Unauthorized");
    }

    return { data: "OK" };
  },
};
