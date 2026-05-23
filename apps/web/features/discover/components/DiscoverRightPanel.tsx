import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { UserCard } from "@/components/UserCard";
import { ROUTES } from "@/lib/constants/routes";

const TRENDING = [
  {
    title: "Anora",
    count: "2,341 logs · ★ 4.5",
    poster: "https://image.tmdb.org/t/p/w92/4vFD3zsAIpVFNzd9KRSzaFGwH3K.jpg",
    imdbId: "tt30187306",
  },
  {
    title: "The Brutalist",
    count: "1,892 logs · ★ 4.2",
    poster: "https://image.tmdb.org/t/p/w92/vcFW09U4834DyFOeRZpsx9x1D3r.jpg",
    imdbId: "tt33451484",
  },
  {
    title: "Nickel Boys",
    count: "720 logs · ★ 4.4",
    poster: null,
    imdbId: "tt32699266",
  },
  {
    title: "I'm Still Here",
    count: "831 logs · ★ 4.3",
    poster: null,
    imdbId: "tt1683526",
  },
  {
    title: "A Complete Unknown",
    count: "643 logs · ★ 4.0",
    poster: null,
    imdbId: "tt35230402",
  },
];

const DIRECTORS = [
  { name: "Brady Corbet", meta: "Director · NY", initial: "B", bg: "#2d3a4a", color: "#7a9eb0" },
  { name: "Sean Baker", meta: "Director · NY", initial: "S", bg: "#2a1e30", color: "#9a7ab0" },
  { name: "RaMell Ross", meta: "Director · Tuscaloosa", initial: "R", bg: "#1e2a1a", color: "#7a9e6a" },
];

export function DiscoverRightPanel() {
  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Browse by Genre
        </div>
        <div className="flex flex-wrap gap-1">
          {["Drama", "Thriller", "Comedy", "Horror", "Sci-Fi", "Romance", "Documentary", "Animation", "Crime", "Mystery"].map(
            (g) => (
              <button
                key={g}
                className="text-[11px] text-fg-light border border-border px-2.5 py-1 rounded-sm cursor-pointer transition-all hover:border-fg-muted hover:text-fg"
              >
                {g}
              </button>
            )
          )}
        </div>
      </div>
      <div className="border-t border-border pt-6 mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Trending This Week
        </div>
        {TRENDING.map((f) => (
          <Link
            key={f.title}
            href={ROUTES.HOME}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer group"
          >
            <div className="w-9 flex-shrink-0">
              <FilmPoster
                src={f.poster}
                imdbId={f.imdbId}
                alt={f.title}
                size="sm"
                placeholderGradient="from-[#1e1e2a] to-[#2a3050]"
              />
            </div>
            <div>
              <div className="text-[12.5px] leading-snug group-hover:underline">
                {f.title}
              </div>
              <div className="text-[10.5px] text-fg-muted mt-0.5">
                {f.count}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="border-t border-border pt-6">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Directors to Follow
        </div>
        {DIRECTORS.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-2 py-2 border-b border-border last:border-b-0 cursor-pointer"
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-[13px]"
              style={{ background: d.bg, color: d.color }}
            >
              {d.initial}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium leading-tight">{d.name}</div>
              <div className="text-[10.5px] text-fg-muted mt-0.5">
                {d.meta}
              </div>
            </div>
            <button className="text-[11px] border border-border px-2.5 py-1 rounded-sm hover:bg-fg hover:text-bg hover:border-fg transition-all">
              Follow
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
