import { useState, useEffect, type ReactNode, useCallback } from "react";
import { api } from "@/lib/eden";
import { AuthContext, type User } from "./AuthContext";

/**
 * AuthProvider wraps the entire app in <App />.
 * On mount, it attempts to fetch the current user's profile from the backend.
 * Authentication status is derived from the presence of a secure cookie.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the current user profile.
   * Authentication is handled automatically via HttpOnly cookies.
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data, error } = await api.api.users.current.get();

      if (error) {
        setUser(null);
      } else {
        setUser(data.data as User);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * On mount: attempt to fetch the user profile.
   * If the auth_token cookie is present and valid, the user is logged in.
   */
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  /**
   * Log in with email and password.
   * The backend sets an HttpOnly cookie on success.
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await api.api.users.login.post({
          email,
          password,
        });

        if (error) {
          const errorMsg =
            "error" in error.value ? error.value.error : error.value.message;
          return { success: false, error: errorMsg || "Login failed" };
        }

        await fetchCurrentUser();

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
   * On success: return success.
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
   * Log out: tell the backend to clear the cookie, then clear local state.
   */
  const logout = useCallback(async () => {
    try {
      await api.api.users.logout.delete();
    } catch {
      // Ignore errors on logout
    }

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
