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

export var moderationContentTypeSchema = z.enum(["post", "comment", "profile"]);
export var moderationReportReasonSchema = z.enum([
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "nudity_sexual_content",
  "misinformation",
  "self_harm",
  "impersonation",
  "intellectual_property",
  "other",
]);
export var moderationReportStatusSchema = z.enum(["open", "reviewing", "actioned", "dismissed"]);
export var moderationActorTypeSchema = z.enum(["staff", "system"]);
export var moderationContentStatusSchema = z.enum(["visible", "hidden", "removed"]);
export var moderationActionSchema = z.enum([
  "no_action",
  "content_hidden",
  "content_removed",
  "content_warning_added",
  "user_warned",
  "user_suspended",
  "user_banned",
  "escalated",
]);

export var createReportSchema = z.object({
  contentType: moderationContentTypeSchema,
  contentId: z.string().uuid(),
  reason: moderationReportReasonSchema,
  details: z.string().trim().min(1).max(2000).optional(),
}).strict();

export var moderationReportHistoryQuerySchema = cursorPaginationSchema;

export var moderationReportParamsSchema = z.object({
  reportId: z.string().trim().regex(ULID_RE, "reportId must be a ULID"),
});

export var moderationContentParamsSchema = z.object({
  contentType: moderationContentTypeSchema,
  contentId: z.string().uuid(),
});

export var moderationQueueQuerySchema = cursorPaginationSchema.extend({
  status: moderationReportStatusSchema.optional(),
  contentType: moderationContentTypeSchema.optional(),
  reason: moderationReportReasonSchema.optional(),
});

