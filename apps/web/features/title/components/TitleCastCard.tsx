import Link from "next/link";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { TMDBPerson } from "@/lib/tmdb/types";

export const TITLE_CAST_CARD_SHELL =
  "w-full min-w-0 text-center group outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-fg/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export const TITLE_CAST_AVATAR_SHELL =
  "mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-sunken/80 transition group-hover:border-border-strong group-hover:shadow-md sm:h-[4.5rem] sm:w-[4.5rem]";

type TitleCastCardProps = { person: TMDBPerson; className?: string };

export function TitleCastCard(props: TitleCastCardProps) {
  const person = props.person;
  return (
    <Link
      href={ROUTES.PERSON_ROLE(person.slug || String(person.id), "actor")}
      className={cn(TITLE_CAST_CARD_SHELL, props.className)}
    >
      <div className={TITLE_CAST_AVATAR_SHELL}>
        {person.profile_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl(person.profile_path, "w185") || ""}
            alt={person.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-fg-faint">
            {person.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="line-clamp-2 text-[11px] font-medium text-fg group-hover:underline group-hover:underline-offset-2">
        {person.name}
      </p>
      {person.character ? (
        <p className="line-clamp-2 text-[10px] text-fg-muted">{person.character}</p>
      ) : null}
    </Link>
  );
}

type TitleCastSeeAllCardProps = {
  remainingCount: number;
  onClick: () => void;
  className?: string;
};

export function TitleCastSeeAllCard(props: TitleCastSeeAllCardProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={"See all " + props.remainingCount + " cast members"}
      className={cn(TITLE_CAST_CARD_SHELL, props.className)}
    >
      <div className={TITLE_CAST_AVATAR_SHELL}>
        <span className="font-mono text-sm font-semibold text-fg-muted transition group-hover:text-fg">
          +{props.remainingCount}
        </span>
      </div>
      <p className="line-clamp-2 text-[11px] font-medium text-fg group-hover:underline group-hover:underline-offset-2">
        See all
      </p>
      <p className="line-clamp-2 text-[10px] text-fg-muted">Cast</p>
    </button>
  );
}
