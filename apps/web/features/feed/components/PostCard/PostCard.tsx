"use client";

import { memo, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isStoredRichText, storedRichTextToPlainText } from "@/lib/utils/richContent";
import { saveScrollPositionForBack } from "../PostPageBackButton";
import { extractVideoPreviews, videoPreviewFromLinkPreview } from "../../utils/videoPreviews";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { fetchPost } from "../../api/postsApi";
import { feedKeys } from "../../hooks/queryKeys";
import type { PostCardProps } from "./types";
import { resolvePostMedia } from "./resolvePostMedia";
import { arePostCardPropsEqual } from "./postCardPropsEqual";
import { PostCardHeader } from "./PostCardHeader";
import { PostCardMoreMenu } from "./PostCardMoreMenu";
import { PostCardBodyText } from "./PostCardBodyText";
import { PostCardAttachments } from "./PostCardAttachments";
import { PostCardActionsBar } from "./PostCardActionsBar";
import { PostCardOverlays } from "./PostCardOverlays";
import { PostCardRepostContext } from "./PostCardRepostContext";
import { PostCardQuoteEmbed } from "./PostCardQuoteEmbed";
import { truncatePostPreview } from "../../utils/truncatePostPreview";
import { suppressLinkPreviewUrl } from "@/lib/utils/linkPreviewPresentation";

