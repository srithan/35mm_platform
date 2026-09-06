import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { FilmographyFilters } from "@/features/person/components/FilmographyFilters";
import { PersonShareButton } from "@/features/person/components/PersonShareButton";
import {
  buildFilmographyDecades,
  buildFilmographyDepartments,
  buildFilmographyGenres,
  constrainFilmographyFilters,
  filterAndSortFilmographyCredits,
  filmographyHeadingPrefix,
  filmographyPageTitle,
  filmographyRoleLabel,
  parseFilmographyFilters,
  type FilmographyCredit,
  type PersonCredit,
} from "@/features/person/lib/filmography";
import { ROUTES } from "@/lib/constants/routes";
import { PERSON_PAGE_USE_TWO_COLUMN_LAYOUT } from "@/lib/constants/uiFlags";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb/constants";

export type PersonPageRequest = {
  id: string;
  routeDepartment?: string;
  legacyQueryDepartment?: string | string[];
  filterQuery?: {
    media?: string | string[];
    decade?: string | string[];
    genre?: string | string[];
    sort?: string | string[];
  };
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_PERSON = "https://www.themoviedb.org/person/";
const MAX_VISIBLE_TITLES_PER_DEPARTMENT = 48;

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

const PERSON_REVALIDATE_SECONDS = 86400;

export async function getPersonPageMetadata({
  id,
  routeDepartment,
  legacyQueryDepartment,
}: PersonPageRequest): Promise<Metadata> {
  if (!/^\d+$/.test(id)) {
    return { title: "Person" };
  }
  const person = await fetchPerson(id);
  if (!person) return { title: "Person " + id };

  const departments = buildFilmographyDepartments({
    knownForDepartment: person.known_for_department,
    movieCredits: person.movie_credits,
    tvCredits: person.tv_credits,
  });
  const requested = requestedDepartmentSlug(
    routeDepartment,
    legacyQueryDepartment,
  );
  const selected =
    departments.find((item) => item.slug === requested) || departments[0];
  return {
    title: selected
      ? filmographyPageTitle(selected.label, person.name)
      : person.name,
  };
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
    next: { revalidate: PERSON_REVALIDATE_SECONDS },
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

function creditHref(credit: PersonCredit): string {
  const media =
    credit.media_type === "tv" || credit.first_air_date ? "tv" : "movie";
  return ROUTES.TITLE(media, credit.id);
}

function profileImage(path: string | null): string | null {
  return path ? TMDB_IMAGE_BASE + "/w500" + path : null;
}

function requestedDepartmentSlug(
  routeDepartment: string | undefined,
  legacyQueryDepartment: string | string[] | undefined,
): string | undefined {
  const queryDepartment = Array.isArray(legacyQueryDepartment)
    ? legacyQueryDepartment[0]
    : legacyQueryDepartment;
  const requested = routeDepartment || queryDepartment;
  if (!requested) return undefined;
  const aliases: Record<string, string> = {
    "filmography-acting": "actor",
    acting: "actor",
    "filmography-production": "producer",
    production: "producer",
    "filmography-directing": "director",
    directing: "director",
    "filmography-writing": "writer",
    writing: "writer",
  };
  return aliases[requested.toLowerCase()] || requested.toLowerCase();
}

export async function PersonPageContent({
  id,
  routeDepartment,
  legacyQueryDepartment,
  filterQuery = {},
}: PersonPageRequest) {
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const person = await fetchPerson(id);
  if (!person) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-semibold leading-none text-fg">
          Cast &amp; crew
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
          35mm could not load this person profile. Open TMDB for full
          filmography and photos.
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

  const creditDepartments = buildFilmographyDepartments({
    knownForDepartment: person.known_for_department,
    movieCredits: person.movie_credits,
    tvCredits: person.tv_credits,
  });
  const departmentCredits = creditDepartments.flatMap(
    (department) => department.items,
  );
  const titleCredits = Array.from(
    new Map(
      departmentCredits.map(
        (credit) => [credit.media_type + ":" + credit.id, credit] as const,
      ),
    ).values(),
  ).sort(function (a, b) {
    return creditDate(b).localeCompare(creditDate(a));
  });
  const photo = profileImage(person.profile_path);
  const datedCredits = titleCredits.filter((credit) => creditDate(credit));
  const activeSince = datedCredits.length
    ? yearFromDate(creditDate(datedCredits[datedCredits.length - 1]))
    : "";
  const requestedDepartment = requestedDepartmentSlug(
    routeDepartment,
    legacyQueryDepartment,
  );
  const matchedDepartment = creditDepartments.find(
    (item) => item.slug === requestedDepartment,
  );
  if (routeDepartment && !matchedDepartment) notFound();
  const selectedDepartment = matchedDepartment || creditDepartments[0];
  const decades = selectedDepartment
    ? buildFilmographyDecades(selectedDepartment.items)
    : [];
  const genres = selectedDepartment
    ? buildFilmographyGenres(selectedDepartment.items)
    : [];
  const filters = constrainFilmographyFilters(
    parseFilmographyFilters(filterQuery),
    decades,
    genres,
  );
  const filteredCredits = selectedDepartment
    ? filterAndSortFilmographyCredits(selectedDepartment.items, filters)
    : [];
  const visibleCredits = filteredCredits.slice(
    0,
    MAX_VISIBLE_TITLES_PER_DEPARTMENT,
  );
  const filtersApplied =
    filters.media !== "all" ||
    filters.decade !== "all" ||
    filters.genre !== "all";
  const useTwoColumnLayout = PERSON_PAGE_USE_TWO_COLUMN_LAYOUT;
  const sharePath = selectedDepartment
    ? ROUTES.PERSON_DEPARTMENT(id, selectedDepartment.slug)
    : ROUTES.PERSON(id);
  const shareTitle = selectedDepartment
    ? filmographyPageTitle(selectedDepartment.label, person.name) + " on 35mm"
    : person.name + " on 35mm";

  return (
    <main
      className={
        "mx-auto w-full px-4 pb-16 pt-10 sm:px-6 lg:px-10 " +
        (useTwoColumnLayout ? "max-w-[1280px]" : "max-w-[1400px]")
      }
    >
      <div
        className={
          useTwoColumnLayout
            ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start"
            : "space-y-10"
        }
      >
        <aside
          className={
            useTwoColumnLayout
              ? "order-1 mx-auto w-full max-w-[620px] lg:order-2 lg:sticky lg:top-24 lg:max-w-none"
              : "grid gap-8 md:grid-cols-[260px_1fr] md:items-start lg:gap-10"
          }
        >
          <div
            className={
              "aspect-[2/3] w-full overflow-hidden rounded-sm bg-sunken " +
              (useTwoColumnLayout
                ? "max-w-[220px] lg:max-w-none"
                : "mx-auto max-w-[260px] md:mx-0")
            }
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-6xl text-fg-muted">
                {person.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p
              className={
                "font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-accent " +
                (useTwoColumnLayout ? "mt-5" : "")
              }
            >
              {selectedDepartment
                ? filmographyRoleLabel(selectedDepartment.label)
                : person.known_for_department || "Cast & crew"}
            </p>
            <h1
              className={
                "mt-2 font-display font-semibold leading-none text-fg " +
                (useTwoColumnLayout ? "text-4xl" : "text-5xl md:text-6xl")
              }
            >
              {person.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-fg-muted">
              {person.birthday ? (
                <span>Born {yearFromDate(person.birthday)}</span>
              ) : null}
              {person.place_of_birth ? (
                <span>{person.place_of_birth}</span>
              ) : null}
              <span>{titleCredits.length} titles</span>
              {activeSince ? <span>Active since {activeSince}</span> : null}
            </div>
            {person.biography ? (
              <p
                className={
                  "text-fg-muted " +
                  (useTwoColumnLayout
                    ? "mt-4 line-clamp-[8] text-[13px] leading-relaxed"
                    : "mt-5 max-w-4xl text-[14px] leading-relaxed")
                }
              >
                {person.biography}
              </p>
            ) : null}
            <PersonShareButton path={sharePath} title={shareTitle} />
          </div>
        </aside>

        {selectedDepartment ? (
          <section
            className={
              useTwoColumnLayout ? "order-2 min-w-0 lg:order-1" : "min-w-0"
            }
          >
            <div className="mb-5 min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {filmographyHeadingPrefix(selectedDepartment.label)}
              </p>
              <h2 className="mt-1 text-balance font-display text-3xl font-semibold leading-none text-fg sm:text-4xl">
                {person.name}
              </h2>
              <p className="mt-2 text-[12px] text-fg-muted">
                {filtersApplied
                  ? filteredCredits.length +
                    " of " +
                    selectedDepartment.items.length +
                    " titles"
                  : selectedDepartment.items.length + " titles"}
              </p>
            </div>
            <FilmographyFilters
              personId={id}
              department={selectedDepartment.slug}
              filters={filters}
              decades={decades}
              genres={genres}
              departments={creditDepartments.map(function (department) {
                return {
                  slug: department.slug,
                  label: department.label,
                  count: department.items.length,
                };
              })}
            />
            {visibleCredits.length > 0 ? (
              <div
                className={
                  "mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 " +
                  (useTwoColumnLayout
                    ? "xl:grid-cols-6"
                    : "lg:grid-cols-6 xl:grid-cols-8")
                }
              >
                {visibleCredits.map(function (credit: FilmographyCredit) {
                  const title = creditTitle(credit);
                  const year = yearFromDate(creditDate(credit));
                  const description = [title, year, credit.roles.join(", ")]
                    .filter(Boolean)
                    .join(" · ");
                  const poster = posterUrl(credit.poster_path, "w342");
                  return (
                    <Link
                      key={credit.media_type + "-" + credit.id}
                      href={creditHref(credit)}
                      aria-label={description}
                      title={description}
                      className="group aspect-[2/3] overflow-hidden rounded-sm bg-sunken outline-2 outline-offset-2 transition-[outline-color] duration-150 hover:outline hover:outline-fg/80 focus-visible:outline focus-visible:outline-fg motion-reduce:transition-none"
                    >
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={poster}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center px-3 text-center text-[12px] font-semibold text-fg-muted">
                          {title}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 border-y border-border px-4 py-10 text-center text-[13px] text-fg-muted">
                No titles match these filters.
              </div>
            )}
            {filteredCredits.length > visibleCredits.length ? (
              <p className="mt-5 text-[12px] text-fg-muted">
                Showing {visibleCredits.length} of{" "}
                {filteredCredits.length} matching titles.{" "}
                <a
                  href={TMDB_PERSON + id}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
                >
                  View complete filmography on TMDB
                </a>
              </p>
            ) : null}
          </section>
        ) : (
          <section className={useTwoColumnLayout ? "order-2 lg:order-1" : ""}>
            <div className="rounded-sm border border-dashed border-border bg-sunken/40 px-4 py-8 text-center text-[13px] text-fg-muted">
              No filmography available.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
