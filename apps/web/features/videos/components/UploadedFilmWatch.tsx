"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUploadedFilm, deleteVideo } from "../api/videoApi";
import { videoKeys } from "../hooks/queryKeys";
import { BunnyVideoPlayer } from "./BunnyVideoPlayer";

export function UploadedFilmWatch({ filmId }: { filmId: string }) {
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: videoKeys.film(filmId, userId ?? null),
    enabled: isLoaded,
    queryFn: async () => getUploadedFilm(filmId, await getToken()),
    retry: false,
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!query.data) throw new Error("Film unavailable");
      return deleteVideo(query.data.assetId, await getToken());
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: videoKeys.all });
      router.push("/70mm");
    },
  });
  if (query.isPending)
    return (
      <p role="status" className="p-8 text-fg-muted">
        Loading film…
      </p>
    );
  if (query.error)
    return (
      <div role="alert" className="p-8">
        <p>{query.error.message}</p>
        <Link href="/70mm" className="mt-4 inline-block text-accent">
          Browse films
        </Link>
      </div>
    );
  const film = query.data;
  return (
    <article className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <Link
        href="/70mm"
        className="mb-5 inline-block text-sm text-fg-muted"
      >
        ← 70mm
      </Link>
      <BunnyVideoPlayer assetId={film.assetId} title={film.title} />
      <div className="my-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">{film.title}</h1>
          <p className="mt-2 text-sm text-fg-muted">
            <Link href={`/${film.author.username}`}>
              {film.author.displayName}
            </Link>{" "}
            · {Math.ceil((film.durationSeconds ?? 0) / 60)} min
            {film.year ? ` · ${film.year}` : ""}
          </p>
        </div>
        {film.isOwner ? (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="rounded-full border border-border px-4 py-2 text-sm text-accent"
          >
            {remove.isPending ? "Removing…" : "Remove film"}
          </button>
        ) : null}
      </div>
      {remove.error ? (
        <p role="alert" className="text-sm text-accent">
          {remove.error.message}
        </p>
      ) : null}
      {film.isOwner ? (
        <p className="mb-4 text-sm text-fg-muted">
          Visibility: {film.visibility}
          {new Date(film.releaseAt).getTime() > Date.now()
            ? ` · Scheduled for ${new Date(film.releaseAt).toLocaleString()}`
            : ""}
        </p>
      ) : null}
      {film.tagline ? (
        <p className="mb-3 font-display text-xl">{film.tagline}</p>
      ) : null}
      <p className="whitespace-pre-wrap text-base leading-relaxed">
        {film.description}
      </p>
      <div className="my-5 flex flex-wrap gap-2">
        {film.genres.map((genre) => (
          <span
            key={genre}
            className="rounded-full bg-sunken px-3 py-1 text-sm"
          >
            {genre}
          </span>
        ))}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[
          ["Director", film.director],
          ["Language", film.language],
          ["Country", film.country],
          ["Content rating", film.contentRating],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-fg-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {film.festivalNotes ? (
        <p className="mt-5 text-sm text-fg-muted">{film.festivalNotes}</p>
      ) : null}
    </article>
  );
}
