'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { FilmDetailView } from '@/components/films/FilmDetail';
import { useFilm } from '@/hooks/useFilm';

export default function FilmDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const { data: film } = useFilm(id);
  const router = useRouter();

  if (!film) {
    return (
      <AppShell title="Film detail">
        <p className="text-sm">Loading film…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={film.title}>
      <FilmDetailView
        film={film}
        onDelete={() => {
          router.push('/films');
        }}
      />
    </AppShell>
  );
}
