'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { FILM_TYPES, CONTENT_WARNINGS, FILM_STATUS, type ContentWarning, type Film, type FilmSource } from '@/lib/types';
import { filmFormSchema, type FilmFormValues } from '@/lib/schemas';
import { slugify, randomUlid } from '@/lib/utils';
import { useFilms } from '@/hooks/useFilms';
import { ExternalFilmSearch } from './ExternalFilmSearch';

const genreOptions = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
  'Other',
];

type AutofillKey =
  | 'title'
  | 'originalTitle'
  | 'releaseYear'
  | 'slug'
  | 'genres'
  | 'directors'
  | 'posterUrl'
  | 'backdropUrl'
  | 'shortDescription'
  | 'synopsis'
  | 'tagline'
  | 'imdbId'
  | 'tmdbId'
  | 'runtimeMinutes';

type FormErrorSummary = { field: string; message: string };

const trim = (value?: string): string => value?.trim() ?? '';

const normalizeTextList = (value?: string[] | null): string[] =>
  (value || []).map((entry) => entry.trim()).filter(Boolean);

const normalizeDirectorRows = (rows: Array<{ name?: string; personId?: string }>): Array<{ name: string; personId?: string }> =>
  rows
    .map((row) => ({ name: trim(row.name), personId: row.personId?.trim() || undefined }))
    .filter((row) => row.name.length > 0);

const normalizeWriterRows = (rows: Array<{ name?: string; personId?: string }>): Array<{ name: string; personId?: string }> =>
  rows
    .map((row) => ({ name: trim(row.name), personId: row.personId?.trim() || undefined }))
    .filter((row) => row.name.length > 0);

const normalizeCastRows = (
  rows: Array<{ name?: string; character?: string; personId?: string; billingOrder?: number }>,
): Array<{ name: string; character?: string; personId?: string; billingOrder?: number }> =>
  rows
    .map((row) => ({
      name: trim(row.name),
      character: trim(row.character) || undefined,
      personId: row.personId?.trim() || undefined,
      billingOrder: row.billingOrder && row.billingOrder > 0 ? row.billingOrder : undefined,
    }))
    .filter((row) => row.name.length > 0);

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const setToOptionalNumber = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return undefined;
  }
  return value;
};

const collectErrors = (value: unknown, prefix: string, out: FormErrorSummary[]) => {
  if (!value || typeof value !== 'object') {
    return;
  }
  const source = value as Record<string, unknown>;
  Object.entries(source).forEach(([key, next]) => {
    if (next && typeof next === 'object' && 'message' in (next as Record<string, unknown>)) {
      const message = (next as { message?: string }).message;
      if (typeof message === 'string') {
        out.push({ field: [prefix, key].filter(Boolean).join('.'), message });
        return;
      }
    }
    collectErrors(next, [prefix, key].filter(Boolean).join('.'), out);
  });
};

