import { createContext, useContext } from "react";

/**
 * Shape of the user object returned by the backend.
 */
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

/**
 * Everything the AuthContext provides to child components.
 */
export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access auth state from any component.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
