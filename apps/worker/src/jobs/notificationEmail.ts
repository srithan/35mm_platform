import { createHmac } from "node:crypto";
import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import {
  comments,
  films,
  posts,
  profiles,
  users,
  type Db,
  type NotificationEmailPreferences,
} from "@35mm/db";
import { loadWorkerEnv } from "../lib/env.js";

type EmailNotificationType =
  | "like"
  | "repost"
  | "follow"
  | "follow_request"
  | "follow_request_approved"
  | "comment"
  | "reply"
  | "mention"
  | "film_logged";

type ActorProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type NotificationEmailInput = {
  notificationId: string;
  recipientId: string;
  type: string;
  entityId: string | null;
  entityType: string | null;
  bundleCount: number;
  actorProfiles: ActorProfile[];
  db: Db;
};

type NotificationEntityContext = {
  postId: string | null;
  ownerUsername: string | null;
  postType: string | null;
  filmTitle: string | null;
};

type NotificationEmailContent = {
  subject: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
};

var resendClient: Resend | null = null;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function mapNotificationType(type: string): EmailNotificationType | null {
  switch (type) {
    case "like":
      return "like";
    case "repost":
      return "repost";
    case "follow":
      return "follow";
    case "follow_request":
      return "follow_request";
    case "follow_request_approved":
      return "follow_request_approved";
    case "comment":
      return "comment";
    case "reply":
      return "reply";
    case "mention":
      return "mention";
    case "film_logged":
      return "film_logged";
    default:
      return null;
  }
}

function defaultEmailEnabled(type: EmailNotificationType): boolean {
  switch (type) {
    case "like":
    case "repost":
    case "film_logged":
      return false;
    case "follow":
    case "follow_request":
    case "follow_request_approved":
    case "comment":
    case "reply":
    case "mention":
      return true;
  }
}

function readPreference(
  preferences: NotificationEmailPreferences | null | undefined,
  type: EmailNotificationType
): { enabled: boolean; lastSentAt: string | null } {
  if (!isObjectRecord(preferences)) {
    return {
      enabled: defaultEmailEnabled(type),
      lastSentAt: null,
    };
  }

  var value = preferences[type];
  if (!isObjectRecord(value)) {
    return {
      enabled: defaultEmailEnabled(type),
      lastSentAt: null,
    };
  }

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : defaultEmailEnabled(type),
    lastSentAt: typeof value.lastSentAt === "string" ? value.lastSentAt : null,
  };
}

function withLastSentAt(
  preferences: NotificationEmailPreferences | null | undefined,
  type: EmailNotificationType,
  sentAt: Date
): NotificationEmailPreferences {
  var next: NotificationEmailPreferences = isObjectRecord(preferences)
    ? JSON.parse(JSON.stringify(preferences)) as NotificationEmailPreferences
    : {};
  var existing = isObjectRecord(next[type]) ? next[type] : {};
  next[type] = {
    ...existing,
    enabled: readPreference(preferences, type).enabled,
    lastSentAt: sentAt.toISOString(),
  };
  return next;
}

function isCoolingDown(lastSentAt: string | null, cooldownMinutes: number, now: Date): boolean {
  if (!lastSentAt) return false;
  var sentAtTime = new Date(lastSentAt).getTime();
  if (!Number.isFinite(sentAtTime)) return false;
  return now.getTime() - sentAtTime < cooldownMinutes * 60 * 1000;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string): string {
  return normalizeBaseUrl(baseUrl) + path;
}

function actorDisplayName(actor: ActorProfile | undefined): string {
  if (!actor) return "Someone";
  return actor.displayName?.trim() || actor.username?.trim() || "Someone";
}

function actorSummary(actors: ActorProfile[], bundleCount: number): string {
  var first = actorDisplayName(actors[0]);
  if (bundleCount <= 1) return first;
  var others = Math.max(0, bundleCount - 1);
  if (others === 1) return first + " and 1 other";
  return first + " and " + others + " others";
}

function postDescription(context: NotificationEntityContext | null): string {
  if (!context) return "your post";

  var filmTitle = context.filmTitle?.trim();
  if (filmTitle) {
    if (context.postType === "review") return "your review of " + filmTitle;
    if (context.postType === "log") return "your log of " + filmTitle;
    return "your post about " + filmTitle;
  }

  if (context.postType === "review") return "your review";
  if (context.postType === "log") return "your log";
  return "your post";
}

function createUnsubscribeToken(userId: string, type: EmailNotificationType, secret: string): string {
  var payload = Buffer.from(JSON.stringify({ userId, type }), "utf8").toString("base64url");
  var signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return payload + "." + signature;
}

function getResendClient(apiKey: string): Resend {
  if (resendClient) return resendClient;
  resendClient = new Resend(apiKey);
  return resendClient;
}

