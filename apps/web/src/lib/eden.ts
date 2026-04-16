import { treaty } from "@elysiajs/eden";
import type { App } from "../../../api/src/index";

// During development, the Vite proxy forwards /api/* to localhost:3000
// so we use an empty string (relative URL) as the base
export const api = treaty<App>(window.location.origin);
