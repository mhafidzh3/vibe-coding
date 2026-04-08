import { Elysia, t, type Static } from "elysia";
import { usersService } from "../services/users-service";
import { UnauthorizedError } from "../lib/errors";

const registerSchema = t.Object({
  name: t.String({ maxLength: 255 }),
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 255 })
});

const loginSchema = t.Object({
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ maxLength: 255 })
});

export const userRoute = new Elysia({ prefix: "/api/users" })
  // Public routes
  .post("/", ({ body }) => usersService.registerUser(body as Static<typeof registerSchema>), {
    body: registerSchema
  })
  .post("/login", ({ body }) => usersService.loginUser(body as Static<typeof loginSchema>), {
    body: loginSchema
  })
  // Protected routes
  .guard({
    async beforeHandle({ headers, set }) {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError();
      }
    }
  })
  .derive({ as: "scoped" }, ({ headers }) => {
    const authHeader = headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.split(" ")[1] : "";
    return {
      sessionToken: token as string
    };
  })
  .get("/current", ({ sessionToken }) => usersService.getCurrentUser(sessionToken))
  .delete("/logout", ({ sessionToken }) => usersService.logoutUser(sessionToken));
