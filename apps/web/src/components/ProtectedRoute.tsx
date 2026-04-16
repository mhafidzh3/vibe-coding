import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthContext";

/**
 * Wraps a route that requires authentication.
 * - While checking auth status: shows a loading spinner
 * - If not authenticated: redirects to /login
 * - If authenticated: renders the child component
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