async function resolveEntityContext(
  db: Db,
  entityType: string | null,
  entityId: string | null
): Promise<NotificationEntityContext | null> {
  if (!entityType || !entityId) return null;

  if (entityType === "post") {
    var postRows = await db
      .select({
        postId: posts.id,
        ownerUsername: profiles.username,
        postType: posts.type,
        filmTitle: films.title,
      })
      .from(posts)
      .innerJoin(profiles, eq(profiles.userId, posts.userId))
      .leftJoin(films, eq(films.id, posts.filmId))
      .where(eq(posts.id, entityId))
      .limit(1);

    return postRows[0] ?? null;
  }

  if (entityType === "comment") {
    var commentRows = await db
      .select({
        postId: comments.postId,
        ownerUsername: profiles.username,
        postType: posts.type,
        filmTitle: films.title,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .innerJoin(profiles, eq(profiles.userId, posts.userId))
      .leftJoin(films, eq(films.id, posts.filmId))
      .where(eq(comments.id, entityId))
      .limit(1);

    var row = commentRows[0];
    if (!row) return null;
    return {
      postId: row.postId,
      ownerUsername: row.ownerUsername,
      postType: row.postType,
      filmTitle: row.filmTitle,
    };
  }

  if (entityType === "film") {
    var filmRows = await db
      .select({
        filmTitle: films.title,
      })
      .from(films)
      .where(eq(films.id, entityId))
      .limit(1);

    var filmRow = filmRows[0];
    if (!filmRow) return null;
    return {
      postId: null,
      ownerUsername: null,
      postType: null,
      filmTitle: filmRow.filmTitle,
    };
  }

  return null;
}

function notificationActionUrl(
  appBaseUrl: string,
  type: EmailNotificationType,
  context: NotificationEntityContext | null,
  actors: ActorProfile[]
): string {
  if (context?.postId && context.ownerUsername) {
    return buildUrl(appBaseUrl, "/" + encodeURIComponent(context.ownerUsername) + "/post/" + encodeURIComponent(context.postId));
  }

  if (
    (type === "follow" || type === "follow_request" || type === "follow_request_approved") &&
    actors[0]?.username
  ) {
    return buildUrl(appBaseUrl, "/" + encodeURIComponent(actors[0].username));
  }

  return buildUrl(appBaseUrl, "/notifications");
}

function buildEmailContent(params: {
  type: EmailNotificationType;
  actors: ActorProfile[];
  bundleCount: number;
  context: NotificationEntityContext | null;
  appBaseUrl: string;
}): NotificationEmailContent {
  var actor = actorSummary(params.actors, params.bundleCount);
  var post = postDescription(params.context);
  var filmTitle = params.context?.filmTitle?.trim();
  var actionUrl = notificationActionUrl(params.appBaseUrl, params.type, params.context, params.actors);

  switch (params.type) {
    case "like":
      return {
        subject: actor + " reacted to " + post,
        body: actor + " reacted to " + post + ".",
        actionUrl,
        actionLabel: "View post",
      };
    case "repost":
      return {
        subject: actor + " reposted " + post,
        body: actor + " reposted " + post + ".",
        actionUrl,
        actionLabel: "View post",
      };
    case "follow":
      return {
        subject: actor + " followed you on 35mm",
        body: actor + " started following you.",
        actionUrl,
        actionLabel: "View profile",
      };
    case "follow_request":
      return {
        subject: actor + " requested to follow you",
        body: actor + " requested to follow your private account.",
        actionUrl,
        actionLabel: "Review request",
      };
    case "follow_request_approved":
      return {
        subject: actor + " accepted your follow request",
        body: actor + " accepted your follow request.",
        actionUrl,
        actionLabel: "View profile",
      };
    case "comment":
      return {
        subject: actor + " commented on " + post,
        body: actor + " commented on " + post + ".",
        actionUrl,
        actionLabel: "View comment",
      };
    case "reply":
      return {
        subject: actor + " replied to your comment",
        body: actor + " replied to your comment on " + post + ".",
        actionUrl,
        actionLabel: "View reply",
      };
    case "mention":
      return {
        subject: actor + " mentioned you on 35mm",
        body: actor + " mentioned you in " + post + ".",
        actionUrl,
        actionLabel: "View mention",
      };
    case "film_logged":
      return {
        subject: actor + " logged " + (filmTitle || "a film you logged"),
        body: actor + " logged " + (filmTitle || "a film you also logged") + ".",
        actionUrl,
        actionLabel: "View activity",
      };
  }
}

function NotificationEmailTemplate(props: {
  preview: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
  unsubscribeUrl: string;
}) {
  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, props.preview),
    React.createElement(
      Body,
      {
        style: {
          margin: "0",
          backgroundColor: "#f8f5f1",
          color: "#201d1b",
          fontFamily: "Arial, sans-serif",
        },
      },
      React.createElement(
        Container,
        {
          style: {
            maxWidth: "560px",
            margin: "0 auto",
            padding: "32px 20px",
          },
        },
        React.createElement(
          Text,
          {
            style: {
              margin: "0 0 24px",
              color: "#c2473a",
              fontSize: "22px",
              fontWeight: "700",
              letterSpacing: "0",
            },
          },
          "35mm"
        ),
        React.createElement(
          Section,
          {
            style: {
              backgroundColor: "#ffffff",
              border: "1px solid #e7ddd4",
              borderRadius: "8px",
              padding: "24px",
            },
          },
          React.createElement(
            Text,
            {
              style: {
                margin: "0 0 20px",
                fontSize: "16px",
                lineHeight: "24px",
              },
            },
            props.body
          ),
          React.createElement(
            Button,
            {
              href: props.actionUrl,
              style: {
                backgroundColor: "#c2473a",
                borderRadius: "6px",
                color: "#ffffff",
                display: "inline-block",
                fontSize: "14px",
                fontWeight: "700",
                padding: "11px 16px",
                textDecoration: "none",
              },
            },
            props.actionLabel
          )
        ),
        React.createElement(Hr, { style: { borderColor: "#e7ddd4", margin: "24px 0" } }),
        React.createElement(
          Text,
          {
            style: {
              color: "#766d66",
              fontSize: "12px",
              lineHeight: "18px",
              margin: "0",
            },
          },
          "You can ",
          React.createElement(Link, { href: props.unsubscribeUrl, style: { color: "#766d66" } }, "unsubscribe"),
          " from this kind of notification email."
        )
      )
    )
  );
}

