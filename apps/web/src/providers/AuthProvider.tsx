import { useState, useEffect, type ReactNode, useCallback } from "react";
import { api } from "@/lib/eden";
import { authStore } from "@/lib/auth";
import { AuthContext, type User } from "./AuthContext";

/**
 * AuthProvider wraps the entire app in <App />.
 * On mount, it checks if a token exists in localStorage and
 * attempts to fetch the current user's profile from the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the current user profile using a stored token.
   * If the request fails (401), the token is invalid — clear it.
   */
  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const { data, error } = await api.api.users.current.get({
        headers: { authorization: `Bearer ${token}` },
      });

      if (error) {
        authStore.clearToken();
        setUser(null);
      } else {
        setUser(data.data as User);
      }
    } catch {
      authStore.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * On mount: check if a token already exists (from a previous session).
   * If yes, try to fetch the user profile.
   * If the token is expired or invalid, clear it silently.
   */
  useEffect(() => {
    const token = authStore.getToken();
    if (token) {
      // We don't await here because useEffect cannot be async
      // and we handle setIsLoading(false) inside fetchCurrentUser
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  /**
   * Log in with email and password.
   * On success: store the token and fetch the user profile.
   * On failure: return the error message.
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await api.api.users.login.post({
          email,
          password,
        });

        if (error) {
          const errorMsg =
            "error" in error.value ? error.value.error : error.value.message;
          return { success: false, error: errorMsg || "Login failed" };
        }

        const token = data.data;
        authStore.setToken(token);
        await fetchCurrentUser(token);

        return { success: true };
      } catch {
        return {
          success: false,
          error: "Network error. Is the backend running?",
        };
      }
    },
    [fetchCurrentUser]
  );

  /**
   * Register a new account.
   * On success: return success (user still needs to log in separately).
   * On failure: return the error message.
   */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const { error } = await api.api.users.post({
          name,
          email,
          password,
        });

        if (error) {
          const errorMsg =
            "error" in error.value ? error.value.error : error.value.message;
          return { success: false, error: errorMsg || "Registration failed" };
        }

        return { success: true };
      } catch {
        return {
          success: false,
          error: "Network error. Is the backend running?",
        };
      }
    },
    []
  );

  /**
   * Log out: tell the backend to invalidate the session, then clear local state.
   */
  const logout = useCallback(async () => {
    const token = authStore.getToken();
    if (token) {
      try {
        await api.api.users.logout.delete({
          headers: { authorization: `Bearer ${token}` },
        });
      } catch {
        // Even if the backend call fails, we still clear locally
      }
    }

    authStore.clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
