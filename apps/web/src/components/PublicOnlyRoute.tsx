import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthContext";

/**
 * Wraps a route that should only be accessible to unauthenticated users.
 * Example: /login and /register.
 * If the user is already authenticated, they are redirected to /dashboard.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
