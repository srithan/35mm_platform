import Link from "next/link";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { TMDBPerson } from "@/lib/tmdb/types";

type TitleCastCardProps = { person: TMDBPerson; className?: string };

export function TitleCastCard(props: TitleCastCardProps) {
  const person = props.person;
  return (
    <Link
      href={ROUTES.PERSON(person.id)}
      className={cn(
        "w-full min-w-0 text-center group outline-none",
        "rounded-lg focus-visible:ring-2 focus-visible:ring-fg/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        props.className
      )}
    >
      <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-sunken/80 transition group-hover:border-border-strong group-hover:shadow-md sm:h-[4.5rem] sm:w-[4.5rem]">
        {person.profile_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl(person.profile_path, "w185") || ""}
            alt={person.name}
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
