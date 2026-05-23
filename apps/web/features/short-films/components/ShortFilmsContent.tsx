"use client";

import { MOCK_SHORT_FILM_SHELVES } from "../data/mockShortFilms";
import { ShortFilmsHero } from "./ShortFilmsHero";
import { ShortFilmsShelfRow } from "./ShortFilmsShelfRow";

export function ShortFilmsContent() {
  return (
    <div className="pb-8 md:pb-12 bg-bg">
      <ShortFilmsHero />
      <div>
        {MOCK_SHORT_FILM_SHELVES.map(function (shelf) {
          return <ShortFilmsShelfRow key={shelf.id} shelf={shelf} />;
        })}
      </div>
    </div>
  );
}
