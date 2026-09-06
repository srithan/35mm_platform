import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  rating: number; // 0-5, can be fractional (e.g. 4.5)
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({
  rating,
  max = 5,
  size = "md",
  className,
}: StarRatingProps) {
  const sizeClass =
    size === "sm"
      ? "h-[7px] w-[7px]"
      : size === "lg"
        ? "h-3.5 w-3.5"
        : "h-2.5 w-2.5";
  const starPath =
    "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

  return (
    <div
      className={cn("flex gap-0.5 items-center", className)}
      role="img"
      aria-label={rating + " out of " + max + " stars"}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.floor(rating);
        const half = i + 1 === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <div
            key={i}
            className={cn(
              sizeClass,
              "rounded-sm flex-shrink-0"
            )}
            style={{
              clipPath: starPath,
              background: half
                ? "linear-gradient(90deg, var(--color-rating-star, var(--accent)) 50%, var(--color-rating-star-empty, var(--border)) 50%)"
                : filled
                  ? "var(--color-rating-star, var(--accent))"
                  : "var(--color-rating-star-empty, var(--border))",
            }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
