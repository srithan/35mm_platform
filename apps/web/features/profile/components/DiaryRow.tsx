import { FilmPoster } from "@/components/FilmPoster";
import { StarRating } from "@/components/StarRating";

interface DiaryRowProps {
  date: string;
  title: string;
  meta: string;
  posterSrc?: string | null;
  imdbId?: string | null;
  rating?: number | null;
}

export function DiaryRow({
  date,
  title,
  meta,
  posterSrc,
  imdbId,
  rating,
}: DiaryRowProps) {
  return (
    <div className="flex items-center gap-3.5 py-3 px-10 border-b border-border cursor-pointer transition-colors hover:bg-fg/5 animate-fade-up">
      <div className="text-[10px] text-fg-muted w-9 text-center flex-shrink-0">
        {date}
      </div>
      <div className="w-[38px] flex-shrink-0">
        <FilmPoster
          src={posterSrc}
          imdbId={imdbId}
          alt={title}
          size="diary"
          placeholderGradient="from-[#1e2a1a] to-[#2e4a2a]"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm italic">{title}</div>
        <div className="text-[11px] text-fg-muted mt-0.5">{meta}</div>
      </div>
      {rating != null && rating > 0 ? <StarRating rating={rating} size="sm" /> : null}
    </div>
  );
}
