import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * DashboardSkeleton mimics the layout of DashboardPage.tsx.
 * Used as a fallback during lazy-loading to maintain structural stability.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mimic Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Welcome section placeholder */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Dashboard content grid placeholder */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile card skeleton */}
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    {i < 3 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Placeholder card skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
