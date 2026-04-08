import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const usersService = {
  async registerUser({ name, email, password }: any) {
    // 1. Check if email already registered
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // 2. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Create user
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });

    return { data: "OK" };
  },
};
