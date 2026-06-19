"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { MOCK_SHORT_FILM_SHELVES } from "../data/mockShortFilms";
import { ShortFilmsHero } from "./ShortFilmsHero";
import { ShortFilmsShelfRow } from "./ShortFilmsShelfRow";

function UploadFilmBanner() {
  return (
    <div className="mx-4 mb-8 md:mx-6 md:mb-10">
      <Link
        href={ROUTES.SHORT_FILMS_UPLOAD}
        className="group flex items-center justify-between gap-4 rounded-2xl bg-[#0a0908] px-5 py-4 text-white ring-1 ring-white/[0.06] transition hover:ring-white/12 sm:px-6 sm:py-5"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/90">Submit your work</p>
          <p className="mt-0.5 text-[12px] text-white/45">
            Upload a short film to 35mm
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0a0908] transition group-hover:bg-white/90">
          Upload
        </span>
      </Link>
    </div>
  );
}

export function ShortFilmsContent() {
  return (
    <div className="pb-8 md:pb-12 bg-bg">
      <ShortFilmsHero />
      <UploadFilmBanner />
      <div>
        {MOCK_SHORT_FILM_SHELVES.map(function (shelf) {
          return <ShortFilmsShelfRow key={shelf.id} shelf={shelf} />;
        })}
      </div>
    </div>
  );
}
