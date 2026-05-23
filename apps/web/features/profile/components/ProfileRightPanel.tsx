import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { ROUTES } from "@/lib/constants/routes";

const RECENT_WATCHES = [
  { src: "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642", imdbId: "tt30187306" },
  { src: "https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg", imdbId: "tt33451484" },
  { src: "https://m.media-amazon.com/images/M/MV5BMjIxNTU4MzY4MF5BMl5BanBnXkFtZTgwNzY1MTU0MTE@._V1_FMjpg_UX800_.jpg", imdbId: "tt0166924" },
  { src: "https://m.media-amazon.com/images/M/MV5BNDc2NTM1MjktYmVhNS00YzQwLWE5NjctNWQ4NzEzZGY5ODI4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", imdbId: "tt4975722" },
  { src: "https://m.media-amazon.com/images/M/MV5BZTE2MmFiYjYtMjVjNS00MGEyLWFjZmItMmUwMDAxMWRhNTYxXkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", imdbId: "tt0043014" },
  { src: "https://m.media-amazon.com/images/M/MV5BMTY0OTA1MTkxN15BMl5BanBnXkFtZTgwMjE2NzI3MTE@._V1_FMjpg_UX800_.jpg", imdbId: "tt0245429" },
];

const MUTUALS = [
  { username: "k.szabo", role: "Editor · Budapest", initial: "K", bg: "#2d3a4a", color: "#7a9eb0" },
  { username: "nora.dop", role: "DP · Paris", initial: "N", bg: "#2a1e30", color: "#9a7ab0" },
  { username: "t.osei", role: "Director · Accra", initial: "T", bg: "#1e2a1a", color: "#7a9e6a" },
];

import { CURRENT_USER } from "@/lib/constants/currentUser";

export function ProfileRightPanel({ username }: { username?: string }) {
  const isSelf = username === CURRENT_USER.username;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted mb-3">
          Maya&apos;s Recent Watches
        </h3>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {RECENT_WATCHES.map((film, i) => (
            <div
              key={i}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <FilmPoster
                src={film.src}
                imdbId={film.imdbId}
                alt=""
                size="recent"
              />
            </div>
          ))}
        </div>
        <div className="text-[11px] text-accent mt-2.5 cursor-pointer hover:opacity-70">
          View all 642 films →
        </div>
      </section>
      
      {!isSelf && (
        <section className="rounded-xl border border-border bg-elevated p-4">
          <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted mb-3">
            Mutuals
          </h3>
          {MUTUALS.map((m) => (
            <div
              key={m.username}
              className="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0"
            >
              <div
                className="w-[30px] h-[30px] rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-display font-semibold"
                style={{ background: m.bg, color: m.color }}
              >
                {m.initial}
              </div>
              <div>
                <UsernameLink
                  username={m.username}
                  role={m.role}
                  initial={m.initial}
                  avatarBg={m.bg}
                  avatarColor={m.color}
                  className="text-xs font-bold text-fg block no-underline hover:underline cursor-pointer"
                >
                  {m.username}
                </UsernameLink>
                <div className="text-[10px] text-fg-muted ">{m.role}</div>
              </div>
            </div>
          ))}
          <div className="text-[11px] text-accent mt-2.5 cursor-pointer hover:opacity-70">
            47 more mutuals →
          </div>
        </section>
      )}
      
    </div>
  );
}