export var moderationDetailQuerySchema = z.object({
  reportCursor: z.string().min(1).optional(),
  actionCursor: z.string().min(1).optional(),
  strikeCursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export var moderationStrikeHistoryQuerySchema = cursorPaginationSchema;

var moderationMetadataSchema = z.record(z.string().trim().min(1).max(80), z.unknown())
  .superRefine(function (value, ctx) {
    if (Object.keys(value).length > 50) {
      ctx.addIssue({ code: "custom", message: "metadata must contain at most 50 keys" });
    }
    try {
      if (JSON.stringify(value).length > 10000) {
        ctx.addIssue({ code: "custom", message: "metadata must be at most 10000 serialized characters" });
      }
    } catch (_error) {
      ctx.addIssue({ code: "custom", message: "metadata must be JSON serializable" });
    }
  });

export var moderationActionPayloadSchema = z.object({
  action: moderationActionSchema,
  reason: z.string().trim().min(1).max(1000),
  notes: z.string().trim().min(1).max(5000).optional(),
  metadata: moderationMetadataSchema.default({}),
}).strict();

export var moderationDismissPayloadSchema = z.object({
  notes: z.string().trim().min(1).max(5000).optional(),
}).strict();

export var moderationUserParamsSchema = z.object({
  userId: z.string().uuid(),
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

export var chatPresenceBatchSchema = z.object({
  userIds: z
    .array(z.string().trim().min(1).max(128))
    .max(50, "userIds must include at most 50 IDs"),
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

export var RESERVED_USERNAMES = [
  "admin",
  "api",
  "help",
  "support",
  "about",
  "terms",
  "privacy",
  "settings",
  "notifications",
  "bookmarks",
  "contribute",
  "discover",
  "new",
  "login",
  "signup",
  "forgot",
  "reset",
  "verify",
  "onboarding",
  "landing",
] as const;

var RESERVED_USERNAME_SET = new Set<string>(RESERVED_USERNAMES);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAME_SET.has(username.toLowerCase().trim());
}

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

export var contributionKindSchema = z.enum([
  "add_title",
  "edit_title",
  "credits",
  "person_update",
  "media",
  "awards_events",
  "duplicate_titles",
  "merge_people",
  "split_person",
]);

export var contributionStatusSchema = z.enum([
  "pending",
  "in_review",
  "approved",
  "rejected",
]);

var contributionSourceListSchema = z
  .array(z.string().trim().min(1).max(1000))
  .min(1, "At least one source is required")
  .max(20, "Use 20 sources or fewer");

var contributionOptionalSourceListSchema = z
  .array(z.string().trim().min(1).max(1000))
  .max(20, "Use 20 sources or fewer")
  .default([]);

var contributionCommentsSchema = z.string().trim().max(2000).optional();

var addTitleContributionPayloadSchema = z.object({
  titleType: z.enum(["film", "show", "episode"]),
  originalTitle: z.string().trim().min(1, "Original title is required").max(240),
  displayTitle: z.string().trim().max(240).optional(),
  releaseYear: z.number().int().min(1888).max(2200),
  durationMinutes: z.number().int().min(1).max(2000).optional(),
  imdbUrl: z.string().trim().max(500).optional(),
  countries: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  genres: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  synopsis: z.string().trim().min(20, "Synopsis needs at least 20 characters").max(1000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var editTitleContributionPayloadSchema = z.object({
  targetTitle: z.string().trim().min(1, "Film, show, or episode is required").max(500),
  changeAreas: z
    .array(z.enum(["title", "release", "runtime", "countries", "languages", "genres", "synopsis", "credits", "relations", "awards"]))
    .min(1, "Select at least one change area")
    .max(10),
  requestedChanges: z.string().trim().min(20, "Describe requested changes").max(5000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var creditsContributionPayloadSchema = z.object({
  targetTitle: z.string().trim().min(1, "Title is required").max(500),
  action: z.enum(["add", "edit", "remove"]),
  personName: z.string().trim().min(1, "Person name is required").max(160),
  personUrlOrId: z.string().trim().max(500).optional(),
  job: z.string().trim().min(1, "Credit or job is required").max(160),
  characterName: z.string().trim().max(160).optional(),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var personUpdateContributionPayloadSchema = z.object({
  personUrlOrId: z.string().trim().min(1, "Person page or ID is required").max(500),
  changeType: z.enum(["name", "primary_job", "biography", "image", "duplicate", "other"]),
  requestedChanges: z.string().trim().min(10, "Describe requested changes").max(4000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var mediaContributionPayloadSchema = z.object({
  target: z.string().trim().min(1, "Target film/person is required").max(500),
  mediaType: z.enum(["image", "trailer"]),
  action: z.enum(["add", "edit", "remove"]),
  mediaUrl: z.string().trim().min(1, "Media URL or existing asset reference is required").max(1000),
  rightsNote: z.string().trim().min(10, "Rights note is required").max(1200),
  sourceUrls: contributionOptionalSourceListSchema,
  comments: contributionCommentsSchema,
});

var awardsEventsContributionPayloadSchema = z.object({
  eventType: z.enum(["award", "festival"]),
  originalName: z.string().trim().min(1, "Original name is required").max(240),
  englishName: z.string().trim().max(240).optional(),
  officialUrl: z.string().trim().min(1, "Official verification URL is required").max(1000),
  startYear: z.number().int().min(1800).max(2200).optional(),
  endYear: z.number().int().min(1800).max(2200).optional(),
  requestedChanges: z.string().trim().min(10, "Describe requested addition or change").max(4000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var duplicateTitlesContributionPayloadSchema = z.object({
  primaryTitle: z.string().trim().min(1, "Canonical title is required").max(500),
  duplicateTitle: z.string().trim().min(1, "Duplicate title is required").max(500),
  reason: z.string().trim().min(10, "Explain why these are duplicates").max(3000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var mergePeopleContributionPayloadSchema = z.object({
  primaryPerson: z.string().trim().min(1, "Canonical person is required").max(500),
  duplicatePeople: z
    .array(z.string().trim().min(1).max(500))
    .min(1, "Add at least one duplicate person")
    .max(20),
  reason: z.string().trim().min(10, "Explain why these pages should merge").max(3000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

var splitPersonContributionPayloadSchema = z.object({
  sourcePerson: z.string().trim().min(1, "Person page is required").max(500),
  creditsToMove: z
    .array(z.string().trim().min(1).max(500))
    .min(1, "List at least one credit to move")
    .max(100),
  reason: z.string().trim().min(10, "Explain why this page should split").max(3000),
  sourceUrls: contributionSourceListSchema,
  comments: contributionCommentsSchema,
});

export var contributionSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add_title"), payload: addTitleContributionPayloadSchema }),
  z.object({ kind: z.literal("edit_title"), payload: editTitleContributionPayloadSchema }),
  z.object({ kind: z.literal("credits"), payload: creditsContributionPayloadSchema }),
  z.object({ kind: z.literal("person_update"), payload: personUpdateContributionPayloadSchema }),
  z.object({ kind: z.literal("media"), payload: mediaContributionPayloadSchema }),
  z.object({ kind: z.literal("awards_events"), payload: awardsEventsContributionPayloadSchema }),
  z.object({ kind: z.literal("duplicate_titles"), payload: duplicateTitlesContributionPayloadSchema }),
  z.object({ kind: z.literal("merge_people"), payload: mergePeopleContributionPayloadSchema }),
  z.object({ kind: z.literal("split_person"), payload: splitPersonContributionPayloadSchema }),
]);

export var catalogEditStatusSchema = z.enum([
  "pending_review",
  "applied",
  "rejected",
  "reverted",
  "superseded",
]);

export var catalogEditSourceSchema = z.enum([
  "studio",
  "contribution",
  "import",
  "system",
]);

export var catalogEntityTypeSchema = z.enum([
  "title",
  "person",
  "credit",
  "company",
  "title_company",
  "title_genre",
  "award",
  "award_event",
  "award_nomination",
  "media_asset",
  "external_id",
  "alias",
  "title_relation",
  "source",
]);

export var catalogRevisionActionSchema = z.enum([
  "create",
  "update",
  "delete",
  "restore",
  "merge",
  "split",
]);

export var catalogTitleTypeSchema = z.enum([
  "movie",
  "short_film",
  "documentary",
  "tv_series",
  "web_series",
  "tv_season",
  "tv_episode",
  "tv_special",
  "video",
  "other",
]);

export var catalogTitleLifecycleSchema = z.enum([
  "unknown",
  "announced",
  "in_production",
  "released",
  "ended",
  "canceled",
]);

export var catalogEntityStatusSchema = z.enum(["active", "merged", "deleted", "locked"]);

export var catalogCreditDepartmentSchema = z.enum([
  "cast",
  "directing",
  "writing",
  "production",
  "camera",
  "editing",
  "sound",
  "music",
  "art",
  "costume",
  "makeup",
  "visual_effects",
  "stunts",
  "animation",
  "crew",
  "other",
]);

export var catalogMediaTypeSchema = z.enum([
  "poster",
  "backdrop",
  "still",
  "headshot",
  "logo",
  "trailer",
  "clip",
  "featurette",
  "external_video",
]);

export var catalogMediaSourceSchema = z.enum([
  "r2",
  "cloudflare_images",
  "external_url",
  "youtube",
  "vimeo",
  "tmdb",
  "imdb",
  "official",
  "other",
]);

export var catalogExternalProviderSchema = z.enum([
  "imdb",
  "tmdb",
  "wikidata",
  "letterboxd",
  "thetvdb",
  "official_site",
  "youtube",
  "vimeo",
  "instagram",
  "wikipedia",
  "other",
]);

export var catalogAliasTypeSchema = z.enum([
  "primary",
  "original",
  "localized",
  "alternative",
  "working",
  "festival",
  "legal",
  "search",
]);

export var catalogRelationTypeSchema = z.enum([
  "sequel",
  "prequel",
  "remake",
  "spin_off",
  "adaptation",
  "alternate_version",
  "compilation",
  "related",
]);

export var catalogCompanyTypeSchema = z.enum([
  "studio",
  "production_company",
  "distributor",
  "network",
  "streamer",
  "sales_agent",
  "festival",
  "school",
  "collective",
  "other",
]);

export var catalogCompanyRoleSchema = z.enum([
  "studio",
  "production",
  "distribution",
  "network",
  "streaming",
  "sales",
  "rights_holder",
  "other",
]);

export var catalogAwardOutcomeSchema = z.enum([
  "nominee",
  "winner",
  "honoree",
  "shortlisted",
  "screened",
  "official_selection",
]);

var catalogOptionalDateSchema = z.string().trim().regex(/^\d{4}(-\d{2})?(-\d{2})?$/).nullable().optional();
var catalogStringArraySchema = z.array(z.string().trim().min(1).max(80)).max(50);
var catalogFactsSchema = z.object({
  genres: catalogStringArraySchema.optional(),
  moods: catalogStringArraySchema.optional(),
  plots: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  keywords: catalogStringArraySchema.optional(),
  contentWarnings: catalogStringArraySchema.optional(),
}).passthrough();

export var catalogTitleDataSchema = z.object({
  legacyFilmId: z.string().trim().regex(ULID_RE).nullable().optional(),
  type: catalogTitleTypeSchema.optional(),
  lifecycle: catalogTitleLifecycleSchema.optional(),
  status: catalogEntityStatusSchema.optional(),
  primaryTitle: z.string().trim().min(1).max(500).optional(),
  originalTitle: z.string().trim().min(1).max(500).nullable().optional(),
  sortTitle: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  synopsis: z.string().trim().max(10000).nullable().optional(),
  startYear: z.number().int().min(1800).max(2300).nullable().optional(),
  endYear: z.number().int().min(1800).max(2300).nullable().optional(),
  releaseDate: catalogOptionalDateSchema,
  runtimeMinutes: z.number().int().min(1).max(6000).nullable().optional(),
  primaryLanguage: z.string().trim().min(2).max(20).nullable().optional(),
  primaryCountry: z.string().trim().min(2).max(20).nullable().optional(),
  originCountries: catalogStringArraySchema.optional(),
  spokenLanguages: catalogStringArraySchema.optional(),
  facts: catalogFactsSchema.optional(),
  parentTitleId: z.string().trim().regex(ULID_RE).nullable().optional(),
  seasonNumber: z.number().int().min(0).max(10000).nullable().optional(),
  episodeNumber: z.number().int().min(0).max(10000).nullable().optional(),
  absoluteEpisodeNumber: z.number().int().min(0).max(100000).nullable().optional(),
  isAdult: z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).strict();

export var catalogPersonDataSchema = z.object({
  status: catalogEntityStatusSchema.optional(),
  primaryName: z.string().trim().min(1).max(500).optional(),
  sortName: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  biography: z.string().trim().max(20000).nullable().optional(),
  birthDate: catalogOptionalDateSchema,
  deathDate: catalogOptionalDateSchema,
  birthPlace: z.string().trim().max(500).nullable().optional(),
  deathPlace: z.string().trim().max(500).nullable().optional(),
  primaryProfessions: catalogStringArraySchema.optional(),
  gender: z.string().trim().max(80).nullable().optional(),
  isVerified: z.boolean().optional(),
}).strict();

export var catalogCreditDataSchema = z.object({
  titleId: z.string().trim().regex(ULID_RE).optional(),
  personId: z.string().trim().regex(ULID_RE).optional(),
  department: catalogCreditDepartmentSchema.optional(),
  job: z.string().trim().min(1).max(200).optional(),
  characterName: z.string().trim().max(500).nullable().optional(),
  creditedAs: z.string().trim().max(500).nullable().optional(),
  billingOrder: z.number().int().min(0).max(100000).optional(),
  episodeCount: z.number().int().min(0).max(100000).nullable().optional(),
  startYear: z.number().int().min(1800).max(2300).nullable().optional(),
  endYear: z.number().int().min(1800).max(2300).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  status: catalogEntityStatusSchema.optional(),
}).strict();

var catalogMediaMetadataSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  blurhash: z.string().trim().max(200).optional(),
  variants: z.record(z.string().trim().min(1).max(80), z.string().trim().min(1).max(1000)).optional(),
}).passthrough();

export var catalogMediaAssetDataSchema = z.object({
  entityType: catalogEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).max(80).optional(),
  type: catalogMediaTypeSchema.optional(),
  source: catalogMediaSourceSchema.optional(),
  url: z.string().trim().min(1).max(2000).optional(),
  storageKey: z.string().trim().max(1000).nullable().optional(),
  title: z.string().trim().max(500).nullable().optional(),
  caption: z.string().trim().max(1000).nullable().optional(),
  language: z.string().trim().max(20).nullable().optional(),
  region: z.string().trim().max(20).nullable().optional(),
  rightsNote: z.string().trim().max(1000).nullable().optional(),
  attribution: z.string().trim().max(1000).nullable().optional(),
  metadata: catalogMediaMetadataSchema.optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isPrimary: z.boolean().optional(),
  status: catalogEntityStatusSchema.optional(),
}).strict();

export var catalogExternalIdDataSchema = z.object({
  entityType: catalogEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).max(80).optional(),
  provider: catalogExternalProviderSchema.optional(),
  externalId: z.string().trim().min(1).max(500).optional(),
  url: z.string().trim().max(2000).nullable().optional(),
  isPrimary: z.boolean().optional(),
  status: catalogEntityStatusSchema.optional(),
}).strict();

export var catalogAliasDataSchema = z.object({
  entityType: catalogEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).max(80).optional(),
  type: catalogAliasTypeSchema.optional(),
  value: z.string().trim().min(1).max(500).optional(),
  sortValue: z.string().trim().min(1).max(500).optional(),
  language: z.string().trim().max(20).nullable().optional(),
  region: z.string().trim().max(20).nullable().optional(),
  attributes: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  isPrimary: z.boolean().optional(),
}).strict();

export var catalogCompanyDataSchema = z.object({
  status: catalogEntityStatusSchema.optional(),
  type: catalogCompanyTypeSchema.optional(),
  name: z.string().trim().min(1).max(500).optional(),
  sortName: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  country: z.string().trim().max(20).nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2300).nullable().optional(),
  dissolvedYear: z.number().int().min(1800).max(2300).nullable().optional(),
  officialUrl: z.string().trim().max(2000).nullable().optional(),
  isVerified: z.boolean().optional(),
}).strict();

export var catalogTitleRelationDataSchema = z.object({
  fromTitleId: z.string().trim().regex(ULID_RE).optional(),
  toTitleId: z.string().trim().regex(ULID_RE).optional(),
  type: catalogRelationTypeSchema.optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  note: z.string().trim().max(2000).nullable().optional(),
}).strict();

export var catalogTitleCompanyDataSchema = z.object({
  titleId: z.string().trim().regex(ULID_RE).optional(),
  companyId: z.string().trim().regex(ULID_RE).optional(),
  role: catalogCompanyRoleSchema.optional(),
  region: z.string().trim().max(20).nullable().optional(),
  startDate: catalogOptionalDateSchema,
  endDate: catalogOptionalDateSchema,
  sortOrder: z.number().int().min(0).max(100000).optional(),
}).strict();

export var catalogTitleGenreDataSchema = z.object({
  titleId: z.string().trim().regex(ULID_RE).optional(),
  genreId: z.string().trim().regex(ULID_RE).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
}).strict();

export var catalogAwardDataSchema = z.object({
  status: catalogEntityStatusSchema.optional(),
  name: z.string().trim().min(1).max(500).optional(),
  originalName: z.string().trim().max(500).nullable().optional(),
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  officialUrl: z.string().trim().max(2000).nullable().optional(),
  country: z.string().trim().max(20).nullable().optional(),
  firstYear: z.number().int().min(1800).max(2300).nullable().optional(),
  lastYear: z.number().int().min(1800).max(2300).nullable().optional(),
}).strict();

export var catalogAwardEventDataSchema = z.object({
  awardId: z.string().trim().regex(ULID_RE).optional(),
  name: z.string().trim().min(1).max(500).optional(),
  year: z.number().int().min(1800).max(2300).optional(),
  eventDate: catalogOptionalDateSchema,
  location: z.string().trim().max(500).nullable().optional(),
  officialUrl: z.string().trim().max(2000).nullable().optional(),
}).strict();

export var catalogAwardNominationDataSchema = z.object({
  eventId: z.string().trim().regex(ULID_RE).optional(),
  categoryName: z.string().trim().min(1).max(500).optional(),
  outcome: catalogAwardOutcomeSchema.optional(),
  titleId: z.string().trim().regex(ULID_RE).nullable().optional(),
  personId: z.string().trim().regex(ULID_RE).nullable().optional(),
  companyId: z.string().trim().regex(ULID_RE).nullable().optional(),
  creditedName: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
}).strict();

export var catalogSourceInputSchema = z.object({
  entityType: catalogEntityTypeSchema.optional().nullable(),
  entityId: z.string().trim().min(1).max(80).optional().nullable(),
  url: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(500).optional().nullable(),
  publisher: z.string().trim().max(300).optional().nullable(),
  accessedAt: z.string().datetime().optional().nullable(),
  archiveUrl: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
}).strict();

var catalogOperationBaseSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  entityId: z.string().trim().regex(ULID_RE).optional(),
  publicVisible: z.boolean().default(true).optional(),
});

export var catalogOperationSchema = z.discriminatedUnion("entityType", [
  catalogOperationBaseSchema.extend({
    entityType: z.literal("title"),
    data: catalogTitleDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("person"),
    data: catalogPersonDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("credit"),
    data: catalogCreditDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("media_asset"),
    data: catalogMediaAssetDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("external_id"),
    data: catalogExternalIdDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("alias"),
    data: catalogAliasDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("company"),
    data: catalogCompanyDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("title_relation"),
    data: catalogTitleRelationDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("title_company"),
    data: catalogTitleCompanyDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("title_genre"),
    data: catalogTitleGenreDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("award"),
    data: catalogAwardDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("award_event"),
    data: catalogAwardEventDataSchema,
  }),
  catalogOperationBaseSchema.extend({
    entityType: z.literal("award_nomination"),
    data: catalogAwardNominationDataSchema,
  }),
]).superRefine(function (operation, ctx) {
  if (operation.action !== "create" && !operation.entityId) {
    ctx.addIssue({
      code: "custom",
      path: ["entityId"],
      message: "entityId is required for update/delete operations",
    });
  }
  if (operation.action === "create" && Object.keys(operation.data).length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["data"],
      message: "create operation needs data",
    });
  }
  if (operation.action === "update" && Object.keys(operation.data).length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["data"],
      message: "update operation needs at least one field",
    });
  }
  if (operation.entityType === "award_nomination" && operation.action === "create") {
    var data = operation.data as z.infer<typeof catalogAwardNominationDataSchema>;
    if (!data.titleId && !data.personId && !data.companyId) {
      ctx.addIssue({
        code: "custom",
        path: ["data"],
        message: "award nomination needs titleId, personId, or companyId",
      });
    }
  }
});

export var stageCatalogEditSchema = z.object({
  source: catalogEditSourceSchema,
  summary: z.string().trim().min(1).max(500),
  rationale: z.string().trim().max(5000).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(200).optional().nullable(),
  publicVisible: z.boolean().default(true),
  sourceSnapshotAt: z.string().datetime().optional().nullable(),
  operations: z.array(catalogOperationSchema).min(1).max(100),
  sources: z.array(catalogSourceInputSchema).max(20).default([]),
}).strict();

export var catalogWorkflowPayloadSchema = z.object({
  rationale: z.string().trim().max(5000).optional(),
}).strict().default({});

export var catalogMergeEntitiesSchema = z.object({
  entityType: z.enum(["title", "person", "company"]),
  duplicateEntityId: z.string().trim().regex(ULID_RE),
  canonicalEntityId: z.string().trim().regex(ULID_RE),
  actorUserId: z.string().uuid().nullable().optional(),
  source: z.enum(["studio", "system"]),
  summary: z.string().trim().min(1).max(500),
  rationale: z.string().trim().max(5000).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(200).optional().nullable(),
  publicVisible: z.boolean().default(true),
  sources: z.array(catalogSourceInputSchema).max(20).default([]),
}).strict();

export var catalogHistoryQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export var catalogIdParamSchema = z.object({
  id: z.string().trim().regex(ULID_RE),
});

export var catalogReadPageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export var catalogTitleSearchQuerySchema = catalogReadPageQuerySchema.extend({
  query: z.string().trim().min(1).max(200).optional(),
  type: catalogTitleTypeSchema.optional(),
  year: z.coerce.number().int().min(1800).max(2300).optional(),
  externalProvider: catalogExternalProviderSchema.optional(),
  externalId: z.string().trim().min(1).max(500).optional(),
}).superRefine(function (query, ctx) {
  if ((query.externalProvider && !query.externalId) || (!query.externalProvider && query.externalId)) {
    ctx.addIssue({
      code: "custom",
      path: ["externalId"],
      message: "externalProvider and externalId must be supplied together",
    });
  }
});

export var catalogPeopleSearchQuerySchema = catalogReadPageQuerySchema.extend({
  query: z.string().trim().min(1).max(200).optional(),
});

export var catalogCompanySearchQuerySchema = catalogReadPageQuerySchema.extend({
  query: z.string().trim().min(1).max(200).optional(),
});

export var catalogCreditsQuerySchema = catalogReadPageQuerySchema.extend({
  department: catalogCreditDepartmentSchema.optional(),
});

export var catalogMediaQuerySchema = catalogReadPageQuerySchema.extend({
  type: catalogMediaTypeSchema.optional(),
});

export var catalogCompanyTitlesQuerySchema = catalogReadPageQuerySchema.extend({
  role: catalogCompanyRoleSchema.optional(),
});

export var catalogEditQueueQuerySchema = catalogReadPageQuerySchema.extend({
  status: catalogEditStatusSchema.optional(),
  entityType: catalogEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).max(80).optional(),
  source: catalogEditSourceSchema.optional(),
}).superRefine(function (query, ctx) {
  if (query.entityId && !query.entityType) {
    ctx.addIssue({
      code: "custom",
      path: ["entityType"],
      message: "entityType is required when entityId is supplied",
    });
  }
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ModerationReportParamsInput = z.infer<typeof moderationReportParamsSchema>;
export type ModerationContentParamsInput = z.infer<typeof moderationContentParamsSchema>;
export type ModerationQueueQueryInput = z.infer<typeof moderationQueueQuerySchema>;
export type ModerationDetailQueryInput = z.infer<typeof moderationDetailQuerySchema>;
export type ModerationStrikeHistoryQueryInput = z.infer<typeof moderationStrikeHistoryQuerySchema>;
export type ModerationActionPayloadInput = z.infer<typeof moderationActionPayloadSchema>;
export type ModerationDismissPayloadInput = z.infer<typeof moderationDismissPayloadSchema>;
export type ModerationUserParamsInput = z.infer<typeof moderationUserParamsSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateChatThreadInput = z.infer<typeof createChatThreadSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
export type TypingIndicatorInput = z.infer<typeof typingIndicatorSchema>;
export type MessageCursorInput = z.infer<typeof messageCursorSchema>;
export type ChatPresenceBatchInput = z.infer<typeof chatPresenceBatchSchema>;
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
export type ContributionKindInput = z.infer<typeof contributionKindSchema>;
export type ContributionStatusInput = z.infer<typeof contributionStatusSchema>;
export type ContributionSubmissionInput = z.infer<typeof contributionSubmissionSchema>;
export type StageCatalogEditInput = z.infer<typeof stageCatalogEditSchema>;
export type CatalogOperationInput = z.infer<typeof catalogOperationSchema>;
export type CatalogSourceInput = z.infer<typeof catalogSourceInputSchema>;
export type CatalogMergeEntitiesInput = z.infer<typeof catalogMergeEntitiesSchema>;
export type CatalogWorkflowPayloadInput = z.infer<typeof catalogWorkflowPayloadSchema>;
export type CatalogHistoryQueryInput = z.infer<typeof catalogHistoryQuerySchema>;
export type CatalogIdParamInput = z.infer<typeof catalogIdParamSchema>;
export type CatalogReadPageQueryInput = z.infer<typeof catalogReadPageQuerySchema>;
export type CatalogTitleSearchQueryInput = z.infer<typeof catalogTitleSearchQuerySchema>;
export type CatalogPeopleSearchQueryInput = z.infer<typeof catalogPeopleSearchQuerySchema>;
export type CatalogCompanySearchQueryInput = z.infer<typeof catalogCompanySearchQuerySchema>;
export type CatalogCreditsQueryInput = z.infer<typeof catalogCreditsQuerySchema>;
export type CatalogMediaQueryInput = z.infer<typeof catalogMediaQuerySchema>;
export type CatalogCompanyTitlesQueryInput = z.infer<typeof catalogCompanyTitlesQuerySchema>;
export type CatalogEditQueueQueryInput = z.infer<typeof catalogEditQueueQuerySchema>;
