import { z } from 'zod';
import { FILM_LIFECYCLES, FILM_STATUS, FILM_TYPES } from '@/lib/types';

const filmTypeValues = [...FILM_TYPES] as [
  (typeof FILM_TYPES)[number],
  ...(typeof FILM_TYPES)[number][],
];

const filmStatusValues = [...FILM_STATUS] as [
  (typeof FILM_STATUS)[number],
  ...(typeof FILM_STATUS)[number][],
];

const filmLifecycleValues = [...FILM_LIFECYCLES] as [
  (typeof FILM_LIFECYCLES)[number],
  ...(typeof FILM_LIFECYCLES)[number][],
];

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}(-\d{2})?(-\d{2})?$/u, 'Use YYYY, YYYY-MM, or YYYY-MM-DD')
  .optional()
  .or(z.literal(''));

const textList = z.array(z.string().trim().min(1).max(80)).max(50).default([]);

const filmFormBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title required').max(500),
  originalTitle: z.string().trim().max(500).optional().or(z.literal('')).default(''),
  sortTitle: z.string().trim().min(1, 'Sort title required').max(500),
  slug: z.string().trim().min(1, 'Slug required').max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  type: z.enum(filmTypeValues),
  lifecycle: z.enum(filmLifecycleValues).default('released'),
  status: z.enum(filmStatusValues).default('active'),
  synopsis: z.string().trim().max(10000).optional().or(z.literal('')).default(''),
  startYear: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(1800)
    .max(2300)
    .optional(),
  endYear: z
    .number({ invalid_type_error: 'End year must be a number' })
    .int()
    .min(1800)
    .max(2300)
    .optional(),
  releaseDate: optionalDate.default(''),
  runtimeMinutes: z
    .number({ invalid_type_error: 'Runtime must be a number' })
    .int()
    .min(1)
    .max(6000)
    .optional(),
  primaryLanguage: z.string().trim().min(2).max(20).optional().or(z.literal('')).default(''),
  primaryCountry: z.string().trim().min(2).max(20).optional().or(z.literal('')).default(''),
  originCountries: textList,
  spokenLanguages: textList,
  genres: textList,
  contentWarnings: textList,
  posterUrl: z.string().url('Poster URL should be valid').trim().optional().or(z.literal('')).default(''),
  imdbId: z
    .string()
    .trim()
    .regex(/^tt\d{7,8}$/u, 'Use valid IMDb ID (tt1234567)')
    .optional()
    .or(z.literal(''))
    .default(''),
  tmdbId: optionalText.default(''),
  isAdult: z.boolean().default(false),
  isVerified: z.boolean().default(false),
});

export const filmFormSchema = filmFormBaseSchema.superRefine((values, ctx) => {
  if (values.endYear && values.startYear && values.endYear < values.startYear) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endYear'],
      message: 'End year must be after start year',
    });
  }
});

export const filmDraftSchema = filmFormBaseSchema.partial();
export const createFilmInputSchema = filmFormBaseSchema;

export type FilmFormValues = z.infer<typeof filmFormSchema>;
