import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { UserCard } from "@/components/UserCard";
import { ROUTES } from "@/lib/constants/routes";

const TRENDING_FILMS = [
  {
    title: "Anora",
    count: "2,341 logs this week",
    poster:
      "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642",
    imdbId: "tt30187306",
  },
  {
    title: "The Brutalist",
    count: "1,892 logs this week",
    poster:
      "https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    imdbId: "tt33451484",
  },
  {
    title: "Spirit",
    count: "954 logs this week",
    poster:
      "https://image.tmdb.org/t/p/w92/4vFD3zsAIpVFNzd9KRSzaFGwH3K.jpg",
    imdbId: "tt29479386",
  },
  {
    title: "I'm Still Here",
    count: "831 logs this week",
    poster: null,
    imdbId: "tt1683526",
  },
  {
    title: "Nickel Boys",
    count: "720 logs this week",
    poster: null,
    imdbId: "tt32699266",
  },
];

const WHO_TO_FOLLOW = [
  {
    username: "k.szabo",
    role: "Editor · Budapest",
    avatarBg: "linear-gradient(135deg,#2d3a4a,#1a2530)",
    avatarColor: "#7a9eb0",
    initial: "K",
  },
  {
    username: "nora.dop",
    role: "DP · Paris",
    avatarBg: "linear-gradient(135deg,#2a1e30,#3a2a40)",
    avatarColor: "#9a7ab0",
    initial: "N",
  },
  {
    username: "t.osei",
    role: "Director · Accra",
    avatarBg: "linear-gradient(135deg,#1e2a1a,#2a3a22)",
    avatarColor: "#7a9e6a",
    initial: "T",
  },
];

export function FeedRightPanel() {
  return (
    <>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Trending on 35mm.in
        </div>
        {TRENDING_FILMS.map((film, i) => (
          <Link
            key={film.title}
            href={ROUTES.HOME}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer group"
          >
            <div className="w-11 flex-shrink-0">
              <FilmPoster
                src={film.poster}
                imdbId={film.imdbId}
                alt={film.title}
                size="md"
                placeholderGradient="from-[#2a1a2a] to-[#503050]"
                placeholderStrokeColor="#8a5a8a"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] italic leading-snug group-hover:underline">
                {film.title}
              </div>
              <div className="text-[11px] text-fg-muted mt-0.5">
                {film.count}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Filmmakers to follow
        </div>
        {WHO_TO_FOLLOW.map((user) => (
          <UserCard
            key={user.username}
            username={user.username}
            handle={`@${user.username}`}
            role={user.role}
            initial={user.initial}
            avatarBg={user.avatarBg}
            avatarColor={user.avatarColor}
            showFollowButton
          />
        ))}
      </div>

      <div className="border border-border rounded p-3.5 bg-hover">
        <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted font-medium mb-1.5">
          Now on
        </div>
        <div className="text-[15px] font-semibold leading-snug">
          Berlinale 2026
        </div>
        <div className="text-xs text-fg-light mt-1 leading-normal">
          Feb 13 – 23 · Berlin, DE
        </div>
        <div className="text-[11.5px] text-accent mt-2.5 cursor-pointer tracking-[0.02em] hover:opacity-80">
          234 filmmakers attending →
        </div>
      </div>
    </>
  );
}
