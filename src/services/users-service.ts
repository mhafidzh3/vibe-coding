import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
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

    const token = crypto.randomUUID();

    await db.insert(sessions).values({
      token,
      email: user.email,
      userId: user.id,
    });

    return { data: token };
  },

  async getCurrentUser(sessionToken: string) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, sessionToken),
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      throw new UnauthorizedError();
    }

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
    const result = await db.delete(sessions)
      .where(eq(sessions.token, sessionToken))
      .returning();

    if (result.length === 0) {
      throw new UnauthorizedError();
    }

    return { data: "OK" };
  },
};
