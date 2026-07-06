'use client';

import { useMemo, useState } from 'react';
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { type Film, type Shelf, type ShelfType, type ShelfVisibility } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AddShelfFilmPanel } from './AddShelfFilmPanel';
import { useShelvesQuery } from '@/hooks/useShelves';
import { useFilms } from '@/hooks/useFilms';
import { toast } from 'sonner';
import { Grip, ArrowRightLeft } from 'lucide-react';

function SortableRow({ id, film, onRemove, index }: { id: string; film: Film; onRemove: (id: string) => void; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[40px_40px_1fr_auto] items-center gap-2 rounded border border p-2"
    >
      <span className="text-sm text-muted-foreground">{index + 1}</span>
      <button
        {...attributes}
        {...listeners}
        className="h-6 w-6 rounded border border flex items-center justify-center"
        type="button"
      >
        <Grip className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <div className="h-10 w-8 overflow-hidden rounded">
          {film.posterUrl ? (
            <Image src={film.posterUrl} width={32} height={48} alt={film.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs">No poster</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{film.title}</p>
          <p className="text-xs text-muted-foreground">{film.releaseYear ?? '—'} • {film.type}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{film.type}</Badge>
        <Button size="sm" variant="destructive" onClick={() => onRemove(film.id)}>
          Remove
        </Button>
      </div>
    </li>
  );
}

export function ShelfEditor({ shelf, onBack }: { shelf: Shelf; onBack: () => void }) {
  const { updateShelfAsync, isBusy, createShelfAsync } = useShelvesQuery();
  const [name, setName] = useState(shelf.displayName);
  const [internalName, setInternalName] = useState(shelf.internalName);
  const [description, setDescription] = useState(shelf.description || '');
  const [type, setType] = useState<ShelfType>(shelf.type);
  const [visibility, setVisibility] = useState<ShelfVisibility>(shelf.visibility);
  const [maxFilms, setMaxFilms] = useState<number>(shelf.maxFilms);
  const [filmIds, setFilmIds] = useState<string[]>(shelf.filmIds);
  const [saving, setSaving] = useState(false);

  const { data } = useFilms({ search: '', types: [], genres: [], yearMin: null, yearMax: null, hasPoster: null }, 0, 200);
  const films = data?.items || [];
  const filmLookup = useMemo(() => {
    const map = new Map<string, Film>();
    films.forEach((film) => map.set(film.id, film));
    return map;
  }, [films]);

  const orderedFilms = filmIds
    .map((id) => filmLookup.get(id))
    .filter((film): film is Film => Boolean(film));

  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }
    const oldIndex = filmIds.indexOf(String(event.active.id));
    const newIndex = filmIds.indexOf(String(event.over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    setFilmIds(arrayMove(filmIds, oldIndex, newIndex));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Omit<Shelf, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        displayName: name,
        internalName,
        description: description || undefined,
        type,
        visibility,
        maxFilms,
        refreshCadence: shelf.refreshCadence,
        filmIds,
      };
      if (shelf.id) {
        await updateShelfAsync({ id: shelf.id, patch: payload });
      } else {
        await createShelfAsync(payload);
      }
      toast.success('Shelf saved');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFilm = (filmId: string) => {
    setFilmIds((current) => current.filter((entry) => entry !== filmId));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            General settings
            <span className="text-sm text-muted-foreground">{visibility}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Display Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label>Internal Name</Label>
            <Input value={internalName} onChange={(event) => setInternalName(event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div>
            <Label>Shelf Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ShelfType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ranked">ranked</SelectItem>
                <SelectItem value="editorial">editorial</SelectItem>
                <SelectItem value="algorithmic-override">algorithmic-override</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as ShelfVisibility)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max films</Label>
            <Input type="number" value={maxFilms} onChange={(event) => setMaxFilms(Number(event.target.value))} />
          </div>
          <div>
            <Label>Refresh cadence</Label>
            <p className="text-sm text-muted-foreground">{shelf.refreshCadence}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Shelf films ({orderedFilms.length}/{maxFilms})</CardTitle>
          <AddShelfFilmPanel
            existingFilmIds={filmIds}
            onAdd={(film) => {
              setFilmIds((current) => {
                if (current.includes(film.id)) {
                  return current;
                }
                return [...current, film.id];
              });
            }}
          />
        </CardHeader>
        <CardContent>
          {orderedFilms.length === 0 ? <p className="text-sm text-muted-foreground">No films assigned yet.</p> : null}
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))}
          >
            <SortableContext items={orderedFilms.map((film) => film.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {orderedFilms.map((film, index) => (
                  <SortableRow
                    key={film.id}
                    id={film.id}
                    film={film}
                    index={index}
                    onRemove={handleRemoveFilm}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={onBack} variant="outline" type="button">
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving || isBusy} className="inline-flex items-center gap-2" type="button">
          {saving ? <ArrowRightLeft className="h-4 w-4" /> : null}
          Save Shelf
        </Button>
      </div>
    </div>
  );
}