export async function sendNotificationEmail(input: NotificationEmailInput): Promise<boolean> {
  var env = loadWorkerEnv();
  var apiKey = env.RESEND_API_KEY.trim();
  var unsubscribeSecret = env.EMAIL_UNSUBSCRIBE_SECRET.trim();
  if (!apiKey || !unsubscribeSecret) {
    return false;
  }

  var emailType = mapNotificationType(input.type);
  if (!emailType) {
    return false;
  }

  var db = input.db;
  var recipientRows = await db
    .select({
      email: users.email,
      preferences: users.notificationEmailPreferences,
    })
    .from(users)
    .where(eq(users.id, input.recipientId))
    .limit(1);

  var recipient = recipientRows[0];
  if (!recipient?.email) return false;

  var now = new Date();
  var cooldownMinutes = Number.isFinite(env.NOTIFICATION_EMAIL_COOLDOWN_MINUTES)
    ? Math.max(1, env.NOTIFICATION_EMAIL_COOLDOWN_MINUTES)
    : 60;
  var preference = readPreference(recipient.preferences, emailType);
  if (!preference.enabled || isCoolingDown(preference.lastSentAt, cooldownMinutes, now)) {
    return false;
  }

  var nextPreferences = withLastSentAt(recipient.preferences, emailType, now);
  await db
    .update(users)
    .set({
      notificationEmailPreferences: nextPreferences,
      updatedAt: now,
    })
    .where(eq(users.id, input.recipientId));

  var context = await resolveEntityContext(db, input.entityType, input.entityId);
  var appBaseUrl = normalizeBaseUrl(env.APP_BASE_URL);
  var apiBaseUrl = normalizeBaseUrl(env.API_PUBLIC_BASE_URL);
  var content = buildEmailContent({
    type: emailType,
    actors: input.actorProfiles,
    bundleCount: input.bundleCount,
    context,
    appBaseUrl,
  });
  var token = createUnsubscribeToken(input.recipientId, emailType, unsubscribeSecret);
  var unsubscribeUrl = buildUrl(apiBaseUrl, "/v1/email/unsubscribe?token=" + encodeURIComponent(token));
  var email = React.createElement(NotificationEmailTemplate, {
    preview: content.subject,
    body: content.body,
    actionUrl: content.actionUrl,
    actionLabel: content.actionLabel,
    unsubscribeUrl,
  });
  var html = await render(email);
  var text = await render(email, { plainText: true });

  var result = await getResendClient(apiKey).emails.send({
    from: env.EMAIL_FROM,
    to: recipient.email,
    subject: content.subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<" + unsubscribeUrl + ">",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (result.error) {
    console.error("[notification-email] send failed", {
      notificationId: input.notificationId,
      recipientId: input.recipientId,
      type: input.type,
      error: result.error,
    });
    return false;
  }

  console.log("[notification-email] sent", {
    notificationId: input.notificationId,
    recipientId: input.recipientId,
    type: input.type,
    resendId: result.data?.id ?? null,
  });

  return true;
}
