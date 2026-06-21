import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { users, profiles, userSettings } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { requireAuth } from "../../lib/middleware.js";
import { notFound, badRequest } from "../../lib/errors.js";

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
  theme: string | null;
  accentColor: string | null;
  videoAutoplay: boolean;
}

const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

function isValidTheme(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return ["auto", "light", "dark", "matrix", "oppenheimer-bw", "barbie"].includes(value);
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

function isValidAccentColor(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  return VALID_ACCENT_COLORS.includes(value);
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

  return message.includes("theme") || message.includes("video_autoplay") || message.includes("accent_color");
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
        theme: userSettings.theme,
        accentColor: userSettings.accentColor,
        videoAutoplay: userSettings.videoAutoplay,
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
      theme: "auto",
      accentColor: "theme",
      videoAutoplay: true,
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
    },
    appearance: {
      theme: isValidTheme(record.theme) ? record.theme : "auto",
      accentColor: isValidAccentColor(record.accentColor) ? record.accentColor : "theme",
      videoAutoplay: record.videoAutoplay,
    },
  } as const;
}

function ensureBooleanish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

export var settingsRoutes = new Hono();

settingsRoutes.get("/", requireAuth, async function (c) {
  var user = c.get("user");
  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/privacy", requireAuth, async function (c) {
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

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/notifications", requireAuth, async function (c) {
  var user = c.get("user");
  var body = await c.req.json();

  var db = getDb();
  var updates: Record<string, any> = {};

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

  var record = await fetchSettingsForUser(user.userId);
  return c.json(formatSettings(record));
});

settingsRoutes.patch("/profile", requireAuth, async function (c) {
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
      var existing = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);

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

settingsRoutes.patch("/appearance", requireAuth, async function (c) {
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
