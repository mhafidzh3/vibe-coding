import { cn } from "@/lib/utils";

/**
 * Basic Skeleton component based on shadcn/ui.
 * Provides a subtle pulsing animation to represent loading content.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

export { Skeleton };
