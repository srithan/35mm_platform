import { z } from 'zod';
import { CONTENT_WARNINGS, FILM_TYPES, FILM_STATUS } from '@/lib/types';

const filmTypeValues = [...FILM_TYPES] as [
  (typeof FILM_TYPES)[number],
  ...(typeof FILM_TYPES)[number][]
];

const filmStatusValues = [...FILM_STATUS] as [
  (typeof FILM_STATUS)[number],
  ...(typeof FILM_STATUS)[number][]
];

const contentWarningValues = [...CONTENT_WARNINGS] as [
  (typeof CONTENT_WARNINGS)[number],
  ...(typeof CONTENT_WARNINGS)[number][]
];

export const personSchema = z.object({
  name: z.string().min(1, 'Name required'),
  personId: z.string().trim().optional(),
  character: z.string().trim().optional(),
  billingOrder: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .nonnegative()
    .optional(),
});

const filmFormBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title required').max(500),
  originalTitle: z.string().trim().optional().or(z.literal('')).default(''),
  slug: z.string().trim().min(1, 'Slug required').max(300),
  type: z.enum(filmTypeValues, {
    errorMap: () => ({ message: 'Pick a type' }),
  }),
  status: z.enum(filmStatusValues),
  imdbId: z
    .string()
    .trim()
    .regex(/^tt\d{7,8}$/u, 'Use valid IMDb ID (tt1234567)')
    .optional()
    .or(z.literal('')),
  tmdbId: z
    .number({ invalid_type_error: 'TMDB ID must be a number' })
    .int()
    .nonnegative()
    .optional(),
  releaseYear: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(1888)
    .max(new Date().getFullYear() + 5)
    .optional(),
  releaseDate: z.string().trim().optional(),
  runtimeMinutes: z
    .number({ invalid_type_error: 'Runtime must be a number' })
    .int()
    .positive()
    .optional(),
  seasonCount: z
    .number({ invalid_type_error: 'Season count must be a number' })
    .int()
    .nonnegative()
    .optional(),
  episodeCount: z
    .number({ invalid_type_error: 'Episode count must be a number' })
    .int()
    .nonnegative()
    .optional(),
  episodeRuntimeMinutes: z
    .number({ invalid_type_error: 'Episode runtime must be a number' })
    .int()
    .positive()
    .optional(),
  tagline: z.string().trim().optional(),
  shortDescription: z
    .string()
    .trim()
    .max(160, 'Short description must be 160 characters or less')
    .optional(),
  synopsis: z.string().trim().optional(),
  posterUrl: z.string().url('Poster URL should be valid').trim().optional().or(z.literal('')),
  backdropUrl: z.string().url('Backdrop URL should be valid').trim().optional().or(z.literal('')),
  trailerUrl: z
    .string()
    .trim()
    .url('Trailer URL should be a valid URL')
    .regex(/(youtube\.com|youtu\.be|vimeo\.com)/u, 'Trailer must be YouTube or Vimeo')
    .optional()
    .or(z.literal('')),
  genres: z.array(z.string().trim()).default([]),
  languages: z.array(z.string().trim()).default([]),
  countries: z.array(z.string().trim()).default([]),
  directors: z.array(personSchema).default([]),
  writers: z.array(personSchema).default([]),
  cast: z.array(personSchema).default([]),
  studios: z.array(z.string().trim()).default([]),
  images: z.array(z.string().url('Image URL should be valid').trim()).default([]),
  tags: z.array(z.string().trim()).default([]),
  contentWarnings: z
    .array(z.enum(contentWarningValues))
    .default([]),
  isShortFilm: z.boolean().default(false),
  featured: z.boolean().default(false),
  adminNotes: z.string().trim().optional(),
});

export const filmFormSchema = filmFormBaseSchema.superRefine((values, ctx) => {
    if ((values.type === 'feature' || values.type === 'documentary') && values.directors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directors'],
        message: 'Feature and documentary entries require at least one director',
      });
    }
  });

export const filmDraftSchema = filmFormBaseSchema.partial();

export const createFilmInputSchema = filmFormBaseSchema
  .extend({
  releaseYear: z.number().optional(),
  runtimeMinutes: z.number().positive().int().optional(),
})
  .superRefine((values, ctx) => {
    if ((values.type === 'feature' || values.type === 'documentary') && values.directors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directors'],
        message: 'Feature and documentary entries require at least one director',
      });
    }
  });

export type FilmFormValues = z.infer<typeof filmFormSchema>;
