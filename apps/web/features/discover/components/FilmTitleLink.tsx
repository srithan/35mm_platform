"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { tmdbItemToTitlePath } from "@/lib/title/paths";

interface FilmTitleLinkProps {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  film: TMDBMovie;
  onOpen?: (film: TMDBMovie) => void;
}

export function FilmTitleLink({
  ariaLabel,
  children,
  className,
  film,
  onOpen,
}: FilmTitleLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !onOpen ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onOpen(film);
  }

  return (
    <Link
      href={tmdbItemToTitlePath(film)}
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
