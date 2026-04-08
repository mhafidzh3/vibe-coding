import { db } from "../db";
import { users, sessions } from "../db/schema";
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

  async loginUser({ email, password }: any) {
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
};
