import Image from 'next/image';
import { type Film } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function FilmCard({ film, onSelect }: { film: Film; onSelect: () => void }) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden py-0 transition-shadow hover:shadow-md"
      onClick={onSelect}
      role="button"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {film.posterUrl ? (
          <Image
            src={film.posterUrl}
            alt={film.title}
            fill
            sizes="200px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No poster</div>
        )}
        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/50">
          <div className="absolute inset-x-0 bottom-0 p-3 text-white opacity-0 transition group-hover:opacity-100">
            <p className="text-sm font-medium">{film.title}</p>
            <p className="text-xs opacity-80">{film.releaseYear ?? '—'}</p>
            <Badge className="mt-2" variant="secondary">{film.type}</Badge>
          </div>
        </div>
      </div>
      <CardContent className="px-3 py-3">
        <p className="truncate text-sm font-medium">{film.title}</p>
        <p className="text-xs text-muted-foreground">
          {film.releaseYear ?? '—'} · {film.type}
        </p>
      </CardContent>
    </Card>
  );
}
