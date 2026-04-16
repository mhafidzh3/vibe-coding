import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation: password must be at least 8 characters
    // (matches the backend's registerSchema validation)
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    const result = await register(name, email, password);

    if (result.success) {
      // Registration successful — redirect to login page
      // so the user can sign in with their new account
      toast.success("Account created! Please sign in.");
      navigate("/login", { replace: true });
    } else {
      setError(result.error || "Registration failed");
    }

    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* App branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Vibe Coding
        </h1>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Get started with Vibe Coding</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error message banner */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
