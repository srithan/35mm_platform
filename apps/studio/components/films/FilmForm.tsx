'use client';

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FILM_LIFECYCLES, FILM_STATUS, FILM_TYPES, type Film, type FilmType } from '@/lib/types';
import { filmFormSchema, type FilmFormValues } from '@/lib/schemas';
import { slugify } from '@/lib/utils';
import { useFilms } from '@/hooks/useFilms';
import { ExternalFilmSearch } from './ExternalFilmSearch';
import { ImageIcon, Save, Send, Sparkles } from 'lucide-react';

type AutofillKey =
  | 'title'
  | 'originalTitle'
  | 'sortTitle'
  | 'slug'
  | 'startYear'
  | 'releaseDate'
  | 'genres'
  | 'posterUrl'
  | 'synopsis'
  | 'imdbId'
  | 'tmdbId'
  | 'runtimeMinutes';

type FormErrorSummary = { field: string; message: string };

const TITLE_TYPES_WITH_END_YEAR = new Set<FilmType>(['tv_series', 'web_series', 'tv_season']);

const trim = (value?: string | null): string => value?.trim() ?? '';

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeSortTitle = (value: string): string => trim(value).toLowerCase();

const setToOptionalNumber = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' && raw.trim() === '') return undefined;
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(value) && !Number.isNaN(value) ? value : undefined;
};

const supportsEndYear = (type: FilmType): boolean => TITLE_TYPES_WITH_END_YEAR.has(type);

