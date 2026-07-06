import Image from 'next/image';
import Link from 'next/link';
import { type Film } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useFilm } from '@/hooks/useFilm';
import { formatDateLabel } from '@/lib/utils';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function FilmDetailView({ film, onDelete }: { film: Film; onDelete: () => void }) {
  const { deleteFilm, isDeleting } = useFilm(film.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardContent className="space-y-3">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-black/10">
            {film.posterUrl ? <Image src={film.posterUrl} alt={film.title} fill className="object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No poster</div>}
          </div>
          <div className="space-y-2 text-sm">
            <p>Year: {film.releaseYear ?? '—'}</p>
            <p>Runtime: {film.runtimeMinutes ? `${film.runtimeMinutes}m` : '—'}</p>
            <p>Type: <Badge variant="secondary">{film.type}</Badge></p>
            {film.imdbId ? <p>IMDb: <a className="text-primary underline-offset-4 hover:underline" href={`https://www.imdb.com/title/${film.imdbId}`} target="_blank">{film.imdbId}</a></p> : null}
            <p>Added: {formatDateLabel(film.dateAdded)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between gap-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{film.title}</h1>
            <p className="text-sm text-muted-foreground">{film.originalTitle}</p>
          </div>
          <div className="flex items-start gap-2">
            <Link href={`/films/${film.id}/edit`}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(film.ulid)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy ULID
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete film</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete <strong>{film.title}</strong>? This action cannot be undone and also removes it from all shelves.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel render={<Button variant="outline" type="button">Cancel</Button>} />
                  <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => {
                      deleteFilm(film.id);
                      onDelete();
                    }}
                  >
                    Confirm delete
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <CardTitle>Metadata</CardTitle>
              <dl className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{film.type}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{film.status}</dd>
                <dt className="text-muted-foreground">Languages</dt>
                <dd>{film.languages.join(', ') || '—'}</dd>
                <dt className="text-muted-foreground">Countries</dt>
                <dd>{film.countries.join(', ') || '—'}</dd>
              </dl>
            </div>
            <div>
              <CardTitle>People</CardTitle>
              <p className="text-sm">Directors: {film.directors.map((person) => person.name).join(', ') || '—'}</p>
              <p className="text-sm">Writers: {film.writers.map((person) => person.name).join(', ') || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle>Synopsis</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{film.synopsis || film.shortDescription || 'No synopsis added yet.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle>Cast</CardTitle>
            <ul className="mt-2 text-sm">
              {film.cast.length === 0 ? <li>No cast entries.</li> : null}
              {film.cast.map((member, idx) => (
                <li key={`${member.name}-${idx}`}>
                  {member.name} {member.character ? `— ${member.character}` : ''}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
