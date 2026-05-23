"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import Image from "next/image";
import { FilmCard } from "@/components/FilmCard";
import { PostActions } from "@/components/PostActions/PostActions";
import { ShareModal } from "@/components/ShareModal/ShareModal";
import { ROUTES } from "@/lib/constants/routes";
import { saveScrollPositionForBack } from "./PostPageBackButton";
import { cn } from "@/lib/utils/cn";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { EyeOff, CircleSlash, Flag, MessagesSquare, MoreHorizontal } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { VideoUrlPreview } from "./VideoUrlPreview";
import { extractVideoPreviews } from "../utils/videoPreviews";
import { useLikePost, useRepostPost, useSavePost } from "../hooks/usePostMutations";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { RichPostBodyWithFilmRef, RichPostInline } from "@/lib/utils/richPostText";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";

type PostVariant = "text" | "film-log" | "image" | "discussion";

interface PostCardProps {
  variant: PostVariant;
  username: string;
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
  imageSrc?: string;
  imageCaption?: string;
  likeCount: number;
  liked?: boolean;
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
  username,
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
  imageSrc,
  imageCaption,
  likeCount,
  liked: initialLiked = false,
  commentCount,
  replyPreview,
  replyCount,
  animationDelay = 0,
  disableAnimation = false,
  tab = "following",
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
  const likeMutation = useLikePost(tab);
  const repostMutation = useRepostPost(tab);
  const saveMutation = useSavePost(tab);
  const avatarStyle =
    avatarBg && avatarColor ? { background: avatarBg, color: avatarColor } : undefined;
  const avatarInner =
    avatarUrl != null && avatarUrl !== "" ? (
      <Image
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover"
      />
    ) : (
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-sm",
          !avatarBg && "bg-neutral-300"
        )}
        style={avatarStyle}
      >
        {avatarInitial}
      </div>
    );
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  var [showImageViewer, setShowImageViewer] = useState(false);

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
        "w-full border-b border-border px-4 py-4",
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
                  {
                    id: "share",
                    label: "Share post",
                    description: "Send or copy this post",
                    icon: <Icon name="share-2" className="w-4 h-4" />,
                    onSelect: () => setShowShareModal(true),
                  },
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

            {previews.map((preview) => (
              <VideoUrlPreview key={`${preview.provider}:${preview.id}`} preview={preview} />
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

            {imageSrc && (
              <>
                <button
                  type="button"
                  className="mt-3.5 rounded overflow-hidden relative block w-full text-left cursor-zoom-in"
                  onClick={function (e) {
                    e.stopPropagation();
                    setShowImageViewer(true);
                  }}
                >
                  <Image
                    src={imageSrc}
                    alt={imageCaption || "Post image"}
                    width={600}
                    height={280}
                    unoptimized={shouldLoadRemoteImageUnoptimized(imageSrc)}
                    className={cn(
                      "w-full h-auto block transition-opacity hover:opacity-90",
                      !isPostDetailView && "max-h-[520px] object-contain bg-neutral-100"
                    )}
                  />
                </button>
                {imageCaption && (
                  <p className="text-xs text-fg-muted mt-2 tracking-[0.02em]">
                    {imageCaption}
                  </p>
                )}
                <ImageViewer
                  open={showImageViewer}
                  onClose={function () { setShowImageViewer(false); }}
                  src={imageSrc}
                  alt={imageCaption || "Post image"}
                />
              </>
            )}

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
              initialLiked={initialLiked}
              onCommentClick={postId ? navigateToPost : undefined}
              onLikeToggle={({ isLiked }) => {
                if (!postId) return;
                likeMutation.mutate({ postId, isLiked: !isLiked });
              }}
              onRepostToggle={({ isReposted }) => {
                if (!postId) return;
                if (!isReposted) return;
                repostMutation.mutate({ postId });
              }}
              onSaveToggle={({ isSaved }) => {
                if (!postId) return;
                saveMutation.mutate({ postId, isSaved: !isSaved });
              }}
            />
          </div>
        </div>
      </div>
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
    </article>
  );
}
