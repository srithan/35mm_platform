import { cn } from "@/lib/utils/cn";

interface FeedEndTitleProps {
  message: string;
  className?: string;
}

/** A quiet closing-title treatment for finite post collections. */
export function FeedEndTitle({ message, className }: FeedEndTitleProps) {
  return (
    <div
      role="status"
      aria-label="End of feed"
      className={cn("px-6 py-10 text-center", className)}
    >
      <p className="mx-auto max-w-[420px] font-sans text-[14px] font-medium leading-relaxed text-fg-muted">
        {message}
      </p>
    </div>
  );
}
