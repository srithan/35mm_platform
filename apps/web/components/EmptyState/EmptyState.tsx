import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center py-20 text-fg-muted",
        className
      )}
    >
      <p className="font-medium text-fg-light">{title}</p>
      {description && (
        <p className="text-sm mt-1 ">{description}</p>
      )}
      {children}
    </div>
  );
}
