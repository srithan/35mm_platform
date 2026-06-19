"use client";

import { MOCK_SHORT_FILM_SHELVES } from "../data/mockShortFilms";
import { ShortFilmsHero } from "./ShortFilmsHero";
import { ShortFilmsShelfRow } from "./ShortFilmsShelfRow";
import { ShortFilmsUploadStrip } from "./ShortFilmsUploadStrip";

/** Toggle to show the upload film CTA on the catalog page. */
const SHOW_UPLOAD_STRIP = true;

export function ShortFilmsContent() {
  return (
    <div className="pb-8 md:pb-12 bg-bg">
      <ShortFilmsHero />
      <div className={SHOW_UPLOAD_STRIP ? undefined : "hidden"} aria-hidden={!SHOW_UPLOAD_STRIP}>
        <ShortFilmsUploadStrip />
      </div>
      <div>
        {MOCK_SHORT_FILM_SHELVES.map(function (shelf) {
          return <ShortFilmsShelfRow key={shelf.id} shelf={shelf} />;
        })}
      </div>
    </div>
  );
}
