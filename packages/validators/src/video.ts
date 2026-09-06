import { z } from "zod";

export const VIDEO_POST_MAX_BYTES = 120 * 1024 * 1024;
export const VIDEO_FILM_MAX_BYTES = 20 * 1024 * 1024 * 1024;
export const videoUploadSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    purpose: z.enum(["post", "film"]),
    filename: z.string().trim().min(1).max(240),
    contentType: z.enum([
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-matroska",
    ]),
    contentLength: z.number().int().positive().max(VIDEO_FILM_MAX_BYTES),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.purpose === "post" && v.contentLength > VIDEO_POST_MAX_BYTES) {
      ctx.addIssue({
        code: "custom",
        path: ["contentLength"],
        message: "Post videos must be 120 MB or smaller",
      });
    }
  });

export const publishFilmSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(6).max(5000),
    tagline: z.string().trim().max(200).default(""),
    director: z.string().trim().max(200).default(""),
    year: z.number().int().min(1800).max(2200).nullable().default(null),
    language: z.string().trim().max(80).default(""),
    country: z.string().trim().max(80).default(""),
    genres: z.array(z.string().trim().min(1).max(60)).min(1).max(3),
    contentRating: z.string().trim().max(40).default(""),
    tags: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    festivalNotes: z.string().trim().max(200).default(""),
    thumbnailUrl: z.string().url().max(1000).nullable().default(null),
    visibility: z.enum(["public", "unlisted", "private"]),
    releaseAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export const videoWebhookSchema = z.object({
  VideoLibraryId: z.number().int().positive(),
  VideoGuid: z.string().uuid(),
  Status: z.number().int().min(0).max(10),
});
export type VideoUploadInput = z.infer<typeof videoUploadSchema>;
export type PublishFilmInput = z.infer<typeof publishFilmSchema>;
