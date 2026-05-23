import { cn } from "@/lib/utils/cn";

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] p-10 backdrop-blur-sm border bg-[var(--auth-card-bg)] border-[var(--auth-card-border)] shadow-[var(--auth-card-shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
