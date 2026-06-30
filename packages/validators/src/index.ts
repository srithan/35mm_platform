import { z } from "zod";

var ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
var RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

type RichTextNode = {
  type: string;
  text?: string;
  marks?: Array<{ type: "bold" | "italic" | "underline" | "strike" | "spoiler" }>;
  attrs?: {
    id?: string;
    label?: string;
    username?: string;
    deleted?: boolean;
  };
  content?: RichTextNode[];
};

var richTextMarkSchema = z.object({
  type: z.enum(["bold", "italic", "underline", "strike", "spoiler"]),
});

var richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(function () {
  return z.union([
    z.object({
      type: z.literal("text"),
      text: z.string().max(5000),
      marks: z.array(richTextMarkSchema).max(8).optional(),
    }),
    z.object({
      type: z.literal("hardBreak"),
    }),
    z.object({
      type: z.literal("mention"),
      attrs: z.object({
        id: z.string().uuid(),
        label: z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9._]+$/),
        username: z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9._]+$/).optional(),
        deleted: z.boolean().optional(),
      }),
    }),
    z.object({
      type: z.literal("paragraph"),
      content: z.array(richTextNodeSchema).max(500).optional(),
    }),
    z.object({
      type: z.literal("doc"),
      content: z.array(richTextNodeSchema).max(200).optional(),
    }),
  ]);
});

export var richTextDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(richTextNodeSchema).max(200).optional(),
});

export function parseRichTextBody(value: string): z.infer<typeof richTextDocSchema> | null {
  if (!value.startsWith(RICH_TEXT_PREFIX)) return null;
  var parsed = JSON.parse(value.slice(RICH_TEXT_PREFIX.length));
  return richTextDocSchema.parse(parsed);
}

function richTextNodeToText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mention") {
    var label = node.attrs?.label ?? node.attrs?.username ?? "user";
    return "@" + label.replace(/^@/, "");
  }
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(richTextNodeToText).join("");
}

export function richTextBodyToVisibleText(value: string): string {
  var doc = parseRichTextBody(value);
  if (!doc) return value;
  return (doc.content ?? []).map(richTextNodeToText).join("\n");
}

export function richTextMentionIds(value: string): string[] {
  var doc = parseRichTextBody(value);
  if (!doc) return [];
  var ids = new Set<string>();
  function walk(node: RichTextNode) {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      ids.add(node.attrs.id);
    }
    for (var child of node.content ?? []) walk(child);
  }
  walk(doc);
  return Array.from(ids);
}

export function validateRichTextBody(value: string, maxVisibleChars: number): string {
  var visible = richTextBodyToVisibleText(value).trim();
  if (visible.length < 1 || visible.length > maxVisibleChars) {
    throw new Error(`Body must be 1-${maxVisibleChars} visible characters`);
  }
  return value;
}

export var cursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

var postMediaItemSchema = z.object({
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
});

export var createPostPollSchema = z
  .object({
    type: z.enum(["ranking", "image"]),
    durationMinutes: z.number().int().min(5).max(10 * 24 * 60),
    resultsVisibility: z.enum(["after_vote", "after_end"]).default("after_vote"),
    options: z
      .array(
        z.object({
          label: z.string().trim().max(120).optional().nullable(),
          imageUrl: z.string().trim().max(1000).optional().nullable(),
        })
      )
      .min(2)
      .max(10),
  })
  .superRefine(function (poll, ctx) {
    poll.options.forEach(function (option, index) {
      var label = option.label?.trim() ?? "";
      var imageUrl = option.imageUrl?.trim() ?? "";
      if (poll.type === "ranking" && label.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "label"],
          message: "Ranking poll options need labels",
        });
      }
      if (poll.type === "image" && imageUrl.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "imageUrl"],
          message: "Image poll options need images",
        });
      }
      if (label.length === 0 && imageUrl.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index],
          message: "Poll option needs label or image",
        });
      }
    });
  });

export var createPostSchema = z
  .object({
    type: z.enum(["text", "discussion", "log", "review", "image"]).default("text"),
    headline: z.string().trim().min(1).max(120).optional(),
    body: z.string().max(300000),
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
    media: z.array(postMediaItemSchema).max(9).optional(),
    mediaUrls: z.array(z.string().min(1).max(1000)).max(9).optional(),
    poll: createPostPollSchema.optional(),
  })
  .superRefine(function (post, ctx) {
    var visibleBody = "";
    try {
      visibleBody = richTextBodyToVisibleText(post.body).trim();
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: error instanceof Error ? error.message : "Invalid rich text body",
      });
      return;
    }

    if (!post.poll || visibleBody.length > 0) {
      try {
        validateRichTextBody(post.body, 5000);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          path: ["body"],
          message: error instanceof Error ? error.message : "Invalid rich text body",
        });
      }
    }

    if (!post.poll) return;
    if (post.type !== "text") {
      ctx.addIssue({
        code: "custom",
        path: ["poll"],
        message: "Polls are only supported on regular posts",
      });
    }
    if ((post.media?.length ?? 0) > 0 || (post.mediaUrls?.length ?? 0) > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["poll"],
        message: "Poll posts cannot include images, GIFs, or videos",
      });
    }
  });

export var notificationTypeSchema = z.enum([
  "like",
  "comment",
  "reply",
  "follow",
  "follow_request",
  "follow_request_approved",
  "mention",
  "repost",
  "film_logged",
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

export var bookmarkFolderNameSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(80),
});

