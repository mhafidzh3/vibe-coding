import { Elysia, t, type Static } from "elysia";
import { usersService } from "../services/users-service";
import { UnauthorizedError } from "../lib/errors";

const registerSchema = t.Object({
  name: t.String(),
  email: t.String(),
  password: t.String()
});

const loginSchema = t.Object({
  email: t.String(),
  password: t.String()
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
    return {
      sessionToken: headers.authorization!.split(" ")[1] as string
    };
  })
  .get("/current", ({ sessionToken }) => usersService.getCurrentUser(sessionToken))
  .delete("/logout", ({ sessionToken }) => usersService.logoutUser(sessionToken));
