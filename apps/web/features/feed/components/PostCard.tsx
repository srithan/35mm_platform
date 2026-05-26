"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { FilmCard } from "@/components/FilmCard";
import { PostActions } from "@/components/PostActions/PostActions";
import { ShareModal } from "@/components/ShareModal/ShareModal";
import { ROUTES } from "@/lib/constants/routes";
import { saveScrollPositionForBack } from "./PostPageBackButton";
import { cn } from "@/lib/utils/cn";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFlashToast } from "@/components/FlashToast";
import { EyeOff, CircleSlash, Flag, MessagesSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { VideoUrlPreview } from "./VideoUrlPreview";
import { extractVideoPreviews, type VideoPreview } from "../utils/videoPreviews";
import { useBookmarkPost, useDeletePost, useLikePost, useRepostPost } from "../hooks/usePostMutations";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { PostImageGallery } from "./PostImageGallery";
import { RichPostBodyWithFilmRef, RichPostInline } from "@/lib/utils/richPostText";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { useBlockUserMutation, useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import { ApiRequestError } from "../api/http";

type PostVariant = "text" | "film-log" | "image" | "discussion";
type SourcePostType = "text" | "discussion" | "log" | "review" | "image";

function extractYouTubeIdFromUrl(raw: string): string | null {
  try {
    var url = new URL(raw);
    var host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      var shortId = url.pathname.slice(1).split("/")[0];
      return shortId || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function extractVimeoIdFromUrl(raw: string): string | null {
  try {
    var url = new URL(raw);
    var host = url.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    var match = url.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function videoPreviewFromLinkPreview(linkPreview: PostCardProps["linkPreview"]): VideoPreview | null {
  if (!linkPreview) return null;
  if (linkPreview.provider === "youtube") {
    var youtubeId = extractYouTubeIdFromUrl(linkPreview.url);
    if (!youtubeId) return null;
    return {
      provider: "youtube",
      id: youtubeId,
      url: linkPreview.url,
      thumbnailUrl:
        linkPreview.image && linkPreview.image.trim().length > 0
          ? linkPreview.image
          : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      label: "YouTube",
    };
  }
  if (linkPreview.provider === "vimeo") {
    var vimeoId = extractVimeoIdFromUrl(linkPreview.url);
    if (!vimeoId) return null;
    return {
      provider: "vimeo",
      id: vimeoId,
      url: linkPreview.url,
      thumbnailUrl:
        linkPreview.image && linkPreview.image.trim().length > 0
          ? linkPreview.image
          : `https://vumbnail.com/${vimeoId}.jpg`,
      label: "Vimeo",
    };
  }
  return null;
}

interface PostCardProps {
  variant: PostVariant;
  sourcePostType?: SourcePostType;
  username: string;
  userId?: string;
  handle: string;
  postId?: string;
  /** Display name for UsernameLink (defaults to username). Use slug as username for links when different. */
  displayName?: string;
  timestamp: string;
  avatarInitial: string;
  /** When set, shown instead of the initial pill (e.g. mock feed portraits). */
  avatarUrl?: string | null;
  avatarBg?: string;
  avatarColor?: string;
  /** Discussion headline (shown above `text` / body). */
  headline?: string;
  text: string;
  filmRef?: string;
  filmCard?: {
    title: string;
    meta: string;
    posterSrc?: string | null;
    imdbId?: string | null;
    rating?: number;
  };
  attachedFilm?: {
    id: string;
    tmdbId?: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    rating: number | null;
  } | null;
  imageSrc?: string;
  imageCaption?: string;
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  likeCount: number;
  liked?: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
  commentCount: number;
  replyPreview?: { username: string; text: string; time: string };
  replyCount?: number;
  animationDelay?: number;
  disableAnimation?: boolean;
  tab?: string;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
}

export function PostCard({
  variant,
  sourcePostType,
  username,
  userId,
  handle,
  postId,
  displayName,
  timestamp,
  avatarInitial,
  avatarUrl,
  avatarBg,
  avatarColor,
  headline,
  text,
  filmRef,
  filmCard,
  attachedFilm = null,
  imageSrc,
  imageCaption,
  mediaUrls,
  linkPreview,
  likeCount,
  liked: initialLiked = false,
  bookmarked: initialBookmarked = false,
  reposted: initialReposted = false,
  commentCount,
  replyPreview,
  replyCount,
  animationDelay = 0,
  disableAnimation = false,
  tab: _tab = "following",
  role,
  roleContext,
  filmsLoggedCount,
}: PostCardProps) {
  var [showShareModal, setShowShareModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { cleanedText, previews } = extractVideoPreviews(text);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [truncatedText, setTruncatedText] = useState<string | null>(null);
  const isPostDetailView = Boolean(postId && pathname === ROUTES.POST(username, postId));
  const shouldClamp = Boolean(postId) && !isPostDetailView;
  const stopRichLinkBubble = Boolean(postId && !isPostDetailView);
  const likeMutation = useLikePost();
  const repostMutation = useRepostPost();
  const bookmarkMutation = useBookmarkPost();
  const deleteMutation = useDeletePost();
  const currentUserQuery = useCurrentUserProfile();
  const currentUserId = currentUserQuery.data?.userId;
  const openComposerForEdit = useComposerModalStore((state) => state.openForEdit);
  const isPostAuthor = Boolean(postId && userId && currentUserId && userId === currentUserId);
  const blockUserMutation = useBlockUserMutation();
  const muteUserMutation = useMuteUserMutation();
  const avatarInner = (
    <Avatar
      initial={avatarInitial}
      src={avatarUrl}
      className="w-10 h-10"
    />
  );
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [muteToast, setMuteToast] = useState<{ handle: string; userId: string } | null>(null);
  const { show: showFlashToast } = useFlashToast();
  var [showImageViewer, setShowImageViewer] = useState(false);
  var [viewerImageIndex, setViewerImageIndex] = useState(0);
  var normalizedMediaUrls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : imageSrc ? [imageSrc] : [];
  var hasAttachedMedia = normalizedMediaUrls.length > 0;
  var videoUrls = normalizedMediaUrls.filter((url) => {
    var lower = url.toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video");
  });
  var imageUrls = normalizedMediaUrls.filter((url) => !videoUrls.includes(url));
  var linkPreviewVideo = videoPreviewFromLinkPreview(linkPreview);
  var combinedVideoPreviews = previews;
  if (linkPreviewVideo) {
    var linkPreviewVideoUrl = linkPreviewVideo.url;
    combinedVideoPreviews = [
      linkPreviewVideo,
      ...previews.filter((preview) => preview.url !== linkPreviewVideoUrl),
    ];
  }
  var shouldRenderLinkPreviewCard = !hasAttachedMedia && Boolean(linkPreview) && !linkPreviewVideo;

  useLayoutEffect(() => {
    if (!shouldClamp) {
      setIsOverflowing(false);
      setTruncatedText(null);
      return;
    }

    const bodyEl = bodyRef.current;
    const measureEl = measureRef.current;
    if (!bodyEl || !measureEl) return;

    const calculateTruncation = () => {
      const width = bodyEl.getBoundingClientRect().width;
      if (width <= 0) return;

      measureEl.style.width = `${width}px`;
      const lineHeight = parseFloat(window.getComputedStyle(bodyEl).lineHeight) || 26.4;
      const maxHeight = lineHeight * 3 + 0.5;

      const fits = (value: string) => {
        measureEl.textContent = value;
        return measureEl.scrollHeight <= maxHeight;
      };

      if (fits(cleanedText)) {
        setIsOverflowing(false);
        setTruncatedText(null);
        return;
      }

      let low = 0;
      let high = cleanedText.length;
      let best = "";

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = cleanedText.slice(0, mid).trimEnd();

        if (fits(`${candidate} more`)) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const lastSpace = best.lastIndexOf(" ");
      const trimmedToWord =
        lastSpace > 24 && best.length - lastSpace < 18
          ? best.slice(0, lastSpace).trimEnd()
          : best;

      setIsOverflowing(true);
      setTruncatedText(trimmedToWord);
    };

    calculateTruncation();
    const observer = new ResizeObserver(calculateTruncation);
    observer.observe(bodyEl);

    return () => observer.disconnect();
  }, [cleanedText, shouldClamp]);

  const navigateToPost = () => {
    if (!postId) return;
    saveScrollPositionForBack();
    router.push(ROUTES.POST(username, postId));
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!postId) return;
    // Don't navigate when clicking links, buttons, or other interactive elements
    if ((e.target as HTMLElement).closest("a, button")) return;
    navigateToPost();
  };

  return (
    <article
      style={{ backgroundColor: "var(--color-bg)" }}
      onClick={isPostDetailView ? undefined : handleCardClick}
      role={postId && !isPostDetailView ? "link" : undefined}
      tabIndex={postId && !isPostDetailView ? 0 : undefined}
      onKeyDown={
        postId && !isPostDetailView
          ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigateToPost();
            }
          }
          : undefined
      }
      className={cn(
        "PostCard w-full rounded-lg border-b border-border px-4 py-4 mb-3",
        !disableAnimation && "animate-fade-up",
        postId && !isPostDetailView && "cursor-pointer hover:bg-hover transition-colors",
        !disableAnimation && animationDelay && `[animation-delay:${animationDelay}ms]`
      )}
    >
      <div className="flex items-start min-w-0">
        <UsernameLink
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          initial={avatarInitial}
          avatarBg={avatarBg}
          avatarColor={avatarColor}
          role={role ?? undefined}
          roleContext={roleContext}
          className="mr-2 flex-shrink-0 self-start no-underline"
        >
          {avatarInner}
        </UsernameLink>
        <div className="flex-1 min-w-0">
          <div className="relative pr-8">
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <UsernameLink
                username={username}
                displayName={displayName}
                avatarUrl={avatarUrl}
                initial={avatarInitial}
                avatarBg={avatarBg}
                avatarColor={avatarColor}
                role={role ?? undefined}
                roleContext={roleContext}
                className="group text-[13.5px] font-bold text-fg no-underline"
              >
                <span className="group-hover:underline underline-offset-2">
                  {displayName ?? username}
                </span>{" "}
                <span className="font-normal text-fg-muted no-underline">
                  {handle}
                </span>
              </UsernameLink>
              <span className="text-xs text-fg-muted ">· {timestamp}</span>
              {variant === "film-log" && (
                <span className="text-[11px] text-fg-muted ml-0.5">
                  logged
                </span>
              )}
              {variant === "discussion" && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 border-l border-border-strong pl-1.5",
                    "text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                  )}
                >
                  <MessagesSquare
                    className="h-3 w-3 shrink-0 text-fg-faint"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  Discussion
                </span>
              )}
            </div>
            <div className="absolute right-0 top-0">
              <PortalDropdown
                align="end"
                sideOffset={6}
                menuLabel="Post actions"
                menuClassName="min-w-[238px] rounded-2xl border-border bg-elevated p-1.5 shadow-[0_20px_56px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.08)]"
                itemLayout="rich"
                showArrow={false}
                items={[
                  ...(isPostAuthor
                    ? [
                        {
                        id: "edit-post",
                        label: "Edit post",
                        description: "Update text, headline, or film",
                        icon: <Icon name="quote" className="w-4 h-4" />,
                        onSelect: () => {
                          if (!postId || !userId) return;
                          openComposerForEdit({
                            postId,
                            userId,
                            type:
                              sourcePostType ??
                              (variant === "film-log"
                                ? "log"
                                : variant === "discussion"
                                  ? "discussion"
                                  : variant === "image"
                                    ? "image"
                                    : "text"),
                            body: text,
                            headline: headline ?? undefined,
                            mediaUrls: normalizedMediaUrls,
                            linkPreview: linkPreview ?? null,
                            film: attachedFilm,
                          });
                        },
                        },
                        {
                          id: "delete-post",
                          label: "Delete post",
                          description: "Remove this post from your profile and feeds",
                          icon: <Trash2 className="w-4 h-4" strokeWidth={1.8} />,
                          danger: true,
                          dividerBefore: true,
                          onSelect: () => setShowDeleteConfirm(true),
                        },
                      ]
                    : []),
                  ...(!isPostAuthor && userId
                    ? [
                        {
                          id: "mute-user",
                          label: `Mute ${handle}`,
                          description: "Hide their posts from your feed",
                          icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                          onSelect: () => {
                            muteUserMutation.mutate(
                              { userId, muted: false },
                              {
                                onSuccess: () => {
                                  setMuteToast({ handle, userId });
                                },
                              }
                            );
                          },
                        },
                        {
                          id: "block-user",
                          label: `Block ${handle}`,
                          description: "Remove and prevent interaction",
                          icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
                          danger: true,
                          onSelect: () => setShowBlockConfirm(true),
                        },
                      ]
                    : []),
                  {
                    id: "share",
                    label: "Share post",
                    description: "Send or copy this post",
                    icon: <Icon name="share-2" className="w-4 h-4" />,
                    onSelect: () => setShowShareModal(true),
                  },
                  ...(!isPostAuthor
                    ? [
                        {
                          id: "hide",
                          label: "Hide post",
                          description: "Remove it from your feed",
                          icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                        },
                        {
                          id: "fewer-like-this",
                          label: "See fewer posts like this",
                          description: "Tune your recommendations",
                          icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
                        },
                        {
                          id: "report",
                          label: "Report post",
                          description: "Flag a safety concern",
                          icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
                          danger: true,
                          dividerBefore: true,
                          onSelect: () => setShowReportConfirm(true),
                        },
                      ]
                    : []),
                ]}
                trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                    onKeyDown={onKeyDown}
                    aria-label="More options"
                    aria-expanded={isOpen}
                    aria-controls={menuId}
                    aria-haspopup="menu"
                    className={cn(
                      "group flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-fg-muted transition-all duration-150",
                      "hover:border-border hover:bg-hover hover:text-fg active:scale-95",
                      isOpen && "border-border bg-sunken text-fg shadow-[inset_0_1px_0_rgb(255_255_255/45%)]"
                    )}
                  >
                    <MoreHorizontal
                      className={cn(
                        "w-4 h-4 transition-transform duration-150",
                        isOpen ? "scale-110" : "group-hover:scale-105"
                      )}
                      strokeWidth={2}
                    />
                  </button>
                )}
              />
            </div>
          </div>

          {role != null && role.trim() !== "" ? (
            <UserRoleHeadline
              role={role.trim()}
              roleContext={roleContext}
              filmsLoggedCount={filmsLoggedCount}
              textClassName="text-[11px]"
            />
          ) : null}

          <div className={cn(role != null && role.trim() !== "" ? "pt-2" : "pt-0")}>
            {headline && headline.length > 0 && (
              <h2
                className={cn(
                  "text-[17px] sm:text-[18px] font-bold text-fg leading-snug tracking-tight",
                  variant === "discussion" ? "mt-2" : "mt-1"
                )}
              >
                <RichPostInline text={headline} stopLinkPropagation={stopRichLinkBubble} />
              </h2>
            )}
            {cleanedText.length > 0 && (
              <div
                className={cn(
                  "relative",
                  !headline
                    ? "mt-1"
                    : variant === "discussion"
                      ? "mt-1"
                      : "mt-2"
                )}
              >
                <div className="relative">
                  {shouldClamp ? (
                    <div
                      ref={measureRef}
                      aria-hidden
                      className="pointer-events-none invisible absolute left-0 top-0 -z-10 whitespace-pre-wrap break-words text-[16px] leading-[1.65] text-fg"
                    />
                  ) : null}
                  <p
                    ref={bodyRef}
                    className={cn(
                      "text-[16px] leading-[1.65] text-fg whitespace-pre-wrap break-words",
                      shouldClamp && "overflow-hidden"
                    )}
                  >
                    <RichPostBodyWithFilmRef
                      text={truncatedText ?? cleanedText}
                      filmRef={filmRef}
                      stopLinkPropagation={stopRichLinkBubble}
                    />
                    {truncatedText != null && isOverflowing ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="inline border-none bg-transparent p-0 font-[inherit] font-medium text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!postId) return;
                            router.push(ROUTES.POST(username, postId));
                          }}
                        >
                          more
                        </button>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            )}

            {!hasAttachedMedia &&
              combinedVideoPreviews.map((preview) => (
                <VideoUrlPreview key={`${preview.provider}:${preview.id}:${preview.url}`} preview={preview} />
              ))}

            {filmCard && (
              <div className="mt-3.5">
                <FilmCard
                  title={filmCard.title}
                  meta={filmCard.meta}
                  posterSrc={filmCard.posterSrc}
                  imdbId={filmCard.imdbId}
                  rating={filmCard.rating}
                />
              </div>
            )}

            {videoUrls[0] ? (
              <div className="mt-3.5 overflow-hidden rounded-lg border border-border bg-black">
                <video src={videoUrls[0]} controls className="w-full h-auto" />
              </div>
            ) : null}

            {imageUrls.length > 0 && (
              <>
                <PostImageGallery
                  urls={imageUrls}
                  imageCaption={imageCaption}
                  onImageClick={function (index) {
                    setViewerImageIndex(index);
                    setShowImageViewer(true);
                  }}
                />
                <ImageViewer
                  open={showImageViewer}
                  onClose={function () {
                    setShowImageViewer(false);
                  }}
                  srcs={imageUrls}
                  initialIndex={viewerImageIndex}
                  alt={imageCaption || "Post image"}
                />
              </>
            )}

            {shouldRenderLinkPreviewCard && linkPreview ? (
              <a
                href={linkPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-xl border border-border bg-sunken p-3 no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                      {linkPreview.domain}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-fg line-clamp-2">{linkPreview.title}</div>
                    {linkPreview.description ? (
                      <div className="mt-1 text-xs text-fg-muted line-clamp-2">
                        {linkPreview.description}
                      </div>
                    ) : null}
                  </div>
                  {linkPreview.image ? (
                    <Image
                      src={linkPreview.image}
                      alt=""
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] rounded-md object-cover"
                      unoptimized={shouldLoadRemoteImageUnoptimized(linkPreview.image)}
                    />
                  ) : null}
                </div>
              </a>
            ) : null}

            {replyPreview && (
              <div className="mt-3 p-3 bg-neutral-100 rounded border-l-2 border-border">
                <div className="text-[12.5px] text-fg-light">
                  <UsernameLink
                    username={replyPreview.username}
                    className="font-bold text-fg cursor-pointer hover:underline"
                  >
                    {replyPreview.username}
                  </UsernameLink>{" "}
                  ·{" "}
                  <span className="text-[11px]">{replyPreview.time}</span>
                  <br />
                  <span className="leading-relaxed block mt-1 whitespace-pre-wrap break-words">
                    <RichPostInline text={replyPreview.text} stopLinkPropagation={stopRichLinkBubble} />
                  </span>
                </div>
              </div>
            )}
            {replyCount !== undefined && replyCount > 0 && (
              <div
                className="text-xs text-fg-muted mt-2 cursor-pointer hover:text-fg transition-colors"
                role="button"
              >
                View {replyCount} more replies →
              </div>
            )}

            <PostActions
              likes={likeCount}
              comments={commentCount}
              hideZeroCounts
              initialLiked={initialLiked}
              initialBookmarked={initialBookmarked}
              initialReposted={initialReposted}
              onCommentClick={postId ? navigateToPost : undefined}
              onLikeToggle={({ isLiked }) => {
                if (!postId) return;
                likeMutation.mutate(
                  { postId, isLiked },
                  {
                    onError: (error) => {
                      var message =
                        error instanceof ApiRequestError
                          ? error.message
                          : "Could not update like";
                      showFlashToast(message, "error");
                    },
                  }
                );
              }}
              onRepostToggle={({ isReposted }) => {
                if (!postId) return;
                repostMutation.mutate(
                  { postId, isReposted },
                  {
                    onError: (error) => {
                      var message =
                        error instanceof ApiRequestError
                          ? error.message
                          : "Could not update repost";
                      showFlashToast(message, "error");
                    },
                  }
                );
              }}
              onBookmarkToggle={({ isBookmarked }) => {
                if (!postId) return;
                bookmarkMutation.mutate(
                  { postId, isBookmarked },
                  {
                    onError: (error) => {
                      var message =
                        error instanceof ApiRequestError
                          ? error.message
                          : "Could not update bookmark";
                      showFlashToast(message, "error");
                    },
                  }
                );
              }}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={() => {
          if (!userId) return;
          blockUserMutation.mutate({ userId, blocked: false });
          setShowBlockConfirm(false);
        }}
        title={`Block ${handle}?`}
        description={`They won't be able to see your profile, posts, or interact with you. You can unblock them anytime in Settings.`}
        confirmLabel="Block"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showReportConfirm}
        onClose={() => setShowReportConfirm(false)}
        onConfirm={() => {
          // TODO: wire to actual report API
          setShowReportConfirm(false);
        }}
        title="Report this post?"
        description="If this post is violating our community guidelines, we'll review it and take appropriate action."
        confirmLabel="Report"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (!postId) return;
          deleteMutation.mutate(
            { postId },
            {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                if (isPostDetailView) {
                  router.replace(ROUTES.PROFILE(username));
                }
              },
            }
          );
        }}
        title="Delete this post?"
        description="This will remove the post from your profile and all feeds."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== "undefined" ? `${window.location.origin}${ROUTES.POST(username, postId || "")}` : ""}
        title={`${username} on 35mm`}
        previewContent={{
          type: "post",
          title: username,
          description: (headline ? headline + " — " : "") + cleanedText.slice(0, 100),
          image: filmCard?.posterSrc || undefined,
        }}
      />
      {muteToast ? (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-3 rounded-full bg-fg px-4 py-2 text-xs font-medium text-bg shadow-lg">
          <span>{muteToast.handle} muted</span>
          <button
            type="button"
            className="border-none bg-transparent p-0 font-semibold text-bg underline underline-offset-2"
            onClick={() => {
              muteUserMutation.mutate(
                { userId: muteToast.userId, muted: true },
                { onSuccess: () => setMuteToast(null) }
              );
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </article>
  );
}
