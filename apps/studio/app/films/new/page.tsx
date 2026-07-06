import { AppShell } from '@/components/layout/AppShell';
import { FilmForm } from '@/components/films/FilmForm';

export default function NewFilmPage() {
  return (
    <AppShell title="Add film">
      <FilmForm />
    </AppShell>
  );
}
