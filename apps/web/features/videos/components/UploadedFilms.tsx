"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Film, Play } from "lucide-react";
import { getUploadedFilms } from "../api/videoApi";
import { videoKeys } from "../hooks/queryKeys";

export function UploadedFilms() {
  const { userId, isLoaded, getToken } = useAuth();
  const [mine, setMine] = useState(false);
  const films = useInfiniteQuery({
    queryKey: videoKeys.films(userId ?? null, mine),
    enabled: isLoaded,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      getUploadedFilms(pageParam, mine, await getToken()),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30000,
  });
  return (
    <section className="my-10" aria-label="Uploaded films">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">
          {mine ? "Your films" : "From the community"}
        </h2>
        {userId ? (
          <button
            type="button"
            aria-pressed={mine}
            className="rounded-full border border-border px-4 py-2 text-sm"
            onClick={() => setMine(!mine)}
          >
            {mine ? "Browse community" : "Your films"}
          </button>
        ) : null}
      </div>
      {films.isPending ? (
        <p role="status" className="text-sm text-fg-muted">
          Loading films…
        </p>
      ) : films.error ? (
        <div role="alert" className="text-sm text-accent">
          {films.error.message}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void films.refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {films.data.pages
              .flatMap((page) => page.items)
              .map((film) => (
                <Link
                  key={film.id}
                  href={`/short-films/${film.id}`}
                  className="group block"
                >
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-sunken">
                    {film.thumbnailUrl ? (
                      <img
                        src={film.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-10 w-10 text-fg-faint" aria-hidden />
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/65 p-2 text-white">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold group-hover:text-accent">
                    {film.title}
                  </h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    {film.author.displayName} ·{" "}
                    {Math.ceil((film.durationSeconds ?? 0) / 60)} min
                    {mine ? ` · ${film.visibility}` : ""}
                  </p>
                </Link>
              ))}
          </div>
          {!films.data.pages[0]?.items.length ? (
            <p className="rounded-xl border border-border bg-sunken p-6 text-sm text-fg-muted">
              {mine
                ? "No published films yet."
                : "Be first to share a film with the community."}{" "}
              <Link
                href="/short-films/upload"
                className="text-accent underline"
              >
                Upload a film
              </Link>
            </p>
          ) : null}
          {films.hasNextPage ? (
            <button
              type="button"
              disabled={films.isFetchingNextPage}
              onClick={() => void films.fetchNextPage()}
              className="mt-6 rounded-full border border-border px-5 py-2 text-sm"
            >
              {films.isFetchingNextPage ? "Loading…" : "Load more films"}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
