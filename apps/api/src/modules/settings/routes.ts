import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { users, profiles, userSettings, type NotificationEmailPreferences } from "@35mm/db/schema";
import { isReservedUsername } from "@35mm/validators";
import { getDb } from "../../lib/db.js";
import { requireAuth } from "../../lib/middleware.js";
import { notFound, badRequest } from "../../lib/errors.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import { setActivityVisibilityCache } from "../chat/chatRedis.js";
import { findUsernameLock } from "../../lib/usernameLocks.js";

interface SettingsRecord {
  email: string;
  displayName: string;
  username: string;
  privateAccount: boolean;
  allowMessagesFromAnyone: boolean;
  showActivityStatus: boolean;
  notifyNewFollowers: boolean;
  notifyLikesOnPosts: boolean;
  notifyCommentsAndReplies: boolean;
  notifyMentions: boolean;
  notifyFestivalUpdates: boolean;
  notifyWatchlistStreaming: boolean;
  notifyEmailDigest: boolean;
  notificationEmailPreferences: NotificationEmailPreferences;
  theme: string | null;
  accentColor: string | null;
  videoAutoplay: boolean;
  videoDefaultQuality: string | null;
  videoAlwaysShowCaptions: boolean;
  videoCaptionStyle: string | null;
  videoQuietMode: boolean;
}

const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

function isValidTheme(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return ["auto", "light", "dark", "matinee", "matrix", "oppenheimer-bw", "barbie"].includes(value);
}

var VALID_ACCENT_COLORS = [
  "theme",
  "warm-red",
  "crimson",
  "amber",
  "forest",
  "ocean",
  "violet",
  "rose",
];

type PublicNotificationEmailPreferences = {
  likesOnPosts: boolean;
  repostsOnPosts: boolean;
  newFollowers: boolean;
  followRequests: boolean;
  followRequestApproved: boolean;
  comments: boolean;
  replies: boolean;
  mentions: boolean;
  filmLogged: boolean;
};

var DEFAULT_EMAIL_PREFERENCES: PublicNotificationEmailPreferences = {
  likesOnPosts: false,
  repostsOnPosts: false,
  newFollowers: true,
  followRequests: true,
  followRequestApproved: true,
  comments: true,
  replies: true,
  mentions: true,
  filmLogged: false,
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readEmailPreference(
  preferences: NotificationEmailPreferences | null | undefined,
  key: keyof NotificationEmailPreferences,
  fallback: boolean
): boolean {
  if (!isObjectRecord(preferences)) return fallback;
  var value = preferences[key];
  if (!isObjectRecord(value)) return fallback;
  return typeof value.enabled === "boolean" ? value.enabled : fallback;
}

function publicEmailPreferences(
  preferences: NotificationEmailPreferences | null | undefined
): PublicNotificationEmailPreferences {
  return {
    likesOnPosts: readEmailPreference(preferences, "like", DEFAULT_EMAIL_PREFERENCES.likesOnPosts),
    repostsOnPosts: readEmailPreference(preferences, "repost", DEFAULT_EMAIL_PREFERENCES.repostsOnPosts),
    newFollowers: readEmailPreference(preferences, "follow", DEFAULT_EMAIL_PREFERENCES.newFollowers),
    followRequests: readEmailPreference(preferences, "follow_request", DEFAULT_EMAIL_PREFERENCES.followRequests),
    followRequestApproved: readEmailPreference(
      preferences,
      "follow_request_approved",
      DEFAULT_EMAIL_PREFERENCES.followRequestApproved
    ),
    comments: readEmailPreference(preferences, "comment", DEFAULT_EMAIL_PREFERENCES.comments),
    replies: readEmailPreference(preferences, "reply", DEFAULT_EMAIL_PREFERENCES.replies),
    mentions: readEmailPreference(preferences, "mention", DEFAULT_EMAIL_PREFERENCES.mentions),
    filmLogged: readEmailPreference(preferences, "film_logged", DEFAULT_EMAIL_PREFERENCES.filmLogged),
  };
}

function mergeEmailPreferenceUpdates(
  current: NotificationEmailPreferences | null | undefined,
  input: unknown
): NotificationEmailPreferences | null {
  if (!isObjectRecord(input)) return null;
  var source = input;

  var next: NotificationEmailPreferences = isObjectRecord(current)
    ? JSON.parse(JSON.stringify(current)) as NotificationEmailPreferences
    : {};

  function setEnabled(field: string, key: keyof NotificationEmailPreferences) {
    var value = source[field];
    if (typeof value !== "boolean") return;
    var existing = isObjectRecord(next[key]) ? next[key] : {};
    next[key] = {
      ...existing,
      enabled: value,
    };
  }

  setEnabled("likesOnPosts", "like");
  setEnabled("repostsOnPosts", "repost");
  setEnabled("newFollowers", "follow");
  setEnabled("followRequests", "follow_request");
  setEnabled("followRequestApproved", "follow_request_approved");
  setEnabled("comments", "comment");
  setEnabled("replies", "reply");
  setEnabled("mentions", "mention");
  setEnabled("filmLogged", "film_logged");

  return next;
}

function isValidAccentColor(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return VALID_ACCENT_COLORS.includes(value);
}

function isValidVideoDefaultQuality(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return ["auto", "data_saver", "standard", "high"].includes(value);
}

function isValidVideoCaptionStyle(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return ["default", "large", "high_contrast"].includes(value);
}

function isLegacySettingsSchemaError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;

  var root = err as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
  };
  var code = String(root.code ?? root.cause?.code ?? "");
  var message = String(root.message ?? "") + " " + String(root.cause?.message ?? "");
  if (code !== "42703") return false;

  return (
    message.includes("theme") ||
    message.includes("video_autoplay") ||
    message.includes("video_default_quality") ||
    message.includes("video_always_show_captions") ||
    message.includes("video_caption_style") ||
    message.includes("video_quiet_mode") ||
    message.includes("accent_color") ||
    message.includes("notification_email_preferences")
  );
}

