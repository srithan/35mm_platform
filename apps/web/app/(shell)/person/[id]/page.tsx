import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { ROUTES } from "@/lib/constants/routes";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb/constants";

type PageProps = { params: Promise<{ id: string }> };

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_PERSON = "https://www.themoviedb.org/person/";

type PersonCredit = {
  id: number;
  title?: string;
  name?: string;
  media_type?: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  job?: string;
  character?: string;
  vote_count?: number;
};

type PersonDetail = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string | null;
  profile_path: string | null;
  movie_credits?: {
    cast?: PersonCredit[];
    crew?: PersonCredit[];
  };
  tv_credits?: {
    cast?: PersonCredit[];
    crew?: PersonCredit[];
  };
};

export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return { title: "Person" };
  }
  return { title: "Person " + id + " — 35mm" };
}

function isPersonDetail(value: unknown): value is PersonDetail {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "number" && typeof record.name === "string";
}

async function fetchPerson(id: string): Promise<PersonDetail | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const url = new URL(TMDB_BASE + "/person/" + id);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("append_to_response", "movie_credits,tv_credits");

  const response = await fetch(url.toString(), {
    next: { revalidate },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return isPersonDetail(data) ? data : null;
}

function creditDate(credit: PersonCredit): string {
  return credit.release_date || credit.first_air_date || "";
}

function creditTitle(credit: PersonCredit): string {
  return credit.title || credit.name || "Untitled";
}

function creditRole(credit: PersonCredit): string {
  return credit.job || credit.character || "Credit";
}

function creditHref(credit: PersonCredit): string {
  const media = credit.media_type === "tv" || credit.first_air_date ? "tv" : "movie";
  return ROUTES.TITLE(media, credit.id);
}

function filmographyCredits(person: PersonDetail): PersonCredit[] {
  const credits = [
    ...(person.movie_credits?.crew ?? []),
    ...(person.movie_credits?.cast ?? []),
    ...(person.tv_credits?.crew ?? []),
    ...(person.tv_credits?.cast ?? []),
  ];
  const seen = new Set<string>();
  return credits
    .filter(function (credit) {
      const key = (credit.media_type || "movie") + ":" + credit.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(function (a, b) {
      return creditDate(b).localeCompare(creditDate(a));
    })
    .slice(0, 72);
}

function decadeLabel(date: string): string {
  const year = Number(yearFromDate(date));
  if (!Number.isFinite(year) || year <= 0) return "Undated";
  return Math.floor(year / 10) * 10 + "s";
}

function groupedCreditsByDecade(credits: PersonCredit[]) {
  const groups = new Map<string, PersonCredit[]>();
  for (const credit of credits) {
    const label = decadeLabel(creditDate(credit));
    groups.set(label, [...(groups.get(label) ?? []), credit]);
  }
  return Array.from(groups.entries()).map(function ([label, items]) {
    return { label, items };
  });
}

function profileImage(path: string | null): string | null {
  return path ? TMDB_IMAGE_BASE + "/w500" + path : null;
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const person = await fetchPerson(id);
  if (!person) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-semibold leading-none text-fg">Cast &amp; crew</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
          35mm could not load this person profile. Open TMDB for full filmography and photos.
        </p>
        <a
          href={TMDB_PERSON + id}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2.5 text-[13px] font-semibold text-fg transition hover:border-fg/30"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
          <span>View on TMDB</span>
        </a>
      </div>
    );
  }

  const credits = filmographyCredits(person);
  const creditGroups = groupedCreditsByDecade(credits);
  const photo = profileImage(person.profile_path);
  const activeSince = credits.length
    ? yearFromDate(creditDate(credits[credits.length - 1]))
    : "";
  const craftCount = new Set(credits.map(creditRole)).size;
  const tvCreditCount = credits.filter((c) => c.media_type === "tv" || c.first_air_date).length;
  const filmCreditCount = credits.length - tvCreditCount;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <section className="grid gap-8 pb-8 md:grid-cols-[260px_1fr] md:items-start lg:gap-10">
        <div className="aspect-square overflow-hidden rounded-sm border border-fg bg-sunken">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={person.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-6xl text-fg-muted">
              {person.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {person.known_for_department || "Cast & crew"}
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold leading-none text-fg md:text-6xl">
            {person.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-fg-muted">
            {person.birthday ? <span>Born {yearFromDate(person.birthday)}</span> : null}
            {person.place_of_birth ? <span>{person.place_of_birth}</span> : null}
            <span>{credits.length} credits</span>
            {activeSince ? <span>Active since {activeSince}</span> : null}
          </div>
          {person.biography ? (
            <p className="mt-5 max-w-4xl text-[14px] leading-relaxed text-fg-muted">
              {person.biography}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={TMDB_PERSON + id}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-fg px-5 py-2 text-[13px] font-semibold text-fg transition hover:bg-fg hover:text-bg"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
              <span>TMDB</span>
            </a>
            <Link
              href={ROUTES.DISCOVER}
              className="rounded-full border border-border px-5 py-2 text-[13px] font-semibold text-fg-muted transition hover:bg-hover hover:text-fg"
            >
              Discover
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-8 flex items-center gap-8 border-b border-border font-mono text-sm">
        <span className="border-b-2 border-accent pb-3 text-fg">Filmography</span>
        <span className="pb-3 text-fg-muted">About</span>
        <span className="pb-3 text-fg-muted">Photos</span>
        <span className="pb-3 text-fg-muted">Reviews mentioning</span>
      </div>

      <section className="mb-14 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        <div className="bg-bg p-5 text-center">
          <p className="font-display text-3xl">{credits.length}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted">Credits</p>
        </div>
        <div className="bg-bg p-5 text-center">
          <p className="font-display text-3xl">{craftCount}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted">Credit types</p>
        </div>
        <div className="bg-bg p-5 text-center">
          <p className="font-display text-3xl">{tvCreditCount}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted">TV credits</p>
        </div>
        <div className="bg-bg p-5 text-center">
          <p className="font-display text-3xl">{filmCreditCount}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted">Film credits</p>
        </div>
      </section>

      {creditGroups.length > 0 ? (
        <div className="space-y-14">
          {creditGroups.map(function (group) {
            return (
              <section key={group.label}>
                <div className="mb-5 flex items-baseline gap-3">
                  <h2 className="font-display text-2xl font-semibold text-fg">{group.label}</h2>
                  <span className="h-px flex-1 border-t border-dashed border-border" />
                </div>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                  {group.items.map(function (credit) {
                    const poster = posterUrl(credit.poster_path, "w342");
                    return (
                      <Link
                        key={(credit.media_type || "movie") + "-" + credit.id}
                        href={creditHref(credit)}
                        className="group"
                      >
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-sunken transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]">
                          {poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={poster}
                              alt={creditTitle(credit)}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-snug text-fg">
                          {creditTitle(credit)}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-fg-muted">
                          {[yearFromDate(creditDate(credit)), creditRole(credit)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section>
          <div className="rounded-sm border border-dashed border-border bg-sunken/40 px-4 py-8 text-center text-[13px] text-fg-muted">
            No filmography available.
          </div>
        </section>
      )}
    </main>
  );
}
