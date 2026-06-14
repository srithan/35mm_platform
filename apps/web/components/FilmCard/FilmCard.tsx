import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils/cn";

interface FilmCardProps {
  title: string;
  meta: string; // e.g. "Chantal Akerman · 1975 · Belgium · 201 min"
  posterSrc?: string | null;
  imdbId?: string | null;
  rating?: number;
  href?: string;
  className?: string;
}

export function FilmCard({
  title,
  meta,
  posterSrc,
  imdbId,
  rating = 0,
  href = "#",
  className,
}: FilmCardProps) {
  const content = (
    <div
      className={cn(
        "border border-border rounded overflow-hidden flex transition-colors cursor-pointer hover:border-border-strong",
        className
      )}
    >
      <div className="w-[72px] h-[88px] flex-shrink-0 bg-fg flex items-center justify-center overflow-hidden">
        {posterSrc ? (
          <FilmPoster src={posterSrc} imdbId={imdbId} alt={title} size="lg" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-poster-bg-from to-poster-bg-to flex items-center justify-center">
            <svg
              width={20}
              height={20}
              fill="none"
              stroke="var(--color-poster-stroke)"
              strokeWidth={1.2}
              viewBox="0 0 24 24"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 min-w-0">
        <div className="text-sm font-semibold leading-snug">
          {title}
        </div>
        <div className="text-[11.5px] text-fg-muted mt-0.5">
          {meta}
        </div>
        {rating > 0 && (
          <div className="mt-2">
            <StarRating rating={rating} size="sm" />
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
