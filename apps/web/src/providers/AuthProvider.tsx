import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "@/lib/eden";
import { authStore } from "@/lib/auth";

/**
 * Shape of the user object returned by the backend.
 * Matches the response of GET /api/users/current.
 */
interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

/**
 * Everything the AuthContext provides to child components.
 */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider wraps the entire app in <App />.
 * On mount, it checks if a token exists in localStorage and
 * attempts to fetch the current user's profile from the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On mount: check if a token already exists (from a previous session).
   * If yes, try to fetch the user profile.
   * If the token is expired or invalid, clear it silently.
   */
  useEffect(() => {
    const token = authStore.getToken();
    if (token) {
      fetchCurrentUser(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch the current user profile using a stored token.
   * If the request fails (401), the token is invalid — clear it.
   */
  async function fetchCurrentUser(token: string) {
    try {
      const { data, error } = await api.api.users.current.get({
        headers: { authorization: `Bearer ${token}` },
      });

      if (error) {
        authStore.clearToken();
        setUser(null);
        return;
      }

      setUser(data.data as User);
    } catch {
      authStore.clearToken();
      setUser(null);
    }
  }

  /**
   * Log in with email and password.
   * On success: store the token and fetch the user profile.
   * On failure: return the error message.
   */
  async function login(email: string, password: string) {
    try {
      const { data, error } = await api.api.users.login.post({
        email,
        password,
      });

      if (error) {
        const errorMsg = "error" in error.value ? error.value.error : error.value.message;
        return { success: false, error: errorMsg || "Login failed" };
      }

      const token = data.data;
      authStore.setToken(token);
      await fetchCurrentUser(token);

      return { success: true };
    } catch {
      return { success: false, error: "Network error. Is the backend running?" };
    }
  }

  /**
   * Register a new account.
   * On success: return success (user still needs to log in separately).
   * On failure: return the error message.
   */
  async function register(name: string, email: string, password: string) {
    try {
      const { error } = await api.api.users.post({
        name,
        email,
        password,
      });

      if (error) {
        const errorMsg = "error" in error.value ? error.value.error : error.value.message;
        return { success: false, error: errorMsg || "Registration failed" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Network error. Is the backend running?" };
    }
  }

  /**
   * Log out: tell the backend to invalidate the session, then clear local state.
   */
  async function logout() {
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
  }

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

/**
 * Custom hook to access auth state from any component.
 * Must be used inside an <AuthProvider>.
 *
 * Usage:
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
