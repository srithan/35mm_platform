"use client";

import { MOCK_SHORT_FILM_SHELVES } from "../data/mockShortFilms";
import { ShortFilmsHero } from "./ShortFilmsHero";
import { ShortFilmsShelfRow } from "./ShortFilmsShelfRow";
import { ShortFilmsUploadStrip } from "./ShortFilmsUploadStrip";

/** Toggle to show the upload film CTA on the catalog page. */
const SHOW_UPLOAD_STRIP = true;

export function ShortFilmsContent() {
  return (
    <div className="bg-bg pb-8 md:pb-12">
      <div className="mx-auto w-full max-w-[var(--shell-main-max-width,1400px)] px-4 md:px-6">
        <ShortFilmsHero />
        <div className={SHOW_UPLOAD_STRIP ? "mt-8 md:mt-10" : "hidden"} aria-hidden={!SHOW_UPLOAD_STRIP}>
          <ShortFilmsUploadStrip />
        </div>
        <div className="mt-10 md:mt-12">
          {MOCK_SHORT_FILM_SHELVES.map(function (shelf) {
            return <ShortFilmsShelfRow key={shelf.id} shelf={shelf} />;
          })}
        </div>
      </div>
    </div>
  );
}
