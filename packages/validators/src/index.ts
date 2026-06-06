import { z } from "zod";

var ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export var cursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export var createPostSchema = z.object({
  type: z.enum(["text", "discussion", "log", "review", "image"]).default("text"),
  headline: z.string().trim().min(1).max(120).optional(),
  body: z.string().max(5000),
  film: z
    .object({
      id: z
        .string()
        .trim()
        .min(1)
        .regex(ULID_RE, "film.id must be a 35mm ULID"),
      tmdbId: z.number().int().nonnegative().optional(),
      title: z.string().trim().min(1).max(200),
      year: z.number().int().min(1800).max(2200).nullable(),
      posterUrl: z.string().max(500).nullable(),
      genres: z.array(z.string().max(60)).default([]),
      rating: z.number().min(0).max(5).nullable(),
    })
    .nullable()
    .optional(),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video", "film_embed", "none"]),
        url: z.string().min(1).max(1000),
        key: z.string().max(1000).optional(),
        thumbnailUrl: z.string().max(1000).optional(),
        altText: z.string().max(300).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        blurhash: z.string().max(200).optional(),
        variants: z
          .object({
            thumb: z.string().max(1000).optional(),
            feed: z.string().max(1000).optional(),
            full: z.string().max(1000).optional(),
          })
          .optional(),
      })
    )
    .max(9)
    .optional(),
  mediaUrls: z.array(z.string().min(1).max(1000)).max(9).optional(),
});

export var notificationTypeSchema = z.enum([
  "like",
  "comment",
  "reply",
  "follow",
  "follow_request",
  "mention",
  "repost",
]);

export var notificationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .string()
    .transform(function (value) {
      return value === "true";
    })
    .pipe(z.boolean())
    .default(false)
    .optional()
    .catch(false),
});

export var notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export var sendMessageSchema = z.object({
  text: z.string().trim().max(5000),
  replyToId: z.string().min(1).optional(),
});

export var usernameSchema = z
  .string()
  .min(2, { message: "Username must be at least 2 characters" })
  .max(30, { message: "Username must be 30 characters or fewer" })
  .regex(/^[a-zA-Z0-9._]+$/, {
    message: "Letters, numbers, dots and underscores only",
  })
  .transform(function (v) {
    return v.toLowerCase();
  });

export var updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Expected YYYY-MM-DD" })
    .optional()
    .nullable(),
  role: z.string().max(50).optional().nullable(),
  roleContext: z.string().max(200).optional().nullable(),
  isPrivate: z.boolean().optional(),
  avatarUrl: z.string().max(1000).optional().nullable(),
  coverUrl: z.string().max(1000).optional().nullable(),
  headline: z.string().trim().max(50).optional().nullable(),
  headlineContext: z.string().trim().max(25).optional().nullable(),
  favoriteFilmIds: z.array(z.string().trim().regex(ULID_RE)).max(5).optional(),
  favoriteGenreIds: z.array(z.string().trim().min(1)).max(10).optional(),
});

export var updatePrivacySchema = z.object({
  privateAccount: z.boolean().optional(),
  allowMessagesFromAnyone: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
});

export var updateNotificationsSchema = z.object({
  newFollowers: z.boolean().optional(),
  likesOnPosts: z.boolean().optional(),
  commentsAndReplies: z.boolean().optional(),
  mentions: z.boolean().optional(),
  festivalUpdates: z.boolean().optional(),
  watchlistStreaming: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
});

export var onboardingRoleSchema = z.enum([
  "cinephile",
  "creator",
  "critic",
  "film_student",
  "industry",
]);

export var onboardingSubmitSchema = z.object({
  role: onboardingRoleSchema,
  headlineContext: z.string().trim().max(25).optional(),
  favoriteFilmIds: z.array(z.string().trim().min(1)).max(5).default([]),
  favoriteGenreIds: z.array(z.string().trim().min(1)).max(10).default([]),
  followUserIds: z.array(z.string().trim().min(1)).max(20).default([]),
});

export var resolveOnboardingTmdbFilmSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  year: z.number().int().min(1800).max(2200).nullable().optional(),
  posterUrl: z.string().trim().max(500).nullable().optional(),
  genres: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
});

export var resolveOnboardingTmdbFilmsSchema = z.object({
  films: z.array(resolveOnboardingTmdbFilmSchema).min(1).max(5),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;
export type OnboardingRoleInput = z.infer<typeof onboardingRoleSchema>;
export type OnboardingSubmitInput = z.infer<typeof onboardingSubmitSchema>;
export type ResolveOnboardingTmdbFilmInput = z.infer<typeof resolveOnboardingTmdbFilmSchema>;
export type ResolveOnboardingTmdbFilmsInput = z.infer<typeof resolveOnboardingTmdbFilmsSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type NotificationIdInput = z.infer<typeof notificationIdSchema>;