const collectErrors = (value: unknown, prefix: string, out: FormErrorSummary[]) => {
  if (!value || typeof value !== 'object') return;
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

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function defaultsFor(film?: Film): FilmFormValues {
  return {
    title: film?.title ?? '',
    originalTitle: film?.originalTitle ?? '',
    sortTitle: film?.sortTitle ?? '',
    slug: film?.slug ?? '',
    type: film?.type ?? 'movie',
    lifecycle: film?.lifecycle ?? 'released',
    status: film?.status ?? 'active',
    synopsis: film?.synopsis ?? '',
    startYear: film?.releaseYear,
    endYear: film?.endYear ?? undefined,
    releaseDate: film?.releaseDate ?? '',
    runtimeMinutes: film?.runtimeMinutes ?? undefined,
    primaryLanguage: film?.primaryLanguage ?? '',
    primaryCountry: film?.primaryCountry ?? '',
    originCountries: film?.countries ?? [],
    spokenLanguages: film?.languages ?? [],
    genres: film?.genres ?? [],
    contentWarnings: film?.contentWarnings ?? [],
    posterUrl: film?.posterUrl ?? '',
    imdbId: film?.imdbId ?? '',
    tmdbId: film?.tmdbId ?? '',
    isAdult: film?.isAdult ?? false,
    isVerified: film?.isVerified ?? false,
  };
}

export function FilmForm({ film, filmId }: { film?: Film; filmId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrorSummary[]>([]);
  const [autoFilled, setAutoFilled] = useState<Set<AutofillKey>>(new Set());

  const { createFilmAsync, updateFilmAsync, isBusy } = useFilms(
    { search: '', type: null, year: null },
    null,
    25,
  );

  const defaultValues = useMemo(() => defaultsFor(film), [film]);
  const isCreateRoute = pathname === '/films/new';
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
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(isCreateRoute ? defaultsFor() : defaultValues);
  }, [defaultValues, isCreateRoute, reset]);

  const titleValue = useWatch({ control, name: 'title' }) || '';
  const sortTitleValue = useWatch({ control, name: 'sortTitle' }) || '';
  const slugValue = useWatch({ control, name: 'slug' }) || '';
  const synopsis = useWatch({ control, name: 'synopsis' }) || '';
  const titleType = useWatch({ control, name: 'type' }) || 'movie';
  const endYearValue = useWatch({ control, name: 'endYear' });
  const posterUrl = useWatch({ control, name: 'posterUrl' }) || '';
  const originCountries = useWatch({ control, name: 'originCountries' }) || [];
  const spokenLanguages = useWatch({ control, name: 'spokenLanguages' }) || [];
  const genres = useWatch({ control, name: 'genres' }) || [];
  const contentWarnings = useWatch({ control, name: 'contentWarnings' }) || [];

  useEffect(() => {
    if (!filmId) {
      const draftKey = '35mm-catalog-title-draft-new';
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (raw) reset(JSON.parse(raw) as FilmFormValues);
      } catch {
        // ignore invalid draft
      }
    }
  }, [filmId, reset]);

  useEffect(() => {
    if (!titleValue) return;
    if (!sortTitleValue) {
      setValue('sortTitle', normalizeSortTitle(titleValue), { shouldDirty: true });
    }
    if (!slugValue) {
      setValue('slug', slugify(titleValue), { shouldDirty: true });
    }
  }, [titleValue, sortTitleValue, slugValue, setValue]);

  const titleSupportsEndYear = supportsEndYear(titleType);

  useEffect(() => {
    if (!titleSupportsEndYear && endYearValue !== undefined) {
      setValue('endYear', undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [endYearValue, setValue, titleSupportsEndYear]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const autoFilledBadge = (field: AutofillKey) =>
    autoFilled.has(field) ? <Badge className="ml-2 bg-emerald-100 text-emerald-700">Auto-filled</Badge> : null;

  const markAuto = (keys: AutofillKey[]) => setAutoFilled(new Set(keys));

  const setFromExternal = (item: Partial<Film>) => {
    const touched: AutofillKey[] = [];
    if (item.title) {
      setValue('title', item.title, { shouldDirty: true });
      setValue('sortTitle', normalizeSortTitle(item.title), { shouldDirty: true });
      setValue('slug', item.slug || slugify(item.title), { shouldDirty: true });
      touched.push('title', 'sortTitle', 'slug');
    }
    if (item.originalTitle) {
      setValue('originalTitle', item.originalTitle, { shouldDirty: true });
      touched.push('originalTitle');
    }
    if (item.releaseYear !== undefined) {
      setValue('startYear', item.releaseYear, { shouldDirty: true });
      touched.push('startYear');
    }
    if (item.releaseDate) {
      setValue('releaseDate', item.releaseDate, { shouldDirty: true });
      touched.push('releaseDate');
    }
    if (item.runtimeMinutes !== undefined && item.runtimeMinutes !== null) {
      setValue('runtimeMinutes', item.runtimeMinutes, { shouldDirty: true });
      touched.push('runtimeMinutes');
    }
    if (item.genres?.length) {
      setValue('genres', [...item.genres], { shouldDirty: true });
      touched.push('genres');
    }
    if (item.countries?.length) {
      setValue('originCountries', [...item.countries], { shouldDirty: true });
    }
    if (item.languages?.length) {
      setValue('spokenLanguages', [...item.languages], { shouldDirty: true });
    }
    if (item.posterUrl) {
      setValue('posterUrl', item.posterUrl, { shouldDirty: true });
      touched.push('posterUrl');
    }
    if (item.synopsis) {
      setValue('synopsis', item.synopsis, { shouldDirty: true });
      touched.push('synopsis');
    }
    if (item.imdbId) {
      setValue('imdbId', item.imdbId, { shouldDirty: true });
      touched.push('imdbId');
    }
    if (item.tmdbId) {
      setValue('tmdbId', String(item.tmdbId), { shouldDirty: true });
      touched.push('tmdbId');
    }
    if (item.type) setValue('type', item.type, { shouldDirty: true });
    markAuto(touched);
    toast.success('Auto-filled from external source');
    window.requestAnimationFrame(() => {
      document.getElementById('publish-film-button')?.focus();
    });
  };

  const onSubmit = async (values: FilmFormValues) => {
    setFormErrors([]);
    try {
      if (!isCreateRoute && filmId && film) {
        await updateFilmAsync({ current: film, values });
        window.localStorage.removeItem(`35mm-catalog-title-draft-${filmId}`);
        toast.success('Catalog title updated');
        router.push(`/films/${filmId}`);
        return;
      }

      const created = await createFilmAsync(values);
      window.localStorage.removeItem('35mm-catalog-title-draft-new');
      toast.success('Catalog title created');
      reset(defaultsFor());
      setAutoFilled(new Set());
      setDraftSaved(false);
      router.push(`/films/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Catalog write failed');
    }
  };

  const onError = () => {
    const rows: FormErrorSummary[] = [];
    collectErrors(errors, '', rows);
    setFormErrors(rows);
    toast.error('Fix validation errors before publishing.');
  };

  const onSaveDraft = () => {
    const values = getValues();
    const draft = {
      ...values,
      sortTitle: trim(values.sortTitle) || normalizeSortTitle(values.title),
      slug: trim(values.slug) || slugify(values.title || ''),
    };
    const draftKey = filmId ? `35mm-catalog-title-draft-${filmId}` : '35mm-catalog-title-draft-new';
    if (typeof window !== 'undefined') {
      setDraftSaving(true);
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftSaved(true);
      toast.success('Draft saved locally');
      window.setTimeout(() => setDraftSaving(false), 350);
    }
  };

  const submitFromShortcut = () => {
    void handleSubmit(onSubmit, onError)();
  };

  const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSaveDraft();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitFromShortcut();
    }
  };

  return (
    <form className="mx-auto grid w-full max-w-5xl gap-4" onSubmit={handleSubmit(onSubmit, onError)} onKeyDown={onFormKeyDown}>
      <Card className="border-primary/15 bg-muted/20">
        <CardContent className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md">Catalog title</Badge>
              {isDirty ? <Badge variant="secondary" className="rounded-md">Unsaved changes</Badge> : null}
              {draftSaved ? <Badge variant="secondary" className="rounded-md">Draft synced</Badge> : null}
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Add film</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Search first, import a match, then review the few fields that matter before publishing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingButton
              type="button"
              variant="outline"
              disabled={isBusy}
              isLoading={draftSaving}
              loadingText="Saving"
              onClick={onSaveDraft}
            >
              <Save className="size-4" />
              Save draft
            </LoadingButton>
            <LoadingButton type="submit" isLoading={isBusy} loadingText={filmId ? 'Updating' : 'Publishing'}>
              {isBusy ? null : <Send className="size-4" />}
              Publish
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

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

      <Card className="scroll-mt-24">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Title identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-6">
            <RequiredLabel htmlFor="title">Primary title</RequiredLabel>
            <Input id="title" className="h-10" required aria-required="true" {...register('title')} />
            <ErrorText message={errors.title?.message} />
            {autoFilledBadge('title')}
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor="originalTitle">Original title</Label>
            <Input id="originalTitle" className="h-10" {...register('originalTitle')} />
            <ErrorText message={errors.originalTitle?.message} />
            {autoFilledBadge('originalTitle')}
          </div>
          <div className="space-y-2 md:col-span-6">
            <RequiredLabel htmlFor="sortTitle">Sort title</RequiredLabel>
            <Input id="sortTitle" required aria-required="true" {...register('sortTitle')} />
            <ErrorText message={errors.sortTitle?.message} />
            {autoFilledBadge('sortTitle')}
          </div>
          <div className="space-y-2 md:col-span-6">
            <RequiredLabel htmlFor="slug">Slug</RequiredLabel>
            <Input id="slug" required aria-required="true" {...register('slug')} />
            <ErrorText message={errors.slug?.message} />
            {autoFilledBadge('slug')}
          </div>
          <div className="space-y-2 md:col-span-3">
            <RequiredLabel htmlFor="film-type">Type</RequiredLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="film-type" className="w-full" aria-required="true">
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
          </div>
          <div className="space-y-2 md:col-span-3">
            <RequiredLabel htmlFor="film-lifecycle">Lifecycle</RequiredLabel>
            <Controller
              name="lifecycle"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="film-lifecycle" className="w-full" aria-required="true">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILM_LIFECYCLES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <RequiredLabel htmlFor="film-status">Status</RequiredLabel>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="film-status" className="w-full" aria-required="true">
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
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Catalog ID</Label>
            <Input value={film?.id ?? 'Generated on publish'} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="scroll-mt-24">
        <CardHeader className="border-b pb-3">
          <CardTitle>Release data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="startYear">{titleSupportsEndYear ? 'Start year' : 'Release year'}</Label>
            <Input id="startYear" type="number" inputMode="numeric" {...register('startYear', { setValueAs: setToOptionalNumber })} />
            <ErrorText message={errors.startYear?.message} />
            {autoFilledBadge('startYear')}
          </div>
          {titleSupportsEndYear ? (
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="endYear">End year</Label>
              <Input id="endYear" type="number" inputMode="numeric" {...register('endYear', { setValueAs: setToOptionalNumber })} />
              <ErrorText message={errors.endYear?.message} />
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="releaseDate">Release date</Label>
            <Input id="releaseDate" placeholder="YYYY-MM-DD" {...register('releaseDate')} />
            <ErrorText message={errors.releaseDate?.message} />
            {autoFilledBadge('releaseDate')}
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="runtimeMinutes">Runtime minutes</Label>
            <Input id="runtimeMinutes" type="number" inputMode="numeric" {...register('runtimeMinutes', { setValueAs: setToOptionalNumber })} />
            <ErrorText message={errors.runtimeMinutes?.message} />
            {autoFilledBadge('runtimeMinutes')}
          </div>
        </CardContent>
      </Card>

      <Card className="scroll-mt-24">
        <CardHeader className="border-b pb-3">
          <CardTitle>Locale and facts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="primaryLanguage">Primary language</Label>
            <Input id="primaryLanguage" placeholder="en" {...register('primaryLanguage')} />
            <ErrorText message={errors.primaryLanguage?.message} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="primaryCountry">Primary country</Label>
            <Input id="primaryCountry" placeholder="US" {...register('primaryCountry')} />
            <ErrorText message={errors.primaryCountry?.message} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="originCountries">Origin countries</Label>
            <Input
              id="originCountries"
              value={originCountries.join(', ')}
              onChange={(event) => setValue('originCountries', splitList(event.target.value), { shouldDirty: true })}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="spokenLanguages">Spoken languages</Label>
            <Input
              id="spokenLanguages"
              value={spokenLanguages.join(', ')}
              onChange={(event) => setValue('spokenLanguages', splitList(event.target.value), { shouldDirty: true })}
            />
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor="genres">Genres</Label>
            <Input
              id="genres"
              value={genres.join(', ')}
              onChange={(event) => setValue('genres', splitList(event.target.value), { shouldDirty: true })}
            />
            {autoFilledBadge('genres')}
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor="contentWarnings">Content warnings</Label>
            <Input
              id="contentWarnings"
              value={contentWarnings.join(', ')}
              onChange={(event) => setValue('contentWarnings', splitList(event.target.value), { shouldDirty: true })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <Controller
              name="isAdult"
              control={control}
              render={({ field }) => (
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
            Adult title
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <Controller
              name="isVerified"
              control={control}
              render={({ field }) => (
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
            Verified
          </label>
        </CardContent>
      </Card>

      <Card className="scroll-mt-24">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" />
            Synopsis and media
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-8">
            <Label htmlFor="synopsis">Synopsis</Label>
            <Textarea id="synopsis" className="min-h-28" {...register('synopsis')} />
            <FieldHint>{synopsis.length}/10000</FieldHint>
            <ErrorText message={errors.synopsis?.message} />
            {autoFilledBadge('synopsis')}
          </div>
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="posterUrl">Primary poster URL</Label>
            <Input
              id="posterUrl"
              {...register('posterUrl')}
              onBlur={(event) => setValue('posterUrl', trim(event.target.value), { shouldDirty: true })}
            />
            <ErrorText message={errors.posterUrl?.message} />
            {autoFilledBadge('posterUrl')}
            {posterUrl ? (
              <Image src={posterUrl} width={120} height={180} alt="poster" className="mt-2 rounded-lg border object-cover" />
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="imdbId">IMDb ID</Label>
            <Input id="imdbId" placeholder="tt1234567" {...register('imdbId')} />
            <ErrorText message={errors.imdbId?.message} />
            {autoFilledBadge('imdbId')}
          </div>
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="tmdbId">TMDB ID</Label>
            <Input id="tmdbId" {...register('tmdbId')} />
            <ErrorText message={errors.tmdbId?.message} />
            {autoFilledBadge('tmdbId')}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/90 p-2 shadow-lg backdrop-blur">
        <LoadingButton
          type="button"
          variant="outline"
          disabled={isBusy}
          isLoading={draftSaving}
          loadingText="Saving"
          onClick={onSaveDraft}
          aria-keyshortcuts="Meta+S Control+S"
        >
          {draftSaving ? null : <Save className="size-4" />}
          Save Draft
        </LoadingButton>
        <LoadingButton
          id="publish-film-button"
          type="submit"
          isLoading={isBusy}
          loadingText={filmId ? 'Updating' : 'Publishing'}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {isBusy ? null : <Send className="size-4" />}
          Publish
        </LoadingButton>
        {draftSaved ? <p className="text-xs text-muted-foreground">Draft synced</p> : null}
      </div>
    </form>
  );
}
