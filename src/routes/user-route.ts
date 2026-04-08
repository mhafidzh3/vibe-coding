import { Elysia, t } from "elysia";
import { usersService } from "../services/users-service";

export const userRoute = new Elysia({ prefix: "/api/users" })
  .post("/", async ({ body, set }) => {
    try {
      const result = await usersService.registerUser(body);
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
      const result = await usersService.loginUser(body);
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
  });
