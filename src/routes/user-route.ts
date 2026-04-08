import { Elysia, t } from "elysia";
import { usersService } from "../services/users-service";

export const userRoute = new Elysia({ prefix: "/api/users" })
  // Shared logic to extract and validate session token from Bearer header
  .derive({ as: "scoped" }, ({ headers }) => {
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const sessionToken = authHeader.split(" ")[1];
      if (sessionToken) {
        return { sessionToken };
      }
    }
    return { sessionToken: null };
  })
  .post("/", async ({ body, set }) => {
    try {
      const result = await usersService.registerUser(body as any);
      return result;
    } catch (error: any) {
      if (error.message === "Email already registered") {
        set.status = 400;
        return { error: "Email already registered" };
      }
      
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String(),
      password: t.String()
    })
  })
  .post("/login", async ({ body, set }) => {
    try {
      const result = await usersService.loginUser(body as any);
      return result;
    } catch (error: any) {
      if (error.message === "Wrong Email or Password") {
        set.status = 400;
        return { error: "Wrong Email or Password" };
      }

      set.status = 500;
      return { error: "Internal Server Error" };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    })
  })
  .get("/current", async ({ sessionToken, set }) => {
    if (!sessionToken) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    try {
      const result = await usersService.getCurrentUser(sessionToken);
      return result;
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      set.status = 500;
      return { error: "Internal Server Error" };
    }
  })
  .delete("/logout", async ({ sessionToken, set }) => {
    if (!sessionToken) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    try {
      const result = await usersService.logoutUser(sessionToken);
      return result;
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      set.status = 500;
      return { error: "Internal Server Error" };
    }
  });
