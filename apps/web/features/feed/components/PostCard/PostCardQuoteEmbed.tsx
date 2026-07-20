"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Film, LockKeyhole } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import { RichTextRenderer } from "@/lib/utils/RichTextRenderer";
import { isStoredRichText } from "@/lib/utils/richContent";
import { RichPostInline } from "@/lib/utils/richPostText";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";
import type { QuotedPost } from "../../types/feed";

function formatQuoteTime(iso: string): string {
  var then = Date.parse(iso);
  if (Number.isNaN(then)) return "now";
  var diff = Math.max(0, Date.now() - then);
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function QuoteText({ text }: { text: string }) {
  return isStoredRichText(text) ? (
    <RichTextRenderer stored={text} stopLinkPropagation />
  ) : (
    <RichPostInline text={text} stopLinkPropagation />
  );
}

export function PostCardQuoteEmbed({
  post,
  unavailable,
}: {
  post?: QuotedPost | null;
  unavailable?: boolean;
}) {
  const router = useRouter();

  if (!post) {
    if (!unavailable) return null;
    return (
      <div
        className="mt-3 flex min-h-24 items-center justify-center gap-2 rounded-xl border border-border bg-sunken/45 px-4 text-sm text-fg-muted"
        data-testid="quoted-post-unavailable"
      >
        <LockKeyhole className="h-4 w-4" aria-hidden />
        This post is unavailable
      </div>
    );
  }

  const media = post.media.filter(function (item) {
    return item.type === "image" || item.type === "video";
  }).slice(0, 4);
  const href = ROUTES.POST(post.author.username, post.id);

  const navigate = () => {
    router.push(href);
  };

  return (
    <div
      className="mt-3 overflow-hidden rounded-xl border border-border-strong bg-bg transition-colors hover:bg-card-hover"
      role="link"
      tabIndex={0}
      aria-label={`Quoted post by ${post.author.displayName}`}
      onClick={(event) => {
        event.stopPropagation();
        navigate();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        navigate();
      }}
    >
      <div className="px-3.5 pb-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            initial={post.author.displayName.charAt(0).toUpperCase() || "U"}
            src={post.author.avatarUrl}
            size="sm"
            className="h-6 w-6"
          />
          <span className="truncate text-[13px] font-bold text-fg">
            {post.author.displayName}
          </span>
          <span className="truncate text-[13px] text-fg-muted">
            @{post.author.username}
          </span>
          <span className="shrink-0 text-[13px] text-fg-muted">
            · {formatQuoteTime(post.createdAt)}
          </span>
        </div>

        {post.headline ? (
          <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-fg">
            <QuoteText text={post.headline} />
          </h3>
        ) : null}
        {post.body ? (
          <div className="mt-1 line-clamp-4 text-[14px] leading-relaxed text-fg">
            <QuoteText text={post.body} />
          </div>
        ) : null}

        {post.poll ? (
          <div className="mt-3 space-y-1.5" aria-label="Quoted poll">
            {post.poll.options.slice(0, 4).map(function (option) {
              return (
                <div
                  key={option.id}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-light"
                >
                  {option.label ?? "Image option"}
                </div>
              );
            })}
            <span className="block text-[11px] text-fg-muted">Poll</span>
          </div>
        ) : null}

        {post.film ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-2">
            {post.film.posterUrl ? (
              <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-border">
                <Image
                  src={post.film.posterUrl}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized={shouldLoadRemoteImageUnoptimized(post.film.posterUrl)}
                />
              </div>
            ) : (
              <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-border">
                <Film className="h-4 w-4 text-fg-muted" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-fg">{post.film.title}</p>
              {post.film.year ? (
                <p className="text-[11px] text-fg-muted">{post.film.year}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!media.length && post.linkPreview ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            {post.linkPreview.image ? (
              <div className="relative aspect-[2/1] bg-sunken">
                <Image
                  src={post.linkPreview.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 85vw, 520px"
                  className="object-cover"
                  unoptimized={shouldLoadRemoteImageUnoptimized(post.linkPreview.image)}
                />
              </div>
            ) : null}
            <div className="px-3 py-2">
              <p className="line-clamp-1 text-[11px] text-fg-muted">{post.linkPreview.domain}</p>
              <p className="line-clamp-2 text-xs font-semibold text-fg">{post.linkPreview.title}</p>
            </div>
          </div>
        ) : null}
      </div>

      {media.length > 0 ? (
        <div
          className={media.length === 1 ? "grid" : "grid grid-cols-2 gap-px bg-border"}
          aria-label="Quoted post media"
        >
          {media.map(function (item, index) {
            return (
              <div
                key={`${item.url}-${index}`}
                className={media.length === 1 ? "relative aspect-video bg-sunken" : "relative aspect-[4/3] bg-sunken"}
              >
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    poster={item.thumbnailUrl}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <Image
                    src={item.variants?.feed ?? item.url}
                    alt={item.altText ?? ""}
                    fill
                    sizes={media.length === 1 ? "(max-width: 640px) 85vw, 520px" : "(max-width: 640px) 42vw, 260px"}
                    className="object-cover"
                    unoptimized={shouldLoadRemoteImageUnoptimized(item.variants?.feed ?? item.url)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