function PostCardComponent(props: PostCardProps) {
  const {
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
    editBody,
    filmRef,
    filmCard,
    attachedFilm = null,
    imageSrc,
    imageCaption,
    media,
    mediaUrls,
    viewerMediaUrls,
    prioritizeMedia = false,
    poll,
    saveData = false,
    linkPreview,
    likeCount,
    repostCount,
    liked: initialLiked = false,
    bookmarked: initialBookmarked = false,
    bookmarkFolderId: initialBookmarkFolderId = null,
    reposted: initialReposted = false,
    repostContext,
    quotedPost,
    quotedPostUnavailable = false,
    commentCount,
    replyPreview,
    replyCount,
    animationDelay = 0,
    disableAnimation = false,
    tab: _tab = "following",
    role,
    roleContext,
    filmsLoggedCount,
  } = props;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken, isLoaded: isAuthLoaded, userId: authUserId } = useAuth();
  const pathname = usePathname();
  const currentUserQuery = useCurrentUserProfile();
  const openComposer = useComposerModalStore((state) => state.open);
  const setQuotedPostOnly = useComposerModalStore((state) => state.setQuotedPostOnly);
  const currentUserId = currentUserQuery.data?.userId;
  const hoverPrefetchDoneRef = useRef(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const [muteToast, setMuteToast] = useState<{ handle: string; userId: string } | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const suppressedUrl =
    linkPreview?.presentation === "card_only" ? linkPreview.url : undefined;
  const sourceDisplayText = storedRichTextToPlainText(text);
  const displayText = suppressedUrl
    ? suppressLinkPreviewUrl(sourceDisplayText, suppressedUrl)
    : sourceDisplayText;
  const { cleanedText, previews } = extractVideoPreviews(displayText);
  const renderText = isStoredRichText(text) ? text : cleanedText;
  const resolvedMedia = resolvePostMedia(media, mediaUrls, viewerMediaUrls, imageSrc);
  const isPostDetailView = Boolean(postId && pathname === ROUTES.POST(username, postId));
  const shouldTruncatePreview = Boolean(postId) && !isPostDetailView;
  const stopRichLinkBubble = Boolean(postId && !isPostDetailView);
  const isPostAuthor = Boolean(postId && userId && currentUserId && userId === currentUserId);

  const truncatedText = useMemo(function () {
    return shouldTruncatePreview ? truncatePostPreview(cleanedText) : null;
  }, [cleanedText, shouldTruncatePreview]);
  const isOverflowing = truncatedText !== null;

  const linkPreviewVideo = videoPreviewFromLinkPreview(linkPreview);
  const combinedVideoPreviews = poll
    ? []
    : linkPreviewVideo
    ? [
        linkPreviewVideo,
        ...previews.filter((preview) => preview.url !== linkPreviewVideo.url),
      ]
    : previews;
  const shouldRenderLinkPreviewCard =
    !poll && !resolvedMedia.hasAttachedMedia && Boolean(linkPreview) && !linkPreviewVideo;
  const isShortTextOnlyPost =
    variant === "text" &&
    !resolvedMedia.hasAttachedMedia &&
    !filmCard &&
    !poll &&
    combinedVideoPreviews.length === 0 &&
    !shouldRenderLinkPreviewCard &&
    cleanedText.length > 0 &&
    cleanedText.length < 100;
  const postBodyTextClassName = isShortTextOnlyPost
    ? "text-[22px] leading-[1.5] tracking-[-0.015em] text-fg whitespace-pre-wrap break-words sm:text-[28px] sm:leading-[1.45]"
    : "text-[16px] leading-[1.65] text-fg whitespace-pre-wrap break-words";

  const navigateToPost = () => {
    if (!postId) return;
    saveScrollPositionForBack();
    router.push(ROUTES.POST(username, postId));
  };

  const quotePost = () => {
    if (!postId) return;

    const quotedPost = {
      postId,
      displayName: displayName ?? username,
      handle,
      avatarInitial,
      text: displayText,
      timestamp,
    };

    if (window.matchMedia("(max-width: 767px)").matches) {
      setQuotedPostOnly(quotedPost);
      router.push(ROUTES.NEW_POST);
      return;
    }

    openComposer(quotedPost);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!postId) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    navigateToPost();
  };

  const prefetchPostDetail = () => {
    if (!postId || isPostDetailView || !isAuthLoaded) return;
    if (hoverPrefetchDoneRef.current) return;
    hoverPrefetchDoneRef.current = true;

    void queryClient.prefetchQuery({
      queryKey: feedKeys.postForViewer(postId, authUserId),
      queryFn: async () => fetchPost(postId, await getToken()),
      staleTime: 60_000,
    });

    const firstImageUrl = resolvedMedia.normalizedViewerMediaUrls[0];
    if (typeof window !== "undefined" && firstImageUrl) {
      const image = new window.Image();
      image.decoding = "async";
      image.src = firstImageUrl;
    }
  };

  const authorProps = {
    username,
    displayName,
    avatarUrl,
    avatarInitial,
    avatarBg,
    avatarColor,
    handle,
    role,
    roleContext,
    filmsLoggedCount,
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
      onMouseEnter={prefetchPostDetail}
      onFocus={prefetchPostDetail}
      className={cn(
        "PostCard w-full rounded-lg border-b border-border bg-bg px-4 py-4 transition-colors duration-150",
        !disableAnimation && "animate-fade-up",
        !isPostDetailView && "hover:bg-card-hover",
        postId && !isPostDetailView && "cursor-pointer",
        !disableAnimation && animationDelay && `[animation-delay:${animationDelay}ms]`
      )}
    >
      {repostContext ? (
        <PostCardRepostContext
          context={repostContext}
          viewerUserId={currentUserId ?? authUserId}
          viewerHasReposted={initialReposted}
        />
      ) : null}
      <div className="flex items-start min-w-0">
        <PostCardHeader
          variant={variant}
          timestamp={timestamp}
          {...authorProps}
          menu={
            <PostCardMoreMenu
              isPostAuthor={isPostAuthor}
              hasPoll={Boolean(poll)}
              postId={postId}
              userId={userId}
              isBookmarked={initialBookmarked}
              bookmarkFolderId={initialBookmarkFolderId}
              variant={variant}
              sourcePostType={sourcePostType}
              text={text}
              editBody={editBody}
              headline={headline}
              normalizedMediaUrls={resolvedMedia.normalizedMediaUrls}
              linkPreview={linkPreview}
              attachedFilm={attachedFilm}
              author={authorProps}
              onShare={() => setShowShareModal(true)}
              onDeleteRequest={() => setShowDeleteConfirm(true)}
              onBlockRequest={() => setShowBlockConfirm(true)}
              onReportRequest={() => setShowReportConfirm(true)}
              onMuteRequest={() => setShowMuteConfirm(true)}
            />
          }
        >
          <PostCardBodyText
            variant={variant}
            headline={headline}
            cleanedText={renderText}
            filmRef={filmRef}
            stopRichLinkBubble={stopRichLinkBubble}
            postBodyTextClassName={postBodyTextClassName}
            truncatedText={truncatedText}
            isOverflowing={isOverflowing}
            postId={postId}
            username={username}
            suppressedUrl={suppressedUrl}
          />

          <PostCardAttachments
            variant={variant}
            filmCard={filmCard}
            attachedFilm={attachedFilm}
            hasAttachedMedia={resolvedMedia.hasAttachedMedia}
            combinedVideoPreviews={combinedVideoPreviews}
            shouldRenderLinkPreviewCard={shouldRenderLinkPreviewCard}
            linkPreview={linkPreview}
            videoUrls={resolvedMedia.videoUrls}
            imageUrls={resolvedMedia.imageUrls}
            imageBlurhashes={resolvedMedia.imageBlurhashes}
            imageDimensions={resolvedMedia.imageDimensions}
            prioritizeImages={prioritizeMedia}
            imageCaption={imageCaption}
            poll={poll}
            postId={postId}
            saveData={saveData}
            normalizedViewerMediaUrls={resolvedMedia.normalizedViewerMediaUrls}
            viewerBlurhashes={resolvedMedia.viewerBlurhashes}
            showImageViewer={showImageViewer}
            viewerImageIndex={viewerImageIndex}
            replyPreview={replyPreview}
            replyCount={replyCount}
            stopRichLinkBubble={stopRichLinkBubble}
            onImageClick={(index) => {
              setViewerImageIndex(index);
              setShowImageViewer(true);
            }}
            onCloseImageViewer={() => setShowImageViewer(false)}
            imageViewerFooter={
              <PostCardActionsBar
                postId={postId}
                likeCount={likeCount}
                commentCount={commentCount}
                repostCount={repostCount}
                initialLiked={initialLiked}
                initialBookmarked={initialBookmarked}
                initialBookmarkFolderId={initialBookmarkFolderId}
                initialReposted={initialReposted}
                onCommentClick={postId ? navigateToPost : undefined}
                onQuote={postId ? quotePost : undefined}
              />
            }
          />

          <PostCardQuoteEmbed post={quotedPost} unavailable={quotedPostUnavailable} />

          <PostCardActionsBar
            postId={postId}
            likeCount={likeCount}
            commentCount={commentCount}
            repostCount={repostCount}
            initialLiked={initialLiked}
            initialBookmarked={initialBookmarked}
            initialBookmarkFolderId={initialBookmarkFolderId}
            initialReposted={initialReposted}
            onCommentClick={postId ? navigateToPost : undefined}
            onQuote={postId ? quotePost : undefined}
          />
        </PostCardHeader>
      </div>

      <PostCardOverlays
        username={username}
        handle={handle}
        userId={userId}
        postId={postId}
        headline={headline}
        cleanedText={cleanedText}
        filmCard={filmCard}
        isPostDetailView={isPostDetailView}
        showShareModal={showShareModal}
        showReportConfirm={showReportConfirm}
        showDeleteConfirm={showDeleteConfirm}
        showBlockConfirm={showBlockConfirm}
        showMuteConfirm={showMuteConfirm}
        muteToast={muteToast}
        onCloseShareModal={() => setShowShareModal(false)}
        onCloseReportConfirm={() => setShowReportConfirm(false)}
        onCloseDeleteConfirm={() => setShowDeleteConfirm(false)}
        onCloseBlockConfirm={() => setShowBlockConfirm(false)}
        onCloseMuteConfirm={() => setShowMuteConfirm(false)}
        onMuteSuccess={setMuteToast}
        onClearMuteToast={() => setMuteToast(null)}
      />
    </article>
  );
}

export const PostCard = memo(PostCardComponent, arePostCardPropsEqual);
