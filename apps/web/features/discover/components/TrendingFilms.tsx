import { FilmPoster } from "@/components/FilmPoster";
import { cn } from "@/lib/utils/cn";

const FILMS = [
  {
    title: "Past Lives",
    year: 2023,
    director: "Celine Song",
    poster: "https://image.tmdb.org/t/p/w185/k3waqVXGOYGGbQFDJYPCkVFaFGV.jpg",
    imdbId: "tt13238346",
  },
  {
    title: "Oppenheimer",
    year: 2023,
    director: "Christopher Nolan",
    poster: "https://image.tmdb.org/t/p/w185/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    imdbId: "tt15398776",
  },
  {
    title: "Zone of Interest",
    year: 2023,
    director: "Jonathan Glazer",
    poster: "https://image.tmdb.org/t/p/w185/hPlPlKHOBZpOKEJAqhJvXD3b42F.jpg",
    imdbId: "tt7160372",
  },
  {
    title: "Evil Does Not Exist",
    year: 2023,
    director: "Ryûsuke Hamaguchi",
    poster: "https://image.tmdb.org/t/p/w185/uyBSCe4MBF3YsKzLyAJR8ck2Yry.jpg",
    imdbId: "tt26684470",
  },
  {
    title: "Perfect Days",
    year: 2023,
    director: "Wim Wenders",
    poster: "https://image.tmdb.org/t/p/w185/aEkHT9bC8oXzUBcE6K2ZhONyVGg.jpg",
    imdbId: "tt26774862",
  },
  {
    title: "Io Capitano",
    year: 2023,
    director: "Matteo Garrone",
    poster: "https://image.tmdb.org/t/p/w185/9xNXvXBMoPhSY1l3vPe29vBvSKE.jpg",
    imdbId: "tt2214433",
  },
  {
    title: "Society of Snow",
    year: 2023,
    director: "J.A. Bayona",
    poster: "https://image.tmdb.org/t/p/w185/k7eYdWvhYQyRQoU2TB2A2Xu7218.jpg",
    imdbId: "tt13352968",
  },
  {
    title: "Saltburn",
    year: 2023,
    director: "Emerald Fennell",
    poster: "https://image.tmdb.org/t/p/w185/qjhahNLSZ705B5JP92YMEYPocPz.jpg",
    imdbId: "tt16161930",
  },
];

export function TrendingFilms() {
  return (
    <div className="px-10">
      <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium py-7 pt-9 pb-3.5">
        Popular Right Now
      </div>
      <div className="grid grid-cols-4 gap-4 pb-7">
        {FILMS.map((film, i) => (
          <div
            key={film.title}
            className={cn(
              "cursor-pointer animate-fade-up",
              `[animation-delay:${(i + 1) * 50}ms]`
            )}
          >
            <div className="aspect-[2/3] rounded overflow-hidden bg-fg relative group">
              <FilmPoster
                src={film.poster}
                imdbId={film.imdbId}
                alt={film.title}
                size="xl"
                className="w-full h-full group-hover:scale-[1.03] group-hover:opacity-85 transition-all duration-300"
              />
            </div>
            <div className="text-xs leading-snug mt-2 text-fg">
              {film.title}
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">{film.year}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
