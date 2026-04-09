import { describe, it, expect, beforeEach } from "bun:test";
import crypto from "crypto";
import { app } from "../src/index";
import { db } from "../src/db/index";
import { users, sessions } from "../src/db/schema";

describe("User API tests", () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("Registration: POST /api/users", () => {
    it("should register a new user successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toEqual({ data: "OK" });
    });

    it("should fail on duplicate email registration", async () => {
      // 1. Register first user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "First User",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      // 2. Try to register same email
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Second User",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe("Email already registered");
    });

    it("should fail on validation error (short password)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Invalid User",
            email: "invalid@example.com",
            password: "123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe("Validation failed");
    });
  });

  describe("Login: POST /api/users/login", () => {
    beforeEach(async () => {
      // Create a user for login tests
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@example.com",
            password: "password123",
          }),
        })
      );
    });

    it("should login successfully and return a token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe("string");
    });

    it("should fail with wrong password", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "wrong_password",
          }),
        })
      );

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe("Wrong Email or Password");
    });
  });

  describe("Authenticated Endpoints: Current User & Logout", () => {
    let sessionToken: string;

    beforeEach(async () => {
      // 1. Create User
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Auth User",
            email: "auth@example.com",
            password: "password123",
          }),
        })
      );

      // 2. Login to get token
      const loginResponse = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "auth@example.com",
            password: "password123",
          }),
        })
      );
      const loginResult = await loginResponse.json();
      sessionToken = loginResult.data;
    });

    it("should retrieve current user profile successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.email).toBe("auth@example.com");
      expect(result.data.name).toBe("Auth User");
    });

    it("should fail to access current user without token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
        })
      );

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe("Unauthorized");
    });

    it("should logout successfully", async () => {
      // 1. Logout
      const logoutResponse = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        })
      );
      expect(logoutResponse.status).toBe(200);
      expect(await logoutResponse.json()).toEqual({ data: "OK" });

      // 2. Verify token is gone
      const currentResponse = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        })
      );
      expect(currentResponse.status).toBe(401);
    });

    it("should fail on double logout", async () => {
      // 1. Logout first time
      await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        })
      );

      // 2. Logout second time (token deleted from DB)
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        })
      );

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe("Unauthorized");
    });

    it("should fail to access current user with an expired token", async () => {
      // 1. Manually create an expired session
      const expiredToken = "expired_token_123";
      const tokenHash = crypto.createHash("sha256").update(expiredToken).digest("hex");
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      const [user] = await db.query.users.findMany({ limit: 1 });

      await db.insert(sessions).values({
        tokenHash,
        userId: user.id,
        expiresAt: pastDate,
      });

      // 2. Try to access with expired token
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${expiredToken}`,
          },
        })
      );

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe("Unauthorized");
    });
  });
});
