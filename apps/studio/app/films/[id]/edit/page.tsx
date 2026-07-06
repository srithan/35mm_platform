'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useFilm } from '@/hooks/useFilm';
import { FilmForm } from '@/components/films/FilmForm';

export default function EditFilmPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const { data: film } = useFilm(id);

  if (!film) {
    return (
      <AppShell title="Edit film">
        <p className="text-sm">Loading film…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Edit ${film.title}`}>
      <FilmForm film={film} filmId={id} />
    </AppShell>
  );
}