export function FilmForm({ film, filmId }: { film?: Film; filmId?: string }) {
  const router = useRouter();

  const defaults: FilmFormValues = film
    ? {
        title: film.title,
        originalTitle: film.originalTitle || '',
        slug: film.slug,
        type: film.type,
        status: film.status,
        imdbId: film.imdbId || '',
        tmdbId: film.tmdbId,
        releaseYear: film.releaseYear,
        releaseDate: film.releaseDate || '',
        runtimeMinutes: film.runtimeMinutes,
        seasonCount: film.seasonCount,
        episodeCount: film.episodeCount,
        episodeRuntimeMinutes: film.episodeRuntimeMinutes,
        tagline: film.tagline || '',
        shortDescription: film.shortDescription || '',
        synopsis: film.synopsis || '',
        posterUrl: film.posterUrl || '',
        backdropUrl: film.backdropUrl || '',
        trailerUrl: film.trailerUrl || '',
        genres: [...film.genres],
        languages: [...film.languages],
        countries: [...film.countries],
        directors: normalizeDirectorRows([...film.directors]),
        writers: normalizeWriterRows([...film.writers]),
        cast: normalizeCastRows([...film.cast]),
        studios: [...film.studios],
        images: [...film.images],
        tags: normalizeTextList([...film.tags]),
        contentWarnings: [...film.contentWarnings],
        isShortFilm: film.isShortFilm,
        featured: film.featured,
        adminNotes: film.adminNotes || '',
      }
    : {
        title: '',
        originalTitle: '',
        slug: '',
        type: 'feature',
        status: 'released',
        imdbId: '',
        tmdbId: undefined,
        releaseYear: undefined,
        releaseDate: '',
        runtimeMinutes: undefined,
        seasonCount: undefined,
        episodeCount: undefined,
        episodeRuntimeMinutes: undefined,
        tagline: '',
        shortDescription: '',
        synopsis: '',
        posterUrl: '',
        backdropUrl: '',
        trailerUrl: '',
        genres: [],
        languages: ['English'],
        countries: [],
        directors: [{ name: '' }],
        writers: [],
        cast: [],
        studios: [],
        images: [],
        tags: [],
        contentWarnings: [] as ContentWarning[],
        isShortFilm: false,
        featured: false,
        adminNotes: '',
      };

  const { createFilmAsync, updateFilmAsync } = useFilms(
    {
      search: '',
      types: [],
      genres: [],
      yearMin: null,
      yearMax: null,
      hasPoster: null,
    },
    0,
    25,
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FilmFormValues>({
    resolver: zodResolver(filmFormSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  const [draftSaved, setDraftSaved] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrorSummary[]>([]);
  const [autoFilled, setAutoFilled] = useState<Set<AutofillKey>>(new Set());
  const [autoFillSource, setAutoFillSource] = useState('external');
  const [isPublishing, setIsPublishing] = useState(false);

  const { fields: directors, append: addDirector, remove: removeDirector } = useFieldArray({
    control,
    name: 'directors',
  });
  const { fields: writers, append: addWriter, remove: removeWriter } = useFieldArray({
    control,
    name: 'writers',
  });
  const { fields: cast, append: addCast, remove: removeCast } = useFieldArray({
    control,
    name: 'cast',
  });
  const typeValue = useWatch({ control, name: 'type' });
  const titleValue = useWatch({ control, name: 'title' }) || '';
  const shortDescription = useWatch({ control, name: 'shortDescription' }) || '';
  const runtimeMinutes = useWatch({ control, name: 'runtimeMinutes' });
  const posterUrl = useWatch({ control, name: 'posterUrl' }) || '';
  const backdropUrl = useWatch({ control, name: 'backdropUrl' }) || '';
  const genresValue = useWatch({ control, name: 'genres' }) || [];
  const languages = useWatch({ control, name: 'languages' }) || [];
  const countries = useWatch({ control, name: 'countries' }) || [];
  const tags = useWatch({ control, name: 'tags' }) || [];
  const contentWarnings = useWatch({ control, name: 'contentWarnings' }) || [];
  const studios = useWatch({ control, name: 'studios' }) || [];
  const images = useWatch({ control, name: 'images' }) || [];
  const addImage = () => {
    setValue('images', [...images, ''], { shouldDirty: true });
  };
  const removeImage = (index: number) => {
    setValue(
      'images',
      images.filter((_, itemIndex) => itemIndex !== index),
      { shouldDirty: true },
    );
  };

  useEffect(() => {
    if (!film?.slug && titleValue) {
      setValue('slug', slugify(titleValue));
    }
  }, [film?.slug, titleValue, setValue]);

  useEffect(() => {
    if (!filmId) {
      const draftKey = '35mm-film-draft-new';
      if (typeof window === 'undefined') {
        return;
      }
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw) as FilmFormValues;
          reset(parsed);
        }
      } catch {
        // ignore invalid draft
      }
    }
  }, [filmId, reset]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (typeValue === 'short' && !isDirty) {
      setValue('isShortFilm', true);
    }
  }, [typeValue, isDirty, setValue]);

  const autoFilledBadge = (field: AutofillKey) =>
    autoFilled.has(field) ? <Badge className="ml-2 bg-emerald-100 text-emerald-700">Auto-filled from {autoFillSource}</Badge> : null;

  const markAuto = (keys: AutofillKey[]) => {
    setAutoFillSource('external');
    setAutoFilled(new Set(keys));
  };

  const setFromExternal = (item: Partial<Film>) => {
    const touched: AutofillKey[] = [];

    if (item.title) {
      setValue('title', item.title, { shouldDirty: true });
      touched.push('title');
    }
    if (item.originalTitle) {
      setValue('originalTitle', item.originalTitle, { shouldDirty: true });
      touched.push('originalTitle');
    }
    if (item.releaseYear !== undefined) {
      setValue('releaseYear', item.releaseYear, { shouldDirty: true });
      touched.push('releaseYear');
    }
    if (item.slug) {
      setValue('slug', item.slug, { shouldDirty: true });
      touched.push('slug');
    }
    if (item.type) {
      setValue('type', item.type, { shouldDirty: true });
    }
    if (item.genres?.length) {
      setValue('genres', [...item.genres], { shouldDirty: true });
      touched.push('genres');
    }
    if (item.directors?.length) {
      const list = normalizeDirectorRows(item.directors);
      if (list.length > 0) {
        setValue('directors', list, { shouldDirty: true });
        touched.push('directors');
      }
    }
    if (item.writers?.length) {
      setValue('writers', normalizeWriterRows(item.writers), { shouldDirty: true });
    }
    if (item.cast?.length) {
      setValue('cast', normalizeCastRows(item.cast), { shouldDirty: true });
    }
    if (item.posterUrl) {
      setValue('posterUrl', item.posterUrl, { shouldDirty: true });
      touched.push('posterUrl');
    }
    if (item.backdropUrl) {
      setValue('backdropUrl', item.backdropUrl, { shouldDirty: true });
      touched.push('backdropUrl');
    }
    if (item.shortDescription) {
      setValue('shortDescription', item.shortDescription, { shouldDirty: true });
      touched.push('shortDescription');
    }
    if (item.synopsis) {
      setValue('synopsis', item.synopsis, { shouldDirty: true });
      touched.push('synopsis');
    }
    if (item.tagline) {
      setValue('tagline', item.tagline, { shouldDirty: true });
      touched.push('tagline');
    }
    if (item.imdbId) {
      setValue('imdbId', item.imdbId, { shouldDirty: true });
      touched.push('imdbId');
    }
    if (item.tmdbId !== undefined) {
      setValue('tmdbId', item.tmdbId, { shouldDirty: true });
      touched.push('tmdbId');
    }
    if (item.runtimeMinutes !== undefined) {
      setValue('runtimeMinutes', item.runtimeMinutes, { shouldDirty: true });
      touched.push('runtimeMinutes');
    }
    if (item.seasonCount !== undefined) {
      setValue('seasonCount', item.seasonCount, { shouldDirty: true });
    }
    if (item.episodeCount !== undefined) {
      setValue('episodeCount', item.episodeCount, { shouldDirty: true });
    }
    if (item.episodeRuntimeMinutes !== undefined) {
      setValue('episodeRuntimeMinutes', item.episodeRuntimeMinutes, { shouldDirty: true });
    }
    if (item.languages?.length) {
      setValue('languages', [...item.languages], { shouldDirty: true });
    }
    if (item.countries?.length) {
      setValue('countries', [...item.countries], { shouldDirty: true });
    }
    if (item.contentWarnings?.length) {
      setValue('contentWarnings', [...item.contentWarnings], { shouldDirty: true });
    }
    if (item.images?.length) {
      setValue('images', [...item.images], { shouldDirty: true });
    }
    if (item.studios?.length) {
      setValue('studios', [...item.studios], { shouldDirty: true });
    }
    markAuto(touched);
    toast.success('Auto-filled from external source');
  };

  const buildPayload = (values: FilmFormValues): Omit<Film, 'id' | 'ulid' | 'addedAt' | 'dateAdded' | 'updatedAt'> => {
    const payload: Omit<Film, 'id' | 'ulid' | 'addedAt' | 'dateAdded' | 'updatedAt'> = {
      title: trim(values.title),
      originalTitle: trim(values.originalTitle) || undefined,
      slug: trim(values.slug) || slugify(values.title),
      type: values.type,
      status: values.status,
      imdbId: trim(values.imdbId) || undefined,
      tmdbId: values.tmdbId,
      releaseYear: values.releaseYear,
      releaseDate: trim(values.releaseDate) || undefined,
      runtimeMinutes: values.runtimeMinutes,
      seasonCount: values.seasonCount,
      episodeCount: values.episodeCount,
      episodeRuntimeMinutes: values.episodeRuntimeMinutes,
      tagline: trim(values.tagline) || undefined,
      shortDescription: trim(values.shortDescription) || undefined,
      synopsis: trim(values.synopsis) || undefined,
      posterUrl: trim(values.posterUrl) || undefined,
      backdropUrl: trim(values.backdropUrl) || undefined,
      trailerUrl: trim(values.trailerUrl) || undefined,
      genres: normalizeTextList(values.genres),
      languages: normalizeTextList(values.languages),
      countries: normalizeTextList(values.countries),
      directors: normalizeDirectorRows(values.directors),
      writers: normalizeWriterRows(values.writers),
      cast: normalizeCastRows(values.cast),
      studios: normalizeTextList(values.studios),
      images: normalizeTextList(values.images),
      tags: normalizeTextList(values.tags),
      contentWarnings: values.contentWarnings,
      isShortFilm: values.isShortFilm || values.type === 'short',
      featured: values.featured,
      adminNotes: trim(values.adminNotes) || undefined,
      source: (film?.source || 'manual') as FilmSource,
    };

    return payload;
  };

  const onSubmit = async (values: FilmFormValues) => {
    setFormErrors([]);
    setIsPublishing(true);
    const payload = buildPayload(values);
    const source: FilmSource = film?.source || 'manual';

    try {
      if (filmId) {
        await updateFilmAsync({ id: filmId, patch: { ...payload, source } });
        toast.success('Film updated in 35mm DB');
        window.localStorage.removeItem(`35mm-film-draft-${filmId}`);
        router.push(`/films/${filmId}`);
        return;
      }

      const created = await createFilmAsync({ ...payload, source });
      window.localStorage.removeItem('35mm-film-draft-new');
      toast.success('Film added to 35mm DB');
      router.push(`/films/${created.id}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const onError = () => {
    const rows: FormErrorSummary[] = [];
    collectErrors(errors, '', rows);
    setFormErrors(rows);
    toast.error('Please fix validation errors before publishing.');
  };

  const onSaveDraft = () => {
    const values = getValues();
    const draft = {
      ...values,
      slug: trim(values.slug) || slugify(values.title || ''),
    };
    const draftKey = filmId ? `35mm-film-draft-${filmId}` : '35mm-film-draft-new';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftSaved(true);
      toast.success('Draft saved locally');
    }
  };

  const selectedGenres = genresValue;

  return (
    <form className="grid gap-6" onSubmit={handleSubmit(onSubmit, onError)}>
      {formErrors.length > 0 ? (
        <Card className="border-red-500/30 bg-red-50 text-red-700">
          <CardHeader>
            <CardTitle>Please fix these errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {formErrors.map((item) => (
                <li key={`${item.field}-${item.message}`}>
                  {item.field}: {item.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <ExternalFilmSearch onSelect={setFromExternal} />

      <Card>
        <CardHeader>
          <CardTitle>Core identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register('title')} />
            {errors.title ? <p className="text-xs text-red-500">{errors.title.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Original Title</Label>
            <Input {...register('originalTitle')} />
            {errors.originalTitle ? <p className="text-xs text-red-500">{errors.originalTitle.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <div className="flex items-center gap-2">
              <Input {...register('slug')} />
              {autoFilledBadge('slug')}
            </div>
            {errors.slug ? <p className="text-xs text-red-500">{errors.slug.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type ? <p className="text-xs text-destructive">{errors.type.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILM_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status ? <p className="text-xs text-destructive">{errors.status.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>IMDb ID</Label>
            <Input placeholder="tt1234567" {...register('imdbId')} />
            {errors.imdbId ? <p className="text-xs text-red-500">{errors.imdbId.message}</p> : null}
            {autoFilledBadge('imdbId')}
          </div>
          <div className="space-y-2">
            <Label>TMDB ID</Label>
            <Input type="number" {...register('tmdbId', { setValueAs: setToOptionalNumber })} />
            {errors.tmdbId ? <p className="text-xs text-red-500">{errors.tmdbId.message}</p> : null}
            {autoFilledBadge('tmdbId')}
          </div>
          <div className="space-y-2">
            <Label>ULID</Label>
            <Input value={film?.ulid || randomUlid()} readOnly />
          </div>
        </CardContent>
      </Card>

      <Accordion className="grid gap-4">
        <AccordionItem value="dates" className="rounded-lg border bg-card px-1">
          <AccordionTrigger className="px-4 py-3">Dates & runtime</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Release year</Label>
                <Input type="number" {...register('releaseYear', { setValueAs: setToOptionalNumber })} />
                {errors.releaseYear ? <p className="text-xs text-red-500">{errors.releaseYear.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Release date</Label>
                <Input type="date" {...register('releaseDate')} />
              </div>
              <div className="space-y-2">
                <Label>Runtime (min)</Label>
                <Input type="number" {...register('runtimeMinutes', { setValueAs: setToOptionalNumber })} />
                {errors.runtimeMinutes ? <p className="text-xs text-red-500">{errors.runtimeMinutes.message}</p> : null}
                {runtimeMinutes ? <span className="text-xs text-muted-foreground">{runtimeMinutes} minutes</span> : null}
                {autoFilledBadge('runtimeMinutes')}
              </div>
              {(typeValue === 'tv-show' || typeValue === 'web-series' || typeValue === 'mini-series') ? (
                <>
                  <div className="space-y-2">
                    <Label>Season count</Label>
                    <Input type="number" {...register('seasonCount', { setValueAs: setToOptionalNumber })} />
                    {errors.seasonCount ? <p className="text-xs text-red-500">{errors.seasonCount.message}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Episode count</Label>
                    <Input type="number" {...register('episodeCount', { setValueAs: setToOptionalNumber })} />
                    {errors.episodeCount ? <p className="text-xs text-red-500">{errors.episodeCount.message}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Episode runtime (min)</Label>
                    <Input type="number" {...register('episodeRuntimeMinutes', { setValueAs: setToOptionalNumber })} />
                    {errors.episodeRuntimeMinutes ? <p className="text-xs text-red-500">{errors.episodeRuntimeMinutes.message}</p> : null}
                  </div>
                </>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="creative" className="rounded-lg border bg-card px-1">
          <AccordionTrigger className="px-4 py-3">Creative</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Genres</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className={`rounded-full border px-2 py-1 text-xs transition ${
                        selectedGenres.includes(genre) ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                      onClick={() => {
                        const current = genresValue || [];
                        const next = current.includes(genre) ? current.filter((entry) => entry !== genre) : [...current, genre];
                        setValue('genres', next, { shouldDirty: true });
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {errors.genres ? <p className="text-xs text-red-500">{errors.genres.message as string}</p> : null}
              </div>

              <div>
                <Label>Languages</Label>
                <Input
                  value={languages.join(', ')}
                  onChange={(event) => {
                    setValue('languages', splitList(event.target.value), { shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <Label>Countries</Label>
                <Input
                  value={countries.join(', ')}
                  onChange={(event) => {
                    setValue('countries', splitList(event.target.value), { shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <Label>Directors (at least one required for feature/documentary)</Label>
                <div className="space-y-2">
                  {directors.map((person, index) => (
                    <div key={person.id} className="grid gap-2 rounded border border p-2 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-1">
                        <Input {...register(`directors.${index}.name` as const)} placeholder="Director name" />
                        {errors?.directors?.[index]?.name ? <p className="text-xs text-red-500">{errors.directors?.[index]?.name?.message}</p> : null}
                      </div>
                      <div className="space-y-1">
                        <Input {...register(`directors.${index}.personId` as const)} placeholder="Director ID" />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          removeDirector(index);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addDirector({ name: '' })}>
                    Add director
                  </Button>
                </div>
              </div>

              <div>
                <Label>Writers</Label>
                <div className="space-y-2">
                  {writers.map((writer, index) => (
                    <div key={writer.id} className="grid gap-2 rounded border border p-2 md:grid-cols-[1fr_auto]">
                      <Input {...register(`writers.${index}.name` as const)} placeholder="Writer" />
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          removeWriter(index);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addWriter({ name: '' })}>
                    Add writer
                  </Button>
                </div>
              </div>

              <div>
                <Label>Cast</Label>
                <div className="space-y-2">
                  {cast.map((person, index) => (
                    <div key={person.id} className="grid gap-2 rounded border border p-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input {...register(`cast.${index}.name` as const)} placeholder="Name" />
                      <Input {...register(`cast.${index}.character` as const)} placeholder="Character" />
                      <Input
                        type="number"
                        {...register(`cast.${index}.billingOrder` as const, { setValueAs: setToOptionalNumber })}
                        placeholder="Order"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          removeCast(index);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCast({ name: '', character: '', billingOrder: undefined })}
                  >
                    Add cast
                  </Button>
                </div>
              </div>

              <div>
                <Label>Studios / Production</Label>
                <Input
                  value={studios.join(', ')}
                  onChange={(event) => {
                    setValue('studios', splitList(event.target.value), { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="copy" className="rounded-lg border bg-card px-1">
          <AccordionTrigger className="px-4 py-3">Synopsis & copy</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4">
              <div>
                <Label>Tagline</Label>
                <Input {...register('tagline')} />
              </div>
              <div>
                <Label>Short Description</Label>
                <Textarea {...register('shortDescription')} maxLength={160} placeholder="Up to 160 characters" />
                <p className="text-xs text-muted-foreground">{shortDescription.length}/160</p>
                {errors.shortDescription ? <p className="text-xs text-red-500">{errors.shortDescription.message}</p> : null}
              </div>
              <div>
                <Label>Full Synopsis</Label>
                <Textarea className="min-h-28" {...register('synopsis')} />
                {errors.synopsis ? <p className="text-xs text-red-500">{errors.synopsis.message}</p> : null}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="media" className="rounded-lg border bg-card px-1">
          <AccordionTrigger className="px-4 py-3">Media</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label>Poster URL</Label>
                  <Input
                    {...register('posterUrl')}
                    onBlur={(event) => {
                      setValue('posterUrl', trim(event.target.value), { shouldDirty: true });
                    }}
                  />
                  {autoFilledBadge('posterUrl')}
                  {errors.posterUrl ? <p className="text-xs text-red-500">{errors.posterUrl.message}</p> : null}
                  {posterUrl ? <Image src={posterUrl} width={120} height={180} alt="poster" className="mt-2 rounded" /> : null}
                </div>
                <div>
                  <Label>Backdrop URL</Label>
                  <Input
                    {...register('backdropUrl')}
                    onBlur={(event) => {
                      setValue('backdropUrl', trim(event.target.value), { shouldDirty: true });
                    }}
                  />
                  {autoFilledBadge('backdropUrl')}
                  {errors.backdropUrl ? <p className="text-xs text-red-500">{errors.backdropUrl.message}</p> : null}
                  {backdropUrl ? <Image src={backdropUrl} width={220} height={124} alt="backdrop" className="mt-2 rounded" /> : null}
                </div>
              </div>

              <div>
                <Label>Trailer URL</Label>
                <Input {...register('trailerUrl')} />
                {errors.trailerUrl ? <p className="text-xs text-red-500">{errors.trailerUrl.message}</p> : null}
              </div>

              <div>
                <Label>Additional Images</Label>
                <div className="space-y-2">
                  {images.map((image, index) => (
                    <div key={String(index)} className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input {...register(`images.${index}` as const)} placeholder="Image URL" />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          removeImage(index);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addImage()}>
                    Add image
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="specific" className="rounded-lg border bg-card px-1">
          <AccordionTrigger className="px-4 py-3">35mm specific</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tags</Label>
                <Input
                  value={tags.join(', ')}
                  onChange={(event) => {
                    setValue('tags', splitList(event.target.value), { shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <Label>Content warnings</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CONTENT_WARNINGS.map((warning) => {
                    const checked = contentWarnings.includes(warning);
                    return (
                      <label key={warning} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const next = contentWarnings;
                            setValue(
                              'contentWarnings',
                              value ? [...next, warning] : next.filter((entry) => entry !== warning),
                              { shouldDirty: true },
                            );
                          }}
                        />
                        {warning}
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Controller
                  name="isShortFilm"
                  control={control}
                  render={({ field }) => (
                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Is Short Film
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  name="featured"
                  control={control}
                  render={({ field }) => (
                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Featured
              </label>

              <div className="md:col-span-2">
                <Label>Admin Notes</Label>
                <Textarea {...register('adminNotes')} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="sticky bottom-4 left-0 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={isPublishing} onClick={onSaveDraft}>
          Save Draft
        </Button>
        <Button type="submit" disabled={isPublishing}>
          Publish to DB
        </Button>
        {draftSaved ? <p className="text-xs text-muted-foreground">Draft synced</p> : null}
      </div>
    </form>
  );
}
