import { treaty } from "@elysiajs/eden";
import type { App } from "../../../api/src/index";

/**
 * Enhanced Eden Treaty client with automatic session refreshing.
 * Intercepts 401 Unauthorized errors and attempts to rotate the 15-minute 
 * access token using the HttpOnly refresh token before failing the request.
 */
export const api = treaty<App>(window.location.origin, {
// Inject custom fetcher to handle 401 interception and retry logic
  fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
    // Ensure all requests include credentials (cookies) by default
    const requestInit = { ...init, credentials: "include" as const };
    
    let response = await fetch(input, requestInit);

    const url = input.toString();
    
    // If the request fails with 401 and it's not an authentication attempt itself
    if (
      response.status === 401 &&
      !url.includes("/api/users/login") &&
      !url.includes("/api/users/refresh")
    ) {
      // Attempt to refresh the access token
      const refreshResponse = await fetch(`${window.location.origin}/api/users/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshResponse.ok) {
        // Session successfully refreshed, retry the original request once
        response = await fetch(input, requestInit);
      } else if (refreshResponse.status === 401) {
        // Fatal session loss: refresh token is invalid/expired
        // Dispatch global event for AuthProvider to handle
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }

    return response;
  }) as any,
});
