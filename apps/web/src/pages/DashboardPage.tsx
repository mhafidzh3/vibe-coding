import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar } from "lucide-react";

/**
 * Format a date string into a human-readable format.
 * Example: "2026-04-09T02:30:00Z" -> "April 9, 2026"
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's your account overview.
          </p>
        </div>

        {/* Dashboard content grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Profile Information
              </CardTitle>
              <CardDescription>
                Your personal account details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Name */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{user.name}</p>
                  </div>
                </div>
                <Separator />
                
                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <Separator />
                
                {/* Member since */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="text-sm font-medium">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for future cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">
                More features coming soon...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