async function fetchSettingsForUser(userId: string): Promise<SettingsRecord> {
  var db = getDb();
  await db.execute(
    sql`insert into "user_settings" ("user_id") values (${userId}) on conflict ("user_id") do nothing`
  );

  try {
    var rows = await db
      .select({
        email: users.email,
        displayName: profiles.displayName,
        username: profiles.username,
        privateAccount: profiles.isPrivate,
        allowMessagesFromAnyone: userSettings.allowMessagesFromAnyone,
        showActivityStatus: userSettings.showActivityStatus,
        notifyNewFollowers: userSettings.notifyNewFollowers,
        notifyLikesOnPosts: userSettings.notifyLikesOnPosts,
        notifyCommentsAndReplies: userSettings.notifyCommentsAndReplies,
        notifyMentions: userSettings.notifyMentions,
        notifyFestivalUpdates: userSettings.notifyFestivalUpdates,
        notifyWatchlistStreaming: userSettings.notifyWatchlistStreaming,
        notifyEmailDigest: userSettings.notifyEmailDigest,
        notificationEmailPreferences: users.notificationEmailPreferences,
        theme: userSettings.theme,
        accentColor: userSettings.accentColor,
        videoAutoplay: userSettings.videoAutoplay,
        videoDefaultQuality: userSettings.videoDefaultQuality,
        videoAlwaysShowCaptions: userSettings.videoAlwaysShowCaptions,
        videoCaptionStyle: userSettings.videoCaptionStyle,
        videoQuietMode: userSettings.videoQuietMode,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      throw notFound("Settings not found");
    }

    return rows[0];
  } catch (err) {
    if (!isLegacySettingsSchemaError(err)) {
      throw err;
    }

    var legacyRows = await db
      .select({
        email: users.email,
        displayName: profiles.displayName,
        username: profiles.username,
        privateAccount: profiles.isPrivate,
        allowMessagesFromAnyone: userSettings.allowMessagesFromAnyone,
        showActivityStatus: userSettings.showActivityStatus,
        notifyNewFollowers: userSettings.notifyNewFollowers,
        notifyLikesOnPosts: userSettings.notifyLikesOnPosts,
        notifyCommentsAndReplies: userSettings.notifyCommentsAndReplies,
        notifyMentions: userSettings.notifyMentions,
        notifyFestivalUpdates: userSettings.notifyFestivalUpdates,
        notifyWatchlistStreaming: userSettings.notifyWatchlistStreaming,
        notifyEmailDigest: userSettings.notifyEmailDigest,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (legacyRows.length === 0) {
      throw notFound("Settings not found");
    }

    return {
      ...legacyRows[0],
      notificationEmailPreferences: {},
      theme: "auto",
      accentColor: "theme",
      videoAutoplay: true,
      videoDefaultQuality: "auto",
      videoAlwaysShowCaptions: false,
      videoCaptionStyle: "default",
      videoQuietMode: false,
    };
  }
}

function formatSettings(record: SettingsRecord) {
  return {
    profile: {
      displayName: record.displayName,
      username: record.username,
      email: record.email,
    },
    privacy: {
      privateAccount: record.privateAccount,
      allowMessagesFromAnyone: record.allowMessagesFromAnyone,
      showActivityStatus: record.showActivityStatus,
    },
    notifications: {
      newFollowers: record.notifyNewFollowers,
      likesOnPosts: record.notifyLikesOnPosts,
      commentsAndReplies: record.notifyCommentsAndReplies,
      mentions: record.notifyMentions,
      festivalUpdates: record.notifyFestivalUpdates,
      watchlistStreaming: record.notifyWatchlistStreaming,
      emailDigest: record.notifyEmailDigest,
      emailPreferences: publicEmailPreferences(record.notificationEmailPreferences),
    },
    appearance: {
      theme: isValidTheme(record.theme) ? record.theme : "auto",
      accentColor: isValidAccentColor(record.accentColor) ? record.accentColor : "theme",
      videoAutoplay: record.videoAutoplay,
    },
    media: {
      videoDefaultQuality: isValidVideoDefaultQuality(record.videoDefaultQuality)
        ? record.videoDefaultQuality
        : "auto",
      videoAutoplay: record.videoAutoplay,
      alwaysShowCaptions: record.videoAlwaysShowCaptions,
      captionStyle: isValidVideoCaptionStyle(record.videoCaptionStyle)
        ? record.videoCaptionStyle
        : "default",
      quietMode: record.videoQuietMode,
    },
  } as const;
}

function ensureBooleanish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

export var settingsRoutes = new Hono();

var settingsWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: "settings:write",
  limit: 30,
  windowSeconds: 60,
  identify: identifyByUserId,
});

settingsRoutes.get("/", requireAuth, async function (c) {
  var user = c.get("user");
  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/privacy", requireAuth, settingsWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();
  var db = getDb();
  var updates: Record<string, any> = {};

  var privateAccount = ensureBooleanish(body.privateAccount);
  if (privateAccount !== null) {
    updates.privateAccount = privateAccount;
    await db
      .update(profiles)
      .set({
        isPrivate: privateAccount,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.userId));
  }

  var allowMessagesFromAnyone = ensureBooleanish(body.allowMessagesFromAnyone);
  if (allowMessagesFromAnyone !== null) {
    updates.allowMessagesFromAnyone = allowMessagesFromAnyone;
  }

  var showActivityStatus = ensureBooleanish(body.showActivityStatus);
  if (showActivityStatus !== null) {
    updates.showActivityStatus = showActivityStatus;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db
      .update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, user.userId));
  }

  if (showActivityStatus !== null) {
    await setActivityVisibilityCache(user.userId, showActivityStatus);
  }

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/notifications", requireAuth, settingsWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();

  var db = getDb();
  var updates: Record<string, any> = {};
  var userUpdates: Record<string, any> = {};

  var newFollowers = ensureBooleanish(body.newFollowers);
  if (newFollowers !== null) {
    updates.notifyNewFollowers = newFollowers;
  }

  var likesOnPosts = ensureBooleanish(body.likesOnPosts);
  if (likesOnPosts !== null) {
    updates.notifyLikesOnPosts = likesOnPosts;
  }

  var commentsAndReplies = ensureBooleanish(body.commentsAndReplies);
  if (commentsAndReplies !== null) {
    updates.notifyCommentsAndReplies = commentsAndReplies;
  }

  var mentions = ensureBooleanish(body.mentions);
  if (mentions !== null) {
    updates.notifyMentions = mentions;
  }

  var festivalUpdates = ensureBooleanish(body.festivalUpdates);
  if (festivalUpdates !== null) {
    updates.notifyFestivalUpdates = festivalUpdates;
  }

  var watchlistStreaming = ensureBooleanish(body.watchlistStreaming);
  if (watchlistStreaming !== null) {
    updates.notifyWatchlistStreaming = watchlistStreaming;
  }

  var emailDigest = ensureBooleanish(body.emailDigest);
  if (emailDigest !== null) {
    updates.notifyEmailDigest = emailDigest;
  }

  var currentRecord = await fetchSettingsForUser(user.userId);
  var emailPreferences = mergeEmailPreferenceUpdates(
    currentRecord.notificationEmailPreferences,
    body.emailPreferences
  );
  if (emailPreferences !== null) {
    userUpdates.notificationEmailPreferences = emailPreferences;
    userUpdates.updatedAt = new Date();
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    try {
      await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, user.userId));
    } catch (err) {
      if (!isLegacySettingsSchemaError(err)) {
        throw err;
      }
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    await db.update(users).set(userUpdates).where(eq(users.id, user.userId));
  }

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/profile", requireAuth, settingsWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();
  var db = getDb();

  var profileUpdates: Record<string, any> = {};
  var userUpdates: Record<string, any> = {};

  if (body.displayName !== undefined) {
    var displayName = String(body.displayName).trim();
    if (displayName.length < 2 || displayName.length > 100) {
      throw badRequest("Display name must be 2-100 characters");
    }
    profileUpdates.displayName = displayName;
  }

  if (body.email !== undefined) {
    var email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw badRequest("Please provide a valid email");
    }
    userUpdates.email = email;
  }

  if (body.username !== undefined) {
    var username = String(body.username).toLowerCase().trim();
    if (username.length < 2) {
      throw badRequest("Username must be at least 2 characters");
    }
    if (!USERNAME_RE.test(username)) {
      throw badRequest("Letters, numbers, dots and underscores only");
    }
    if (username !== user.username) {
      if (isReservedUsername(username)) {
        return c.json({ code: "USERNAME_RESERVED", message: "Username is reserved" }, 409);
      }

      var [existing, locked] = await Promise.all([
        db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.username, username))
          .limit(1),
        findUsernameLock(db, username),
      ]);

      if (locked) {
        return c.json({ code: "USERNAME_RESERVED", message: `Username is ${locked.state}` }, 409);
      }

      if (existing.length > 0) {
        return c.json({ code: "USERNAME_TAKEN", message: "Username is already taken" }, 409);
      }

      profileUpdates.username = username;
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    await db
      .update(profiles)
      .set(profileUpdates)
      .where(eq(profiles.userId, user.userId));
  }

  if (Object.keys(userUpdates).length > 0) {
    await db.update(users).set(userUpdates).where(eq(users.id, user.userId));
  }

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/appearance", requireAuth, settingsWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();
  var db = getDb();

  var updates: Record<string, any> = {};

  if (body.theme !== undefined) {
    var theme = String(body.theme).trim();
    if (!isValidTheme(theme)) {
      throw badRequest("Invalid theme");
    }
    updates.theme = theme;
  }

  if (body.videoAutoplay !== undefined) {
    var videoAutoplay = ensureBooleanish(body.videoAutoplay);
    if (videoAutoplay === null) {
      throw badRequest("videoAutoplay must be true or false");
    }
    updates.videoAutoplay = videoAutoplay;
  }

  if (body.accentColor !== undefined) {
    var accentColor = String(body.accentColor).trim();
    if (!isValidAccentColor(accentColor)) {
      throw badRequest("Invalid accent color");
    }
    updates.accentColor = accentColor;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    try {
      await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, user.userId));
    } catch (err) {
      if (updates.accentColor !== undefined) {
        if (isLegacySettingsSchemaError(err)) {
          throw badRequest("Accent color is unavailable until database migrations are applied.");
        }
        throw err;
      }
      if (!isLegacySettingsSchemaError(err)) {
        throw err;
      }
    }
  }

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/media", requireAuth, settingsWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();
  var db = getDb();

  var updates: Record<string, any> = {};

  if (body.videoDefaultQuality !== undefined) {
    var videoDefaultQuality = String(body.videoDefaultQuality).trim();
    if (!isValidVideoDefaultQuality(videoDefaultQuality)) {
      throw badRequest("Invalid video default quality");
    }
    updates.videoDefaultQuality = videoDefaultQuality;
  }

  if (body.videoAutoplay !== undefined) {
    var videoAutoplay = ensureBooleanish(body.videoAutoplay);
    if (videoAutoplay === null) {
      throw badRequest("videoAutoplay must be true or false");
    }
    updates.videoAutoplay = videoAutoplay;
  }

  if (body.alwaysShowCaptions !== undefined) {
    var alwaysShowCaptions = ensureBooleanish(body.alwaysShowCaptions);
    if (alwaysShowCaptions === null) {
      throw badRequest("alwaysShowCaptions must be true or false");
    }
    updates.videoAlwaysShowCaptions = alwaysShowCaptions;
  }

  if (body.captionStyle !== undefined) {
    var captionStyle = String(body.captionStyle).trim();
    if (!isValidVideoCaptionStyle(captionStyle)) {
      throw badRequest("Invalid video caption style");
    }
    updates.videoCaptionStyle = captionStyle;
  }

  if (body.quietMode !== undefined) {
    var quietMode = ensureBooleanish(body.quietMode);
    if (quietMode === null) {
      throw badRequest("quietMode must be true or false");
    }
    updates.videoQuietMode = quietMode;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    try {
      await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, user.userId));
    } catch (err) {
      if (isLegacySettingsSchemaError(err)) {
        throw badRequest("Media settings are unavailable until database migrations are applied.");
      }
      throw err;
    }
  }

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});