export var bookmarkFolderAssignSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export var bookmarkPostSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
});

export var createChatThreadSchema = z.object({
  type: z.enum(["dm", "group"]),
  memberIds: z.array(z.string().uuid()).min(1).max(49),
  name: z.string().min(1).max(100).optional(),
});

export var sendMessageSchema = z
  .object({
    contentType: z.enum(["text", "image", "gif", "file", "link"]),
    body: z.string().min(1).max(4000).optional(),
    mediaUrl: z.string().url().optional(),
    mediaMetadata: z
      .object({
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        size: z.number().int().positive().optional(),
        mimeType: z.string().optional(),
        blurhash: z.string().optional(),
      })
      .optional(),
    linkPreview: z
      .object({
        url: z.string().url(),
        title: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
        siteName: z.string().optional(),
      })
      .optional(),
    replyToId: z.string().optional(),
  })
  .refine(
    function (data) {
      return Boolean(data.body || data.mediaUrl);
    },
    { message: "Message must have body or media" }
  );

export var editMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

export var messageReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export var typingIndicatorSchema = z.object({
  isTyping: z.boolean(),
});

export var messageCursorSchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export var inboxCursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
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
  emailPreferences: z
    .object({
      likesOnPosts: z.boolean().optional(),
      repostsOnPosts: z.boolean().optional(),
      newFollowers: z.boolean().optional(),
      followRequests: z.boolean().optional(),
      followRequestApproved: z.boolean().optional(),
      comments: z.boolean().optional(),
      replies: z.boolean().optional(),
      mentions: z.boolean().optional(),
      filmLogged: z.boolean().optional(),
    })
    .optional(),
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

export var resolveCatalogFilmSchema = z.object({
  title: z.string().trim().min(1).max(200),
  year: z.number().int().min(1800).max(2200).nullable().optional(),
  posterUrl: z.string().trim().max(1000).nullable().optional(),
  genres: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  director: z.string().trim().max(200).nullable().optional(),
  overview: z.string().trim().max(5000).nullable().optional(),
});

export var listVisibilitySchema = z.enum(["public", "private"]);

export var createFilmListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(5000).optional().nullable(),
  visibility: listVisibilitySchema.default("public"),
  isRanked: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export var updateFilmListSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(5000).optional().nullable(),
  visibility: listVisibilitySchema.optional(),
  isRanked: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export var filmListEntrySchema = z.object({
  filmId: z.string().trim().regex(ULID_RE, "filmId must be a 35mm ULID").optional(),
  film: resolveOnboardingTmdbFilmSchema.optional(),
  catalogFilm: resolveCatalogFilmSchema.optional(),
  note: z.string().max(1000).optional().nullable(),
  position: z.number().int().positive().optional().nullable(),
});

export var updateFilmListEntrySchema = z.object({
  note: z.string().max(1000).optional().nullable(),
  position: z.number().int().positive().optional().nullable(),
});

export var reorderFilmListEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        entryId: z.string().trim().min(1),
        position: z.number().int().positive(),
      })
    )
    .min(1)
    .max(500),
});

export var cloneFilmListSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  visibility: listVisibilitySchema.default("private"),
});

export var watchlistFilmSchema = z.object({
  filmId: z.string().trim().regex(ULID_RE, "filmId must be a 35mm ULID").optional(),
  film: resolveOnboardingTmdbFilmSchema.optional(),
  catalogFilm: resolveCatalogFilmSchema.optional(),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateChatThreadInput = z.infer<typeof createChatThreadSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
export type TypingIndicatorInput = z.infer<typeof typingIndicatorSchema>;
export type MessageCursorInput = z.infer<typeof messageCursorSchema>;
export type InboxCursorInput = z.infer<typeof inboxCursorSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;
export type OnboardingRoleInput = z.infer<typeof onboardingRoleSchema>;
export type OnboardingSubmitInput = z.infer<typeof onboardingSubmitSchema>;
export type ResolveOnboardingTmdbFilmInput = z.infer<typeof resolveOnboardingTmdbFilmSchema>;
export type ResolveOnboardingTmdbFilmsInput = z.infer<typeof resolveOnboardingTmdbFilmsSchema>;
export type ResolveCatalogFilmInput = z.infer<typeof resolveCatalogFilmSchema>;
export type CreateFilmListInput = z.infer<typeof createFilmListSchema>;
export type UpdateFilmListInput = z.infer<typeof updateFilmListSchema>;
export type FilmListEntryInput = z.infer<typeof filmListEntrySchema>;
export type UpdateFilmListEntryInput = z.infer<typeof updateFilmListEntrySchema>;
export type ReorderFilmListEntriesInput = z.infer<typeof reorderFilmListEntriesSchema>;
export type CloneFilmListInput = z.infer<typeof cloneFilmListSchema>;
export type WatchlistFilmInput = z.infer<typeof watchlistFilmSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type NotificationIdInput = z.infer<typeof notificationIdSchema>;
export type BookmarkFolderNameInput = z.infer<typeof bookmarkFolderNameSchema>;
export type BookmarkFolderAssignInput = z.infer<typeof bookmarkFolderAssignSchema>;
export type BookmarkPostInput = z.infer<typeof bookmarkPostSchema>;
