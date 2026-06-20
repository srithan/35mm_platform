"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  useOnboardingSuggestions,
  useResolveOnboardingFilms,
  useSubmitOnboarding,
} from "../hooks/useOnboarding";
import type {
  OnboardingRole,
  ResolveTmdbFilmInput,
} from "../api/onboardingApi";

type StepIndex = 0 | 1 | 2 | 3;

type SelectedFilm = {
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
};

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
};

var ROLE_OPTIONS: Array<{
  value: OnboardingRole;
  label: string;
  emoji: string;
  description: string;
}> = [
  { value: "cinephile", label: "Cinephile", emoji: "🎬", description: "I watch, log, and live for film" },
  { value: "creator", label: "Creator", emoji: "🎥", description: "I make films" },
  { value: "critic", label: "Critic", emoji: "✍️", description: "I write about film" },
  { value: "film_student", label: "Film Student", emoji: "🎓", description: "I'm learning the craft" },
  { value: "industry", label: "Industry", emoji: "🏭", description: "I work in the business" },
];

var GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
  "Foreign",
  "Arthouse",
  "Cult Classic",
  "Silent Film",
  "Short Film",
];

var TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

function slugifyGenre(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function tmdbPoster(path: string | null | undefined): string | null {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}

function releaseYear(date: string | undefined): number | null {
  if (!date) return null;
  var year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

interface OnboardingModalProps {
  onCompleted: () => void;
}

export function OnboardingModal({ onCompleted }: OnboardingModalProps) {
  var [step, setStep] = useState<StepIndex>(0);
  var [direction, setDirection] = useState(1);
  var [role, setRole] = useState<OnboardingRole | null>(null);
  var [headlineContext, setHeadlineContext] = useState("");
  var [query, setQuery] = useState("");
  var [results, setResults] = useState<TmdbMovie[]>([]);
  var [searching, setSearching] = useState(false);
  var [selectedFilms, setSelectedFilms] = useState<SelectedFilm[]>([]);
  var [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  var [followUserIds, setFollowUserIds] = useState<string[]>([]);
  var [submitError, setSubmitError] = useState<string | null>(null);
  var [searchError, setSearchError] = useState<string | null>(null);
  var [celebrating, setCelebrating] = useState(false);

  var suggestionsQuery = useOnboardingSuggestions(step === 3);
  var resolveFilmsMutation = useResolveOnboardingFilms();
  var submitMutation = useSubmitOnboarding();

  var stepTitle = [
    "What's your relationship with film?",
    "Pick up to 5 films you love",
    "What do you love watching?",
    "Follow some people to get started",
  ][step];

  var stepSubtitle = [
    "This shapes your experience on 35mm.",
    "Your taste shapes your feed.",
    "We'll use this to personalise your discover feed.",
    "Your feed will be empty without them.",
  ][step];

  var selectedFilmTmdbSet = useMemo(function () {
    return new Set(selectedFilms.map(function (film) { return film.tmdbId; }));
  }, [selectedFilms]);

  useEffect(function () {
    var originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function () {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(function () {
    var trimmed = query.trim();
    if (step !== 1 || trimmed.length === 0 || selectedFilms.length >= 5) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    var controller = new AbortController();
    var timer = window.setTimeout(async function () {
      setSearching(true);
      setSearchError(null);
      try {
        var response = await fetch(
          `/api/tmdb/search/movie?query=${encodeURIComponent(trimmed)}&include_adult=false&page=1`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Unable to search films");
        var payload = (await response.json()) as { results?: TmdbMovie[] };
        setResults((payload.results ?? []).slice(0, 12));
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "Unable to search films");
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return function () {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, step, selectedFilms.length]);

  function goToStep(next: StepIndex) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setSubmitError(null);
  }

  function toggleGenre(slug: string) {
    setSelectedGenres(function (current) {
      if (current.includes(slug)) {
        return current.filter(function (item) { return item !== slug; });
      }
      if (current.length >= 10) return current;
      return [...current, slug];
    });
  }

  async function handleFilmSelect(movie: TmdbMovie) {
    if (resolveFilmsMutation.isPending) return;
    if (selectedFilms.length >= 5 || selectedFilmTmdbSet.has(movie.id)) return;

    var payload: ResolveTmdbFilmInput = {
      tmdbId: movie.id,
      title: movie.title,
      year: releaseYear(movie.release_date),
      posterUrl: tmdbPoster(movie.poster_path),
      genres: (movie.genre_ids ?? [])
        .map(function (id) {
          return TMDB_GENRE_MAP[id];
        })
        .filter(function (label): label is string {
          return Boolean(label);
        }),
    };

    try {
      var ids = await resolveFilmsMutation.mutateAsync([payload]);
      var resolvedId = ids[0];
      if (!resolvedId) return;
      setSelectedFilms(function (current) {
        if (current.some(function (item) { return item.id === resolvedId; })) {
          return current;
        }
        return [
          ...current,
          {
            id: resolvedId,
            tmdbId: movie.id,
            title: movie.title,
            year: releaseYear(movie.release_date),
            posterUrl: tmdbPoster(movie.poster_path),
            genres: payload.genres,
          },
        ];
      });
      setQuery("");
      setResults([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not add film");
    }
  }

  function removeFilm(filmId: string) {
    setSelectedFilms(function (current) {
      return current.filter(function (film) { return film.id !== filmId; });
    });
  }

  function toggleFollow(userId: string) {
    setFollowUserIds(function (current) {
      if (current.includes(userId)) {
        return current.filter(function (id) { return id !== userId; });
      }
      return [...current, userId];
    });
  }

  function followAll() {
    var ids = (suggestionsQuery.data ?? []).map(function (user) { return user.id; });
    setFollowUserIds(ids);
  }

  async function completeOnboarding() {
    if (!role || submitMutation.isPending) return;
    setSubmitError(null);

    try {
      await submitMutation.mutateAsync({
        role,
        headlineContext: role === "cinephile" ? undefined : headlineContext.trim() || undefined,
        favoriteFilmIds: selectedFilms.map(function (film) { return film.id; }),
        favoriteGenreIds: selectedGenres,
        followUserIds,
      });

      setCelebrating(true);
      window.setTimeout(function () {
        onCompleted();
      }, 640);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to finish onboarding");
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full items-center justify-center px-3 py-4 sm:px-6 sm:py-8">
          <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-center gap-2">
                {[0, 1, 2, 3].map(function (dot) {
                  var active = dot <= step;
                  return (
                    <span
                      key={dot}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all",
                        active ? "bg-fg" : "bg-neutral-300"
                      )}
                    />
                  );
                })}
              </div>

              <h2 className="font-display-discover text-[32px] leading-[1.1] text-[#171717]">
                {stepTitle}
              </h2>
              <p className="mt-2 text-[14px] text-[#5e5e5e]">{stepSubtitle}</p>

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="mt-6"
                >
                  {step === 0 ? (
                    <div>
                      <div className="grid grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map(function (option) {
                          var selected = role === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={cn(
                                "rounded-xl p-3.5 text-left transition-colors",
                                selected
                                  ? "border border-fg bg-neutral-100"
                                  : "border border-neutral-200 bg-white hover:border-neutral-300"
                              )}
                              onClick={function () {
                                setRole(option.value);
                              }}
                            >
                              <div className="text-[20px]">{option.emoji}</div>
                              <p className="mt-2 text-[14px] font-semibold text-[#1f1f1f]">{option.label}</p>
                              <p className="mt-1 text-[12px] text-[#666]">{option.description}</p>
                            </button>
                          );
                        })}
                      </div>

                      {role !== "cinephile" ? (
                        <input
                          type="text"
                          value={headlineContext}
                          onChange={function (event) {
                            setHeadlineContext(event.target.value.slice(0, 25));
                          }}
                          maxLength={25}
                          placeholder="Add context... (25 chars max)"
                          className="mt-4 h-11 w-full rounded-xl border border-neutral-200 px-3 text-[14px] text-[#222] outline-none focus:border-fg"
                        />
                      ) : null}

                      <button
                        type="button"
                        onClick={function () {
                          if (!role) return;
                          goToStep(1);
                        }}
                        disabled={!role}
                        className="mt-5 h-11 w-full rounded-xl bg-fg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Continue
                      </button>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div>
                      <div className="rounded-xl border border-neutral-200 p-3">
                        <input
                          type="text"
                          value={query}
                          onChange={function (event) {
                            setQuery(event.target.value);
                          }}
                          disabled={selectedFilms.length >= 5}
                          placeholder={selectedFilms.length >= 5 ? "5 max" : "Search films..."}
                          className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-[14px] outline-none focus:border-fg disabled:bg-neutral-100"
                        />
                        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                          {searching ? (
                            <div className="flex items-center gap-2 px-2 py-2 text-[13px] text-[#666]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Searching...
                            </div>
                          ) : null}
                          {!searching && query.trim().length > 0 && results.length === 0 && !searchError ? (
                            <p className="px-2 py-2 text-[13px] text-[#777]">No films found</p>
                          ) : null}
                          {searchError ? (
                            <p className="px-2 py-2 text-[13px] text-[#a03a2f]">{searchError}</p>
                          ) : null}
                          {!searching && results.map(function (movie) {
                            var alreadySelected = selectedFilmTmdbSet.has(movie.id);
                            return (
                              <button
                                key={movie.id}
                                type="button"
                                onClick={function () {
                                  void handleFilmSelect(movie);
                                }}
                                disabled={alreadySelected}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 disabled:opacity-40"
                                )}
                              >
                                <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-neutral-200">
                                  {movie.poster_path ? (
                                    <Image
                                      src={tmdbPoster(movie.poster_path) ?? ""}
                                      alt={movie.title}
                                      width={40}
                                      height={56}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-medium text-[#1e1e1e]">{movie.title}</p>
                                  <p className="text-[12px] text-[#6a6a6a]">{releaseYear(movie.release_date) ?? "—"}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedFilms.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedFilms.map(function (film) {
                            return (
                              <button
                                key={film.id}
                                type="button"
                                onClick={function () {
                                  removeFilm(film.id);
                                }}
                                className="group relative h-16 w-12 overflow-hidden rounded-lg border border-neutral-200"
                                title={`Remove ${film.title}`}
                              >
                                {film.posterUrl ? (
                                  <Image
                                    src={film.posterUrl}
                                    alt={film.title}
                                    width={48}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="block h-full w-full bg-neutral-200" />
                                )}
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  Remove
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={function () {
                          goToStep(2);
                        }}
                        className="mt-5 h-11 w-full rounded-xl bg-fg text-[14px] font-semibold text-white"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={function () {
                          goToStep(2);
                        }}
                        className="mt-3 w-full text-[12px] font-medium text-[#7a7a7a] underline underline-offset-2"
                      >
                        Skip for now
                      </button>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map(function (label) {
                          var slug = slugifyGenre(label);
                          var selected = selectedGenres.includes(slug);
                          return (
                            <button
                              key={slug}
                              type="button"
                              onClick={function () {
                                toggleGenre(slug);
                              }}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-[13px] transition-colors",
                                selected
                                  ? "bg-fg text-white"
                                  : "border border-neutral-300 text-[#545454] hover:border-neutral-400"
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[12px] text-[#777]">Up to 10 genres.</p>
                      <button
                        type="button"
                        onClick={function () {
                          goToStep(3);
                        }}
                        className="mt-5 h-11 w-full rounded-xl bg-fg text-[14px] font-semibold text-white"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={function () {
                          goToStep(3);
                        }}
                        className="mt-3 w-full text-[12px] font-medium text-[#7a7a7a] underline underline-offset-2"
                      >
                        Skip for now
                      </button>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div>
                      <div className="mb-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={followAll}
                          className="text-[12px] font-semibold text-fg underline underline-offset-2"
                        >
                          Follow all
                        </button>
                      </div>
                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-neutral-200 p-2">
                        {suggestionsQuery.isLoading ? (
                          <div className="flex items-center gap-2 px-2 py-3 text-[13px] text-[#666]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading suggestions...
                          </div>
                        ) : null}
                        {suggestionsQuery.data?.map(function (person) {
                          var selected = followUserIds.includes(person.id);
                          return (
                            <div key={person.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-100">
                              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                                {person.avatarUrl ? (
                                  <Image
                                    src={person.avatarUrl}
                                    alt={person.displayName}
                                    width={44}
                                    height={44}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-[#555]">
                                    {person.displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold text-[#1f1f1f]">{person.displayName}</p>
                                <p className="truncate text-[12px] text-[#666]">@{person.username}</p>
                                {person.role ? (
                                  <p className="truncate text-[11px] text-[#8a8a8a]">{person.role}</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={function () {
                                  toggleFollow(person.id);
                                }}
                                className={cn(
                                  "h-8 rounded-full px-3 text-[12px] font-semibold",
                                  selected
                                    ? "bg-fg text-white"
                                    : "border border-neutral-300 text-[#555]"
                                )}
                              >
                                {selected ? "Following" : "Follow"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={function () {
                          void completeOnboarding();
                        }}
                        disabled={submitMutation.isPending}
                        className="mt-5 h-11 w-full rounded-xl bg-fg text-[14px] font-semibold text-white disabled:opacity-60"
                      >
                        {submitMutation.isPending ? "Saving..." : "Let's go"}
                      </button>
                      <button
                        type="button"
                        onClick={function () {
                          void completeOnboarding();
                        }}
                        disabled={submitMutation.isPending}
                        className="mt-3 w-full text-[12px] font-medium text-[#7a7a7a] underline underline-offset-2"
                      >
                        Skip, I'll find people later
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {submitError ? (
                <p className="mt-4 text-[12px] text-[#b24133]">{submitError}</p>
              ) : null}
            </div>

            <AnimatePresence>
              {celebrating ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-white/92"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="text-center"
                  >
                    <div className="text-[54px]">🎬</div>
                    <p className="mt-2 font-display-discover text-[26px] text-[#1d1d1d]">Welcome to 35mm</p>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
