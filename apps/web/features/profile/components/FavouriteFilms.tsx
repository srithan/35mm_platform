import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";

const FAVOURITES = [
  { title: "Mulholland Drive", src: "https://m.media-amazon.com/images/M/MV5BMjIxNTU4MzY4MF5BMl5BanBnXkFtZTgwNzY1MTU0MTE@._V1_FMjpg_UX800_.jpg", imdbId: "tt0166924" },
  { title: "Moonlight", src: "https://m.media-amazon.com/images/M/MV5BNDc2NTM1MjktYmVhNS00YzQwLWE5NjctNWQ4NzEzZGY5ODI4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", imdbId: "tt4975722" },
  { title: "The Dark Knight", src: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg", imdbId: "tt0468569" },
  { title: "Spirited Away", src: "https://m.media-amazon.com/images/M/MV5BMTY0OTA1MTkxN15BMl5BanBnXkFtZTgwMjE2NzI3MTE@._V1_FMjpg_UX800_.jpg", imdbId: "tt0245429" },
  { title: "Stalker", src: "https://m.media-amazon.com/images/M/MV5BYjBiOTYxZWItMzdiZi00NjlkLWIzZTYtYmFhZjhiMTljOTVkXkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", imdbId: "tt0079944" },
  { title: "Chungking Express", src: "https://m.media-amazon.com/images/M/MV5BZTE2MmFiYjYtMjVjNS00MGEyLWFjZmItMmUwMDAxMWRhNTYxXkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", imdbId: "tt0109424" },
];

export function FavouriteFilms() {
  return (
    <div className="py-7 px-10 border-b border-border bg-fg/5">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-3">
        Favourite films
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {FAVOURITES.map((f) => (
          <Link
            key={f.title}
            href="#"
            className="flex-shrink-0 text-center cursor-pointer group"
          >
            <div className="w-[52px] transition-opacity group-hover:opacity-80">
              <FilmPoster
                src={f.src}
                imdbId={f.imdbId}
                alt={f.title}
                size="favourite"
              />
            </div>
            <div className="text-[9px] text-fg-muted mt-1 leading-snug max-w-[52px] truncate">
              {f.title}
            </div>
          </Link>
        ))}
        <div className="flex-shrink-0 text-center cursor-pointer group">
          <div className="w-[52px] aspect-[2/3] rounded-sm overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#3a3a6e] flex items-center justify-center">
            <svg
              width={16}
              height={16}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.2}
              viewBox="0 0 24 24"
              className="group-hover:stroke-white/50 transition-colors"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <div className="text-[9px] text-fg-muted mt-1 max-w-[52px]">
            + Add
          </div>
        </div>
      </div>
    </div>
  );
}
