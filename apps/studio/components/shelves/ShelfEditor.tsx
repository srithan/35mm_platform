'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
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
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AddShelfFilmPanel } from './AddShelfFilmPanel';
import { useShelvesQuery } from '@/hooks/useShelves';
import { useFilms } from '@/hooks/useFilms';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { ArrowLeft, Grip, Save } from 'lucide-react';

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
      className="flex items-center gap-2 rounded-lg border bg-card p-2"
    >
      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{index + 1}</span>
      <button
        {...attributes}
        {...listeners}
        className="flex h-7 w-7 items-center justify-center rounded-md border bg-background"
        type="button"
        aria-label={`Reorder ${film.title}`}
      >
        <Grip className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-11 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
          {film.posterUrl ? (
            <Image src={film.posterUrl} width={32} height={48} alt={film.title} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{film.title}</p>
          <p className="text-xs text-muted-foreground">{film.releaseYear ?? '—'} • {film.type}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="hidden sm:inline-flex">{film.type}</Badge>
        <Button size="sm" variant="destructive" className="h-7" onClick={() => onRemove(film.id)}>
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
  const [internalNameTouched, setInternalNameTouched] = useState(Boolean(shelf.id));
  const [description, setDescription] = useState(shelf.description || '');
  const [type, setType] = useState<ShelfType>(shelf.type);
  const [visibility, setVisibility] = useState<ShelfVisibility>(shelf.visibility);
  const [maxFilms, setMaxFilms] = useState<number>(shelf.maxFilms);
  const [filmIds, setFilmIds] = useState<string[]>(shelf.filmIds);
  const [saving, setSaving] = useState(false);

  const { data } = useFilms({ search: '', type: null, year: null }, null, 200);
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

  const handleNameChange = (value: string) => {
    setName(value);
    if (!internalNameTouched) {
      setInternalName(slugify(value));
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() === 's' || event.key === 'Enter') {
      event.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4" onKeyDown={handleEditorKeyDown}>
      <Card className="border-primary/15 bg-muted/20">
        <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md">Shelf</Badge>
              <Badge variant={visibility === 'active' ? 'default' : 'secondary'} className="rounded-md">{visibility}</Badge>
              <Badge variant="secondary" className="rounded-md">{filmIds.length}/{maxFilms}</Badge>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{name || 'Untitled shelf'}</h1>
            <p className="text-sm text-muted-foreground">Build and order shelf films without leaving keyboard flow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="outline" type="button" className="gap-1.5">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <LoadingButton
              onClick={handleSave}
              isLoading={saving || isBusy}
              loadingText="Saving"
              type="button"
            >
              {saving || isBusy ? null : <Save className="size-4" />}
              Save shelf
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle>General settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-6">
            <RequiredLabel htmlFor="shelf-display-name">Display name</RequiredLabel>
            <Input
              id="shelf-display-name"
              className="h-10"
              required
              aria-required="true"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-6">
            <RequiredLabel htmlFor="shelf-internal-name">Internal name</RequiredLabel>
            <Input
              id="shelf-internal-name"
              className="h-10"
              required
              aria-required="true"
              value={internalName}
              onChange={(event) => {
                setInternalNameTouched(true);
                setInternalName(event.target.value);
              }}
            />
          </div>
          <div className="space-y-2 md:col-span-12">
            <Label htmlFor="shelf-description">Description</Label>
            <Input
              id="shelf-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-4">
            <RequiredLabel htmlFor="shelf-type">Shelf type</RequiredLabel>
            <Select value={type} onValueChange={(value) => setType(value as ShelfType)}>
              <SelectTrigger id="shelf-type" className="w-full" aria-required="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ranked">ranked</SelectItem>
                <SelectItem value="editorial">editorial</SelectItem>
                <SelectItem value="algorithmic-override">algorithmic-override</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-4">
            <RequiredLabel htmlFor="shelf-visibility">Visibility</RequiredLabel>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as ShelfVisibility)}>
              <SelectTrigger id="shelf-visibility" className="w-full" aria-required="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <RequiredLabel htmlFor="shelf-max-films">Max films</RequiredLabel>
            <Input
              id="shelf-max-films"
              type="number"
              inputMode="numeric"
              required
              aria-required="true"
              value={maxFilms}
              onChange={(event) => setMaxFilms(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Refresh cadence</Label>
            <div className="flex h-8 items-center rounded-lg border bg-muted/40 px-2 text-sm text-muted-foreground">
              {shelf.refreshCadence}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-3">
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
        <CardContent className="pt-4">
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

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/90 p-2 shadow-lg backdrop-blur">
        <Button onClick={onBack} variant="outline" type="button" className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <LoadingButton
          onClick={handleSave}
          isLoading={saving || isBusy}
          loadingText="Saving"
          aria-keyshortcuts="Meta+S Control+S Meta+Enter Control+Enter"
          type="button"
        >
          {saving || isBusy ? null : <Save className="size-4" />}
          Save shelf
        </LoadingButton>
      </div>
    </div>
  );
}
