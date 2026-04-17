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
      const result: any = await response.json();
      expect(result).toEqual({ data: "OK" });
    });

    it("should fail on duplicate email registration", async () => {
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
      const result: any = await response.json();
      expect(result.error).toBe("Email already registered");
    });
  });

  describe("Login and Session Management", () => {
    let accessToken: string;
    let refreshToken: string;

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

      // 2. Login to get cookies
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
      
      const cookieHeader = loginResponse.headers.get("set-cookie") || "";
      const authMatch = cookieHeader.match(/auth_token=([^;]+)/);
      const refreshMatch = cookieHeader.match(/refresh_token=([^;]+)/);
      
      accessToken = authMatch?.[1] ?? "";
      refreshToken = refreshMatch?.[1] ?? "";
    });

    it("should login successfully and set dual cookies", () => {
      expect(accessToken).not.toBe("");
      expect(refreshToken).not.toBe("");
    });

    it("should retrieve current user using access token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Cookie": `auth_token=${accessToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const result: any = await response.json();
      expect(result.data.email).toBe("auth@example.com");
    });

    it("should refresh session correctly and rotate tokens", async () => {
      // 1. Refresh using current refresh token
      const refreshResponse = await app.handle(
        new Request("http://localhost/api/users/refresh", {
          method: "POST",
          headers: {
            "Cookie": `refresh_token=${refreshToken}`,
          },
        })
      );

      expect(refreshResponse.status).toBe(200);
      
      const cookieHeader = refreshResponse.headers.get("set-cookie") || "";
      const newAuthMatch = cookieHeader.match(/auth_token=([^;]+)/);
      const newRefreshMatch = cookieHeader.match(/refresh_token=([^;]+)/);
      
      const newAccessToken = newAuthMatch?.[1] ?? "";
      const newRefreshToken = newRefreshMatch?.[1] ?? "";

      expect(newAccessToken).not.toBe(accessToken);
      expect(newRefreshToken).not.toBe(refreshToken);

      // 2. Verify old refresh token is now invalid (Rotation check)
      const failedRefresh = await app.handle(
        new Request("http://localhost/api/users/refresh", {
          method: "POST",
          headers: {
            "Cookie": `refresh_token=${refreshToken}`,
          },
        })
      );
      expect(failedRefresh.status).toBe(401);
    });

    it("should logout successfully and clear both cookies", async () => {
      const logoutResponse = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Cookie": `auth_token=${accessToken}; refresh_token=${refreshToken}`,
          },
        })
      );
      expect(logoutResponse.status).toBe(200);
      
      const cookies = logoutResponse.headers.getSetCookie();
      expect(cookies.some(c => c.startsWith("auth_token=;"))).toBe(true);
      expect(cookies.some(c => c.startsWith("refresh_token=;"))).toBe(true);
    });

    it("should fail to refresh with an expired refresh token", async () => {
        // Manually expire the refresh token in the DB
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 8);

        await db.update(sessions).set({
            refreshTokenExpiresAt: pastDate
        });

        const response = await app.handle(
            new Request("http://localhost/api/users/refresh", {
                method: "POST",
                headers: {
                    "Cookie": `refresh_token=${refreshToken}`,
                },
            })
        );

        expect(response.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
      it("should trigger rate limit after multiple consecutive login attempts", async () => {
          const attempts = [];
          for (let i = 0; i < 102; i++) {
              attempts.push(app.handle(
                new Request("http://localhost/api/users/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "rate@lim.it", password: "password123" }),
                })
              ));
          }

          const results = await Promise.all(attempts);
          const hasRateLimit = results.some(res => res.status === 429);
          
          // Note: In some test environments, rate-limit plugin might need accurate IP or local config
          // If the test fails due to plugin environment, we might need to adjust elysia-rate-limit config
          expect(hasRateLimit).toBe(true);
      });
  });
});
