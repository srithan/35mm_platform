"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BlurImage } from "@/components/ui/BlurImage";
import { ROUTES } from "@/lib/constants/routes";
import { RichTextRenderer } from "@/lib/utils/RichTextRenderer";
import { isStoredRichText } from "@/lib/utils/richContent";
import { RichPostInline } from "@/lib/utils/richPostText";
import { formatCount } from "@/lib/utils/formatCount";
import { PostCardHeader } from "@/features/feed/components/PostCard/PostCardHeader";
import { CommentCardHeader } from "@/features/feed/components/CommentCard/CommentCardHeader";
import type { PostVariant } from "@/features/feed/components/PostCard/types";
import type {
  ModerationContentSnapshot,
  ModerationContentType,
  ModerationReportStatus,
} from "@35mm/types";
import { fetchMyReport } from "../api/reportsApi";
import { reasonLabel } from "../data/reportReasons";
import { moderationKeys } from "../hooks/queryKeys";
import { formatReportedAt } from "./MyReportsPanel";

type SnapshotMedia = {
  type: string;
  url: string | null;
  thumbnailUrl: string | null;
  altText: string | null;
  blurhash: string | null;
};

type StatusMessage = {
  title: string;
  body: string;
  note: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
};

function snapshotString(snapshot: ModerationContentSnapshot, key: string): string | null {
  const value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function snapshotMedia(snapshot: ModerationContentSnapshot): SnapshotMedia[] {
  const value = snapshot.media;
  if (!Array.isArray(value)) return [];
  return value.flatMap(function (item) {
    if (!item || typeof item !== "object") return [];
    const media = item as Record<string, unknown>;
    const url = typeof media.url === "string" ? media.url : null;
    const thumbnailUrl = typeof media.thumbnailUrl === "string" ? media.thumbnailUrl : null;
    if (!url && !thumbnailUrl) return [];
    return [{
      type: typeof media.type === "string" ? media.type : "media",
      url,
      thumbnailUrl,
      altText: typeof media.altText === "string" ? media.altText : null,
      blurhash: typeof media.blurhash === "string" ? media.blurhash : null,
    }];
  });
}

function snapshotNumber(snapshot: ModerationContentSnapshot, key: string): number {
  const value = snapshot[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function joinedLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return "Joined " + new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function statusMessage(status: ModerationReportStatus): StatusMessage {
  if (status === "actioned") {
    return {
      title: "Thanks for speaking up",
      body: "We reviewed your report and took action.",
      note: "We can’t share details about another person’s account, but your report helped us keep 35mm safer.",
      icon: ShieldCheck,
      iconClassName: "text-success",
      iconBackgroundClassName: "bg-[color-mix(in_srgb,var(--color-success)_12%,var(--elevated))]",
    };
  }
  if (status === "dismissed") {
    return {
      title: "We reviewed your report",
      body: "We didn’t find that what you reported broke our rules.",
      note: "Thanks for taking the time to let us know. Reports help us understand what the community is experiencing.",
      icon: ShieldCheck,
      iconClassName: "text-fg-muted",
      iconBackgroundClassName: "bg-sunken",
    };
  }
  if (status === "reviewing") {
    return {
      title: "We’re taking a closer look",
      body: "Our safety team is reviewing your report.",
      note: "We’ll notify you here when the review is complete.",
      icon: Clock3,
      iconClassName: "text-warning",
      iconBackgroundClassName: "bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--elevated))]",
    };
  }
  return {
    title: "Your report is with us",
    body: "It’s in our review queue.",
    note: "We’ll notify you here when there’s an update.",
    icon: CheckCircle2,
    iconClassName: "text-fg",
    iconBackgroundClassName: "bg-sunken",
  };
}

function RichSnapshotText({ value }: { value: string }) {
  return isStoredRichText(value) ? (
    <RichTextRenderer stored={value} />
  ) : (
    <RichPostInline text={value} />
  );
}

function authorInitial(displayName: string | null, username: string | null): string {
  const source = displayName?.trim() || username?.trim() || "?";
  return source
    .split(/\s+/)
    .map(function (part) { return part[0] ?? ""; })
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function snapshotPostVariant(snapshot: ModerationContentSnapshot): PostVariant {
  const postType = snapshotString(snapshot, "post_type");
  if (postType === "discussion" || snapshotString(snapshot, "headline")) return "discussion";
  if (postType === "image") return "image";
  return "text";
}

function SnapshotBody(props: {
  body: string | null;
  headline: string | null;
  media: SnapshotMedia[];
}) {
  return (
    <>
      {props.headline ? (
        <h3 className="mt-1 text-[17px] font-bold leading-snug tracking-tight text-fg">
          <RichSnapshotText value={props.headline} />
        </h3>
      ) : null}
      {props.body ? (
        <div className={`max-w-[65ch] text-[15px] leading-[1.6] text-fg ${props.headline ? "mt-2" : "mt-1"}`}>
          <RichSnapshotText value={props.body} />
        </div>
      ) : !props.headline && props.media.length === 0 ? (
        <p className="mt-1 text-[13px] text-fg-muted">This content is no longer available to preview.</p>
      ) : null}
      {props.media.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {props.media.map(function (item, index) {
            const src = item.thumbnailUrl ?? item.url;
            return src ? (
              <BlurImage
                key={`${src}-${index}`}
                src={src}
                blurhash={item.blurhash}
                alt={item.altText ?? `Reported ${item.type}`}
                width="100%"
                height={128}
                containerClassName="h-32 rounded-lg bg-sunken"
                className="h-full w-full object-cover"
              />
            ) : null;
          })}
        </div>
      ) : null}
    </>
  );
}

export function ReportedContent(props: {
  contentType: ModerationContentType;
  snapshot: ModerationContentSnapshot;
}) {
  const snapshot = props.snapshot;
  const body = snapshotString(snapshot, "body");
  const headline = snapshotString(snapshot, "headline");
  const username = snapshotString(snapshot, "username");
  const displayName = snapshotString(snapshot, "display_name");
  const bio = snapshotString(snapshot, "bio");
  const avatarUrl = snapshotString(snapshot, "avatar_url");
  const postCount = snapshotNumber(snapshot, "post_count");
  const followerCount = snapshotNumber(snapshot, "follower_count");
  const followingCount = snapshotNumber(snapshot, "following_count");
  const joined = joinedLabel(snapshotString(snapshot, "joined_at"));
  const authorUsername = snapshotString(snapshot, "author_username");
  const authorDisplayName = snapshotString(snapshot, "author_display_name");
  const authorAvatarUrl = snapshotString(snapshot, "author_avatar_url");
  const contentCreatedAt = snapshotString(snapshot, "created_at");
  const media = snapshotMedia(snapshot);

  if (props.contentType === "post") {
    return (
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          <article className="PostCard w-full bg-bg px-4 py-4">
            <div className="flex min-w-0 items-start">
              {authorUsername ? (
                <PostCardHeader
                  variant={snapshotPostVariant(snapshot)}
                  timestamp={contentCreatedAt ? formatReportedAt(contentCreatedAt) : "Date unavailable"}
                  menu={null}
                  username={authorUsername}
                  displayName={authorDisplayName ?? authorUsername}
                  handle={`@${authorUsername}`}
                  avatarUrl={authorAvatarUrl}
                  avatarInitial={authorInitial(authorDisplayName, authorUsername)}
                >
                  <SnapshotBody body={body} headline={headline} media={media} />
                </PostCardHeader>
              ) : (
                <div className="w-full">
                  <p className="text-[12px] text-fg-muted">Author unavailable</p>
                  <SnapshotBody body={body} headline={headline} media={media} />
                </div>
              )}
            </div>
          </article>
        </div>
        <p className="mt-2 px-1 text-[11.5px] leading-4 text-fg-muted">
          This is how the post appeared when you reported it.
        </p>
      </div>
    );
  }

  if (props.contentType === "comment") {
    const comment = {
      id: "reported-comment",
      authorId: undefined,
      username: authorUsername ?? "",
      displayName: authorDisplayName ?? authorUsername ?? "",
      avatarUrl: authorAvatarUrl,
      avatarInitial: authorInitial(authorDisplayName, authorUsername),
      text: body ?? "",
      timestamp: contentCreatedAt ? formatReportedAt(contentCreatedAt) : "Date unavailable",
      likeCount: 0,
      replyCount: 0,
    };
    return (
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          <div className="CommentCard w-full bg-bg px-4 py-4">
            <div className="flex min-w-0 items-start">
              {authorUsername ? (
                <CommentCardHeader comment={comment} menu={null}>
                  {body ? (
                    <div className="mt-1 max-w-[65ch] whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fg">
                      <RichSnapshotText value={body} />
                    </div>
                  ) : (
                    <p className="mt-1 text-[13px] text-fg-muted">This comment is no longer available to preview.</p>
                  )}
                </CommentCardHeader>
              ) : (
                <div className="w-full">
                  <p className="text-[12px] text-fg-muted">Author unavailable</p>
                  {body ? (
                    <div className="mt-1 max-w-[65ch] whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fg">
                      <RichSnapshotText value={body} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 px-1 text-[11.5px] leading-4 text-fg-muted">
          This is how the comment appeared when you reported it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            {avatarUrl ? (
              <BlurImage
                src={avatarUrl}
                alt="Reported profile avatar"
                width={64}
                height={64}
                containerClassName="h-16 w-16 shrink-0 rounded-full"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sunken text-fg-muted">
                <UserRound className="h-6 w-6" strokeWidth={1.8} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-fg">
                {displayName ?? "Profile"}
              </p>
              {username ? <p className="mt-0.5 text-[12.5px] text-fg-muted">@{username}</p> : null}
              {joined ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
                  {joined}
                </p>
              ) : null}
            </div>
          </div>

          {bio ? (
            <p className="mt-4 max-w-[65ch] whitespace-pre-wrap text-[14px] leading-relaxed text-fg">
              {bio}
            </p>
          ) : null}

          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
            {[
              { label: "Posts", value: postCount },
              { label: "Followers", value: followerCount },
              { label: "Following", value: followingCount },
            ].map(function (stat) {
              return (
                <div key={stat.label} className="flex items-baseline gap-1 text-[13px]">
                  <dt className="order-2 text-fg-muted">{stat.label}</dt>
                  <dd className="order-1 font-semibold tabular-nums text-fg">
                    {formatCount(stat.value)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
      <p className="mt-2 px-1 text-[11.5px] leading-4 text-fg-muted">
        This is how the profile appeared when you reported it.
      </p>
    </div>
  );
}

function ReportDetailSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading report" aria-busy="true">
      <div className="flex gap-4">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-sunken" />
        <div className="w-full max-w-md space-y-2.5 pt-1">
          <div className="h-5 w-48 animate-pulse rounded bg-sunken" />
          <div className="h-4 w-full animate-pulse rounded bg-sunken" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-sunken" />
        </div>
      </div>
      <div className="h-36 animate-pulse rounded-xl bg-sunken" />
      <div className="h-24 animate-pulse rounded-xl bg-sunken" />
    </div>
  );
}

export function MyReportDetailPanel({ reportId }: { reportId: string }) {
  const { getToken } = useAuth();
  const reportQuery = useQuery({
    queryKey: moderationKeys.myReport(reportId),
    queryFn: async function () {
      return fetchMyReport({ reportId, token: await getToken() });
    },
  });

  if (reportQuery.isLoading) return <ReportDetailSkeleton />;

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <div className="py-8 text-center" role="alert">
        <h2 className="text-[15px] font-semibold text-fg">We couldn’t open this report</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-fg-muted">
          It may no longer be available, or you may be signed into a different account.
        </p>
        <Link
          href={ROUTES.SETTINGS_PRIVACY_REPORTS}
          className="mt-4 inline-flex rounded-full bg-fg px-4 py-2 text-[12px] font-semibold text-bg no-underline transition-opacity hover:opacity-85"
        >
          View your reports
        </Link>
      </div>
    );
  }

  const report = reportQuery.data;
  const message = statusMessage(report.status);
  const StatusIcon = message.icon;

  return (
    <div className="space-y-8">
      <section
        className="border-b border-border pb-7"
        aria-labelledby="report-status-heading"
        role="status"
      >
        <div className="flex items-start gap-3.5 sm:gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${message.iconBackgroundClassName} ${message.iconClassName}`}
            aria-hidden
          >
            <StatusIcon className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="report-status-heading" className="text-[17px] font-semibold leading-6 text-fg">
              {message.title}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-fg">{message.body}</p>
            <p className="mt-2 max-w-[65ch] text-[12.5px] leading-relaxed text-fg-muted">
              {message.note}
            </p>
            <p className="mt-3 text-[11.5px] text-fg-faint">
              Updated {formatReportedAt(report.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="reported-content-heading">
        <h2 id="reported-content-heading" className="mb-3 text-[14px] font-semibold text-fg">
          What you reported
        </h2>
        <ReportedContent contentType={report.contentType} snapshot={report.contentSnapshot} />
      </section>

      <section className="border-t border-border pt-6" aria-labelledby="report-reason-heading">
        <h2 id="report-reason-heading" className="text-[14px] font-semibold text-fg">
          What you told us
        </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          <div className="flex items-start justify-between gap-6 py-3.5">
            <span className="text-[12.5px] text-fg-muted">Reason</span>
            <span className="text-right text-[13px] font-medium text-fg">
              {reasonLabel(report.reason)}
            </span>
          </div>
          {report.details ? (
            <div className="py-3.5">
              <p className="text-[12.5px] text-fg-muted">Your note</p>
              <p className="mt-1.5 max-w-[65ch] whitespace-pre-wrap text-[13px] leading-relaxed text-fg">
                {report.details}
              </p>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-6 py-3.5">
            <span className="text-[12.5px] text-fg-muted">Sent</span>
            <span className="text-right text-[13px] text-fg">
              {formatReportedAt(report.createdAt)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
