"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { QuotedPost } from "@/stores/useComposerModalStore";
import type { ComposerMode, FilmResult } from "./types";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { FormattingToolbar } from "./FormattingToolbar";
import { EmojiPicker } from "./EmojiPicker";
import { ImageAttachments } from "./ImageAttachments";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { FilmSearch } from "./FilmSearch";
import { FilmCard } from "./FilmCard";
import { Icon } from "@/components/Icon/Icon";
import { useCreatePost } from "../../hooks/usePostMutations";
import { useUpdatePost } from "../../hooks/usePostMutations";
import { fetchLinkPreview, type CreatePostInput } from "../../api/postsApi";
import type { EditingPost } from "@/stores/useComposerModalStore";
import { resolveOnboardingFilmsFromTmdb } from "@/features/onboarding/api/onboardingApi";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "@/features/profile/api/mediaApi";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { TenorGifPicker } from "@/features/chat/components/TenorGifPicker";

const WRITE_MAX_CHARS = 500;
const DISCUSSION_HEADLINE_MAX_CHARS = 120;
const DISCUSSION_BODY_MAX_CHARS = 3000;
const LOG_MAX_CHARS = 2000;
const REVIEW_THRESHOLD = 200;
const POST_COMPOSER_EMOJI_STYLE = "native" as const;

const YOUTUBE_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;

function extractYouTubeId(text: string): string | null {
  const match = text.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

function posterUrlForFilm(film: FilmResult): string | null {
  if (!film.posterPath) return null;
  if (film.posterPath.startsWith("http")) return film.posterPath;
  return `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${film.posterPath}`;
}

const MODE_TABS: { id: ComposerMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "write",
    label: "Write",
    icon: <Icon name="align-left" className="w-3 h-3" strokeWidth={1.6} />,
  },
  {
    id: "discussion",
    label: "Discussion",
    icon: <Icon name="chat" className="w-3 h-3" strokeWidth={1.6} />,
  },
  {
    id: "log",
    label: "Log / Review",
    icon: <Icon name="clapperboard" className="w-3 h-3" strokeWidth={1.6} />,
  },
];

export type PostComposerHandle = {
  submit: () => void;
};

export interface PostComposerProps {
  variant?: "inline" | "modal" | "fullPage";
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit?: () => void;
  onClose?: () => void;
  quotedPost?: QuotedPost | null;
  /** When `header`, the primary publish control is rendered outside (e.g. nav bar). */
  postPrimaryPlacement?: "toolbar" | "header";
  onPublishStateChange?: (state: { canPost: boolean; label: string }) => void;
  editingPost?: EditingPost | null;
}

export const PostComposer = forwardRef<PostComposerHandle, PostComposerProps>(
  function PostComposer(
    {
      variant = "inline",
      onDirtyChange,
      onSubmit,
      onClose,
      quotedPost,
      postPrimaryPlacement = "toolbar",
      onPublishStateChange,
      editingPost,
    },
    ref
  ) {
  const [mode, setMode] = useState<ComposerMode>("write");
  const [writeText, setWriteText] = useState("");
  const [discussionText, setDiscussionText] = useState("");
  const [discussionHeadline, setDiscussionHeadline] = useState("");
  const [logText, setLogText] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<FilmResult | null>(null);
  const [selectedFilmUlid, setSelectedFilmUlid] = useState<string | null>(null);
  const [isResolvingFilm, setIsResolvingFilm] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [isRewatch, setIsRewatch] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null>(null);
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [postToFeed, setPostToFeed] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const currentDisplayName =
    currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const currentAvatarUrl = currentUser?.avatarUrl ?? clerkUser?.imageUrl ?? null;
  const currentInitial = initialForName(currentDisplayName);

  // Track which input is active to show the correct char limit (for discussion mode)
  const [activeField, setActiveField] = useState<"headline" | "body" | null>(null);

  const writeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const discussionHeadlineRef = useRef<HTMLInputElement>(null);
  const discussionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const logTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const modeTabsPillRef = useRef<HTMLDivElement>(null);
  const modeTabBtnRefs = useRef<
    Partial<Record<ComposerMode, HTMLButtonElement | null>>
  >({});
  const [modeTabIndicator, setModeTabIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const activeText = mode === "discussion" ? discussionText : mode === "log" ? logText : writeText;
  const debouncedActiveText = useDebounce(activeText, 500);

  function extractFirstUrl(value: string): string | null {
    var match = value.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  useEffect(() => {
    var url = extractFirstUrl(debouncedActiveText);
    if (!url) {
      setLinkPreview(null);
      return;
    }
    if (dismissedPreviewUrl && dismissedPreviewUrl === url) return;
    if (linkPreview?.url === url) return;

    void (async () => {
      try {
        var preview = await fetchLinkPreview(url, await getToken());
        setLinkPreview(preview);
      } catch (_err) {
        // Ignore preview lookup failures
      }
    })();
  }, [debouncedActiveText, dismissedPreviewUrl, getToken, linkPreview?.url]);

  const charCountData = useMemo(() => {
    if (mode === "write") return { count: writeText.length, max: WRITE_MAX_CHARS };
    if (mode === "log") return { count: logText.length, max: LOG_MAX_CHARS };

    // Discussion mode depends on which field is active. Defaults to body limit.
    if (activeField === "headline") {
      return { count: discussionHeadline.length, max: DISCUSSION_HEADLINE_MAX_CHARS };
    }
    return { count: discussionText.length, max: DISCUSSION_BODY_MAX_CHARS };
  }, [mode, activeField, writeText, logText, discussionHeadline, discussionText]);

  const charCountRemaining = charCountData.max - charCountData.count;

  const isReview = logText.length > REVIEW_THRESHOLD;
  const showLogFormatBar = logText.length > REVIEW_THRESHOLD;

  const canPost = useMemo(() => {
    if (editingPost) {
      if (mode === "discussion") {
        return (
          discussionHeadline.trim().length > 0 &&
          discussionHeadline.length <= DISCUSSION_HEADLINE_MAX_CHARS &&
          discussionText.length <= DISCUSSION_BODY_MAX_CHARS
        );
      }
      if (mode === "log") {
        return (
          selectedFilm !== null &&
          selectedFilmUlid !== null &&
          !isResolvingFilm &&
          logText.length <= LOG_MAX_CHARS
        );
      }
      return (
        (writeText.trim().length > 0 || images.length > 0 || videoFile !== null || gifUrl !== null) &&
        writeText.length <= WRITE_MAX_CHARS
      );
    }

    if (mode === "write") {
      return (
        (writeText.trim().length > 0 || images.length > 0 || videoFile !== null || gifUrl !== null) &&
        writeText.length <= WRITE_MAX_CHARS
      );
    }
    if (mode === "discussion") {
      return (
        discussionHeadline.trim().length > 0 &&
        discussionHeadline.length <= DISCUSSION_HEADLINE_MAX_CHARS &&
        discussionText.length <= DISCUSSION_BODY_MAX_CHARS
      );
    }
    return (
      selectedFilm !== null &&
      selectedFilmUlid !== null &&
      !isResolvingFilm &&
      logText.length <= LOG_MAX_CHARS
    );
  }, [
    editingPost,
    mode,
    writeText,
    images.length,
    videoFile,
    gifUrl,
    discussionHeadline,
    discussionText,
    logText,
    selectedFilm,
    selectedFilmUlid,
    isResolvingFilm,
  ]);

  const postButtonLabel = useMemo(() => {
    if (editingPost) return "Save";
    if (mode === "discussion") return "Post";
    if (mode === "log") return isReview ? "Review" : "Log";
    return "Post";
  }, [editingPost, mode, isReview]);

  const isDirty = useMemo(
    () =>
      writeText.trim().length > 0 ||
      discussionText.trim().length > 0 ||
      discussionHeadline.trim().length > 0 ||
      logText.trim().length > 0 ||
      selectedFilm !== null ||
      images.length > 0 ||
      videoFile !== null ||
      gifUrl !== null ||
      youtubeVideoId !== null,
    [
      writeText,
      discussionText,
      discussionHeadline,
      logText,
      selectedFilm,
      images.length,
      videoFile,
      gifUrl,
      youtubeVideoId,
    ]
  );

  useEffect(() => {
    if (!editingPost) return;

    if (editingPost.type === "discussion") {
      setMode("discussion");
      setDiscussionHeadline(editingPost.headline ?? "");
      setDiscussionText(editingPost.body ?? "");
      setActiveField("headline");
    } else if (editingPost.type === "log" || editingPost.type === "review") {
      setMode("log");
      setLogText(editingPost.body ?? "");
      if (editingPost.film) {
        setSelectedFilm({
          id: editingPost.film.tmdbId ?? 0,
          title: editingPost.film.title,
          year: editingPost.film.year ? String(editingPost.film.year) : "",
          language: "",
          genres: editingPost.film.genres ?? [],
          posterPath: editingPost.film.posterUrl,
        });
        setSelectedFilmUlid(editingPost.film.id);
        setStarRating(editingPost.film.rating ?? 0);
      }
      setActiveField("body");
    } else {
      setMode("write");
      setWriteText(editingPost.body ?? "");
      setActiveField("body");
    }
  }, [editingPost]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPublishStateChange?.({ canPost: canPost, label: postButtonLabel });
  }, [canPost, postButtonLabel, onPublishStateChange]);

  const isModal = variant === "modal";
  const isFullPage = variant === "fullPage";
  const postInToolbar = postPrimaryPlacement === "toolbar";
  const fixedMobileToolbar =
    isFullPage && postPrimaryPlacement === "header";

  function focusWriteTextarea() {
    var ta = writeTextareaRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    var len = ta.value.length;
    ta.setSelectionRange(len, len);
  }

  /** Mobile /new: focus in the same frame as paint so iOS keeps keyboard permission after client nav. */
  useLayoutEffect(
    function () {
      if (!fixedMobileToolbar) return;
      if (mode === "write") {
        setActiveField("body");
        focusWriteTextarea();
        var t0 = window.setTimeout(focusWriteTextarea, 0);
        var t1 = window.setTimeout(focusWriteTextarea, 32);
        return function () {
          window.clearTimeout(t0);
          window.clearTimeout(t1);
        };
      }
      if (mode === "discussion") {
        discussionHeadlineRef.current?.focus({ preventScroll: true });
        setActiveField("headline");
      }
      if (mode === "log") {
        setActiveField("body");
      }
    },
    [mode, fixedMobileToolbar]
  );

  /** Pill highlight position — layout-driven (not ref callbacks) so it matches modal and avoids opacity/transition fighting React re-renders. */
  useLayoutEffect(
    function () {
      function measure() {
        var pill = modeTabsPillRef.current;
        var btn = modeTabBtnRefs.current[mode];
        if (!pill || !btn) return;
        var pr = pill.getBoundingClientRect();
        var br = btn.getBoundingClientRect();
        var left = br.left - pr.left + pill.scrollLeft;
        var width = br.width;
        setModeTabIndicator(function (prev) {
          if (
            prev &&
            Math.abs(prev.left - left) < 0.5 &&
            Math.abs(prev.width - width) < 0.5
          ) {
            return prev;
          }
          return { left: left, width: width };
        });
      }
      measure();
      var pillEl = modeTabsPillRef.current;
      if (!pillEl || typeof ResizeObserver === "undefined") {
        return undefined;
      }
      var ro = new ResizeObserver(function () {
        measure();
      });
      ro.observe(pillEl);
      return function () {
        ro.disconnect();
      };
    },
    [mode]
  );

  useEffect(
    function () {
      if (fixedMobileToolbar) return;
      var delay = isFullPage ? 160 : 50;
      var focusTimer = window.setTimeout(function () {
        if (mode === "write") {
          focusWriteTextarea();
          setActiveField("body");
        } else if (mode === "discussion") {
          discussionHeadlineRef.current?.focus({ preventScroll: true });
          setActiveField("headline");
        } else if (mode === "log") {
          setActiveField("body");
        }
      }, delay);

      return function () {
        window.clearTimeout(focusTimer);
      };
    },
    [mode, isFullPage, fixedMobileToolbar]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent, targetMode: ComposerMode) => {
      const pasted = e.clipboardData.getData("text/plain");
      const vid = extractYouTubeId(pasted);
      if (vid && (targetMode === "write" || targetMode === "discussion")) {
        e.preventDefault();
        setYoutubeVideoId(vid);
        setYoutubeTitle("YouTube video");
      }
    },
    []
  );

  const insertEmojiInto = useCallback(
    (emoji: string, value: string, setter: (v: string) => void, ref: React.RefObject<HTMLTextAreaElement | null>) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);
      setter(before + emoji + after);
      setTimeout(() => {
        const pos = start + emoji.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      }, 0);
    },
    []
  );

  const handleEmojiInsertFixed = useCallback(
    (emoji: string) => {
      if (mode === "write") {
        insertEmojiInto(emoji, writeText, setWriteText, writeTextareaRef);
      } else if (mode === "discussion") {
        // If headline is focused, we typically don't allow emoji insert via toolbar 
        // because it uses a textarea ref. But if we need to, we'd need an input ref handling.
        // Default to body for discussion mode.
        insertEmojiInto(emoji, discussionText, setDiscussionText, discussionTextareaRef);
      } else {
        insertEmojiInto(emoji, logText, setLogText, logTextareaRef);
      }
      setShowEmojiPicker(false);
    },
    [mode, writeText, discussionText, logText, insertEmojiInto]
  );

  const resolveFilmUlid = useCallback(
    async function (film: FilmResult): Promise<string> {
      const ids = await resolveOnboardingFilmsFromTmdb(
        [
          {
            tmdbId: film.id,
            title: film.title,
            year: Number.parseInt(film.year, 10) || null,
            posterUrl: posterUrlForFilm(film),
            genres: film.genres,
          },
        ],
        await getToken()
      );
      const resolvedId = ids[0];
      if (!resolvedId) {
        throw new Error("Unable to resolve film");
      }
      return resolvedId;
    },
    [getToken]
  );

  const handleFilmSelect = useCallback(
    (film: FilmResult) => {
      setSelectedFilm(film);
      setSelectedFilmUlid(null);
      setSubmitError(null);
      setIsResolvingFilm(true);
      void (async function () {
        try {
          const resolvedId = await resolveFilmUlid(film);
          setSelectedFilmUlid(resolvedId);
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : "Failed to attach film");
        } finally {
          setIsResolvingFilm(false);
        }
      })();
    },
    [resolveFilmUlid]
  );

  const handleClearFilm = useCallback(() => {
    setSelectedFilm(null);
    setSelectedFilmUlid(null);
    setIsResolvingFilm(false);
    setStarRating(0);
    setLogText("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || createPostMutation.isPending || updatePostMutation.isPending) return;
    setSubmitError(null);

    async function uploadPostMedia(file: File): Promise<string> {
      var token = await getToken();
      var presign = await presignProfileMediaUpload(
        {
          kind: "post_media",
          contentType: file.type || "application/octet-stream",
          contentLength: file.size,
        },
        token
      );

      await uploadToPresignedUrl({
        uploadUrl: presign.uploadUrl,
        contentType: presign.contentType,
        blob: file,
      });

      return presign.publicUrl;
    }

    let input: CreatePostInput;
    var mediaUrls: string[] = [];
    if (mode !== "log") {
      if (images.length > 0) {
        var imageFiles = images.slice(0, 9);
        mediaUrls = await Promise.all(imageFiles.map(uploadPostMedia));
      } else if (videoFile) {
        mediaUrls = [await uploadPostMedia(videoFile)];
      } else if (gifUrl) {
        mediaUrls = [gifUrl];
      }
    }
    if (mode === "discussion") {
      input = {
        type: "discussion",
        headline: discussionHeadline.trim(),
        body: discussionText.trim() || discussionHeadline.trim(),
        mediaUrls,
        linkPreview,
      };
    } else if (mode === "log" && selectedFilm) {
      let resolvedFilmId = selectedFilmUlid;
      if (!resolvedFilmId) {
        setIsResolvingFilm(true);
        try {
          resolvedFilmId = await resolveFilmUlid(selectedFilm);
          setSelectedFilmUlid(resolvedFilmId);
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : "Failed to attach film");
          return;
        } finally {
          setIsResolvingFilm(false);
        }
      }
      if (!resolvedFilmId) {
        setSubmitError("Failed to attach film");
        return;
      }
      input = {
        type: isReview ? "review" : "log",
        body: logText.trim() || `Logged ${selectedFilm.title}`,
        film: {
          id: resolvedFilmId,
          tmdbId: selectedFilm.id,
          title: selectedFilm.title,
          year: Number.parseInt(selectedFilm.year, 10) || null,
          posterUrl: posterUrlForFilm(selectedFilm),
          genres: selectedFilm.genres,
          rating: starRating > 0 ? starRating : null,
        },
      };
    } else {
      input = {
        type: images.length > 0 || videoFile !== null || gifUrl !== null ? "image" : "text",
        body: writeText.trim(),
        mediaUrls,
        linkPreview,
      };
    }

    try {
      if (editingPost) {
        await updatePostMutation.mutateAsync({
          postId: editingPost.postId,
          body: input.body,
          headline: input.headline ?? null,
          filmId: input.film?.id ?? null,
        });
      } else {
        await createPostMutation.mutateAsync(input);
      }
      await onSubmit?.();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : editingPost
            ? "Failed to update post"
            : "Failed to publish post"
      );
      return;
    }

    // Successful publish should clear draft content across modes.
    setWriteText("");
    setDiscussionHeadline("");
    setDiscussionText("");
    setLogText("");
    setSelectedFilm(null);
    setSelectedFilmUlid(null);
    setIsResolvingFilm(false);
    setStarRating(0);
    setIsRewatch(false);
    setImages([]);
    setVideoFile(null);
    setGifUrl(null);
    setYoutubeVideoId(null);
    setYoutubeTitle(null);
    setLinkPreview(null);
    setDismissedPreviewUrl(null);
    setShowDropZone(false);
    setShowEmojiPicker(false);
    setPostToFeed(true);
  }, [
    canPost,
    createPostMutation,
    editingPost,
    discussionHeadline,
    discussionText,
    images.length,
    videoFile,
    gifUrl,
    isReview,
    logText,
    mode,
    onSubmit,
    resolveFilmUlid,
    selectedFilm,
    selectedFilmUlid,
    starRating,
    updatePostMutation,
    writeText,
    linkPreview,
    getToken,
  ]);

  useImperativeHandle(
    ref,
    function () {
      return {
        submit: function () {
          handleSubmit();
        },
      };
    },
    [handleSubmit]
  );

  function allowMobileComposeBlur(relatedTarget: EventTarget | null): boolean {
    if (relatedTarget == null) return false;
    if (!(relatedTarget instanceof Node)) return false;
    if (typeof document === "undefined") return false;
    var header = document.querySelector("[data-new-post-header]");
    if (header && header.contains(relatedTarget)) return true;
    var discard = document.querySelector("[data-new-post-discard]");
    if (discard && discard.contains(relatedTarget)) return true;
    if (relatedTarget instanceof Element) {
      if (relatedTarget.closest("[data-emoji-panel], .EmojiPickerReact")) return true;
    }
    if (composerRef.current && composerRef.current.contains(relatedTarget)) return true;
    return false;
  }

  function refocusMobileField(
    fieldRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>
  ) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        fieldRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function onPointerDownCaptureMobile(e: React.PointerEvent<HTMLDivElement>) {
    if (!fixedMobileToolbar) return;
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("textarea, input, select")) return;
    if (t.closest("[data-new-post-header]")) return;
    if (t.closest("[data-new-post-discard]")) return;
    if (t.closest("[data-emoji-panel], .EmojiPickerReact")) return;
    if (t.closest('button, a[href], [role="button"]')) {
      e.preventDefault();
    }
  }

  function renderFormattingToolbarRow() {
    return (
      <div
        className={cn(
          "flex w-full flex-shrink-0 items-center justify-between gap-2 border-t",
          isFullPage
            ? cn(
                "border-[var(--color-border)] bg-bg py-2 pl-[calc(52px+env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
                fixedMobileToolbar && "bg-bg/95 shadow-[0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-bg/80"
              )
            : "border-border bg-elevated px-4 py-2.5 pl-[52px]"
        )}
      >
        <div className="flex items-center gap-0.5 relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
          {mode !== "log" && (
            <>
              <button
                type="button"
                onClick={() => setShowDropZone((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  fixedMobileToolbar
                    ? cn(
                        "text-accent hover:bg-accent/[0.12]",
                        showDropZone && "bg-accent/15"
                      )
                    : cn(
                        "text-fg-muted hover:bg-hover hover:text-fg",
                        showDropZone && "bg-red-50 text-accent"
                      )
                )}
                title="Add images"
              >
                <Icon name="image" className="h-[20px] w-[20px]" strokeWidth={fixedMobileToolbar ? 1.85 : 2} />
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  fixedMobileToolbar
                    ? "text-accent hover:bg-accent/[0.12]"
                    : "text-fg-muted hover:bg-hover hover:text-fg"
                )}
                title="Add video"
              >
                <Icon name="play" className="h-[19px] w-[19px]" strokeWidth={2} />
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  var file = e.target.files?.[0] ?? null;
                  if (!file) return;
                  setVideoFile(file);
                  setImages([]);
                  setGifUrl(null);
                  setShowDropZone(false);
                  e.target.value = "";
                }}
              />
              <button
                ref={gifBtnRef}
                type="button"
                onClick={() => setShowGifPicker((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  fixedMobileToolbar
                    ? "text-accent hover:bg-accent/[0.12]"
                    : "text-fg-muted hover:bg-hover hover:text-fg"
                )}
                title="Add GIF"
              >
                <span className="text-[11px] font-bold">GIF</span>
              </button>
              <button
                ref={emojiBtnRef}
                type="button"
                onClick={() => setShowEmojiPicker((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  fixedMobileToolbar
                    ? "text-accent hover:bg-accent/[0.12]"
                    : "text-fg-muted hover:bg-hover hover:text-fg"
                )}
                title="Emoji"
              >
                <Icon name="smile" className="h-[20px] w-[20px]" strokeWidth={fixedMobileToolbar ? 1.85 : 2} />
              </button>

              {mode === "write" && (
                <FormattingToolbar
                  textareaRef={writeTextareaRef}
                  value={writeText}
                  onChange={setWriteText}
                  showDivider={true}
                  composeChrome={fixedMobileToolbar}
                />
              )}
              {mode === "discussion" && (
                <FormattingToolbar
                  textareaRef={discussionTextareaRef}
                  value={discussionText}
                  onChange={setDiscussionText}
                  showDivider={true}
                  composeChrome={fixedMobileToolbar}
                />
              )}
            </>
          )}

          {mode === "log" && (
            <span className="text-[12px] font-medium text-fg-muted pl-1">
              Search film above
            </span>
          )}

          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onInsert={handleEmojiInsertFixed}
            anchorRef={emojiBtnRef}
            emojiStyle={POST_COMPOSER_EMOJI_STYLE}
          />
          <TenorGifPicker
            isOpen={showGifPicker}
            onClose={() => setShowGifPicker(false)}
            onSelect={(url) => {
              setGifUrl(url);
              setImages([]);
              setVideoFile(null);
              setShowDropZone(false);
            }}
            anchorRef={gifBtnRef}
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {mode !== "log" && (
            <span
              className={cn(
                "tabular-nums font-medium transition-colors",
                fixedMobileToolbar ? "text-[14px] text-fg-muted" : "text-[13px] text-fg-muted",
                charCountRemaining < 0
                  ? "font-semibold text-film-red"
                  : charCountRemaining < 50
                    ? "text-film-gold"
                    : ""
              )}
            >
              {charCountRemaining}
            </span>
          )}

          {mode === "log" && (
            <label className="group flex items-center gap-2 mr-3 cursor-pointer select-none">
              <div
                className={cn(
                  "relative flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border transition-all duration-200 overflow-hidden shadow-sm",
                  postToFeed
                    ? "border-transparent bg-fg"
                    : "border-fg/20 bg-elevated group-hover:border-fg/40 group-hover:bg-hover"
                )}
              >
                <input
                  type="checkbox"
                  checked={postToFeed}
                  onChange={(e) => setPostToFeed(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className={cn(
                    "flex items-center justify-center transition-transform duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    postToFeed ? "scale-100" : "scale-0"
                  )}
                >
                  <Icon name="check" className="w-[11px] h-[11px] text-bg" strokeWidth={4} />
                </div>
              </div>
              <span className={cn(
                "text-[12px] transition-colors duration-200 mt-[1px]",
                postToFeed ? "text-fg font-medium" : "text-fg-muted group-hover:text-fg/80"
              )}>Post to feed</span>
            </label>
          )}

          {postInToolbar && (
            <button
              type="button"
              data-composer-primary-action
              disabled={!canPost || createPostMutation.isPending || updatePostMutation.isPending}
              onClick={handleSubmit}
              className={cn(
                "text-[13px] font-medium px-5 py-1.5 rounded-full transition-all active:scale-[0.97]",
                !canPost || createPostMutation.isPending || updatePostMutation.isPending
                  ? "bg-sunken-2 text-fg-faint cursor-not-allowed"
                  : "bg-fg text-bg hover:opacity-90 shadow-sm"
              )}
            >
              {createPostMutation.isPending || updatePostMutation.isPending
                ? (editingPost ? "Saving" : "Posting")
                : postButtonLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={composerRef}
      tabIndex={isFullPage ? undefined : -1}
      onPointerDownCapture={onPointerDownCaptureMobile}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!composerRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className={cn(
        "transition-shadow duration-200",
        isFullPage &&
          "flex flex-col flex-1 min-h-0 overflow-hidden bg-bg rounded-none border-0 shadow-none",
        !isModal && !isFullPage && "bg-elevated rounded-2xl border border-border",
        !isModal &&
          !isFullPage &&
          (isFocused
            ? "shadow-[0_4px_24px_rgba(0,0,0,0.08)] ring-1 ring-border"
            : "shadow-sm hover:shadow-md"),
        isModal && "bg-elevated"
      )}
    >
      {/* Mode tabs */}
      <div
        className={cn(
          "flex w-full min-w-0 flex-shrink-0 items-center",
          fixedMobileToolbar
            ? "border-b border-[var(--color-border)] px-3 py-2.5"
            : isModal
              ? "px-4 pb-2 pt-4 justify-between"
              : isFullPage
                ? "border-b border-[var(--color-border)] px-3 pb-2 pt-2"
                : "px-4 pb-2 pt-4"
        )}
      >
        <div
          className={cn(
            "min-w-0",
            fixedMobileToolbar
              ? "flex w-full justify-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
              : isFullPage &&
                  "flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
          )}
        >
        <div
          ref={modeTabsPillRef}
          className="relative inline-flex w-max max-w-full rounded-full border border-border bg-sunken p-1.5"
        >
          <div
            className="pointer-events-none absolute z-0 rounded-full border border-border bg-elevated shadow-sm transition-[left,width] duration-200 ease-out top-1.5 bottom-1.5"
            style={
              modeTabIndicator
                ? {
                    left: modeTabIndicator.left,
                    width: modeTabIndicator.width,
                    opacity: 1,
                  }
                : { left: 0, width: 0, opacity: 0 }
            }
            aria-hidden
          />

          <div className="relative z-10 flex items-center gap-1.5">
            {MODE_TABS.map((tab) => {
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  ref={function (el) {
                    modeTabBtnRefs.current[tab.id] = el;
                  }}
                  onClick={() => setMode(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-4 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "text-fg font-semibold"
                      : "text-fg-muted hover:bg-hover hover:text-fg"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sunken hover:bg-hover flex items-center justify-center text-fg-muted hover:text-fg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <Icon name="x" className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <div
        className={cn(
          isFullPage &&
            "overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          fixedMobileToolbar
            ? "max-h-[calc(100dvh-11.5rem-52px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full flex-none"
            : isFullPage && "min-h-0 flex-1"
        )}
      >
        <div
          className={cn(
            "flex gap-0",
            fixedMobileToolbar ? "px-3 pb-3 pt-2" : isFullPage ? "px-3 pb-4 pt-3" : "px-4 pb-4 pt-5"
          )}
        >
        {/* Avatar */}
        <div className="pl-0 pr-3 flex-shrink-0 self-start">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-sm text-white/90"
            style={{
              background: "linear-gradient(to bottom right, #1c1c1c, #0f0f0f)",
            }}
          >
            {currentAvatarUrl ? (
              <Image
                src={currentAvatarUrl}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover rounded-full"
                priority
              />
            ) : (
              currentInitial
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className={cn(
            "flex-1 min-w-0 pl-0 pr-0 pb-0",
            isModal && !isFullPage && "overflow-y-auto"
          )}
        >
          {/* Write mode */}
          {mode === "write" && (
            <div className="space-y-2">
              {fixedMobileToolbar && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/40 px-2.5 py-0.5 text-[13px] font-semibold text-accent">
                    Everyone
                    <Icon name="chevron-down" className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.5} />
                  </span>
                </div>
              )}
              <div className={cn("relative", isFullPage ? "min-h-0" : "min-h-[140px]")}>
                <textarea
                  ref={writeTextareaRef}
                  value={writeText}
                  onChange={function (e) {
                    setWriteText(e.target.value);
                    if (isFullPage && !fixedMobileToolbar) {
                      var el = e.target;
                      el.style.height = "auto";
                      var cap =
                        typeof window !== "undefined"
                          ? Math.round(window.innerHeight * 0.3)
                          : 220;
                      el.style.height = Math.min(el.scrollHeight, cap) + "px";
                    }
                  }}
                  onBlur={function (e) {
                    if (!fixedMobileToolbar || mode !== "write") return;
                    if (allowMobileComposeBlur(e.relatedTarget)) return;
                    refocusMobileField(writeTextareaRef);
                  }}
                  onFocus={() => setActiveField("body")}
                  onPaste={(e) => handlePaste(e, "write")}
                  placeholder={
                    fixedMobileToolbar
                      ? "What's happening?"
                      : "What's on your mind about cinema?"
                  }
                  enterKeyHint="send"
                  autoFocus={fixedMobileToolbar && mode === "write"}
                  rows={isFullPage ? (fixedMobileToolbar ? 1 : 2) : undefined}
                  className={cn(
                    "w-full resize-none border-none outline-none bg-transparent placeholder:text-fg-muted placeholder:font-normal text-fg",
                    isFullPage
                      ? fixedMobileToolbar
                        ? "h-[6.75rem] min-h-[6.75rem] max-h-[6.75rem] resize-none text-[20px] font-normal leading-[1.35] tracking-[-0.02em] [-webkit-tap-highlight-color:transparent] overflow-y-auto"
                        : "min-h-[3.25rem] text-[20px] font-normal leading-[1.45] tracking-[-0.015em] [-webkit-tap-highlight-color:transparent] overflow-y-auto"
                      : isModal
                        ? "text-[19px] font-semibold leading-relaxed min-h-[170px]"
                        : "text-[19px] font-semibold leading-relaxed min-h-[140px]"
                  )}
                  style={{ caretColor: "var(--accent)" }}
                />
              </div>
              {fixedMobileToolbar && (
                <div className="flex items-center gap-2 pt-0.5 text-[13px] font-medium text-accent">
                  <Icon name="globe" className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span>Everyone can reply</span>
                </div>
              )}
              {(showDropZone || images.length > 0) && (
                <ImageAttachments
                  images={images}
                  onImagesChange={(files) => {
                    setImages(files.slice(0, 9));
                    if (files.length > 0) {
                      setVideoFile(null);
                      setGifUrl(null);
                    }
                  }}
                  showDropZone={showDropZone}
                  onDropZoneToggle={setShowDropZone}
                />
              )}
              {videoFile ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <video
                    src={URL.createObjectURL(videoFile)}
                    controls
                    className="w-full rounded-md"
                  />
                  <button
                    type="button"
                    className="mt-2 text-xs text-fg-muted hover:text-fg"
                    onClick={() => setVideoFile(null)}
                  >
                    Remove video
                  </button>
                </div>
              ) : null}
              {gifUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gifUrl} alt="Selected GIF" className="w-full rounded-md object-cover" />
                  <button
                    type="button"
                    className="mt-2 text-xs text-fg-muted hover:text-fg"
                    onClick={() => setGifUrl(null)}
                  >
                    Remove GIF
                  </button>
                </div>
              ) : null}
              {linkPreview ? (
                <div className="mt-2 rounded-xl border border-border bg-sunken p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
                        {linkPreview.domain}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-fg line-clamp-2">{linkPreview.title}</div>
                      {linkPreview.description ? (
                        <div className="mt-1 text-xs text-fg-muted line-clamp-2">{linkPreview.description}</div>
                      ) : null}
                    </div>
                    {linkPreview.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={linkPreview.image} alt="" className="h-14 w-14 rounded-md object-cover" />
                    ) : null}
                    <button
                      type="button"
                      className="text-fg-muted hover:text-fg"
                      onClick={() => {
                        setDismissedPreviewUrl(linkPreview.url);
                        setLinkPreview(null);
                      }}
                    >
                      <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : null}
              {youtubeVideoId && (
                <YouTubeEmbed
                  videoId={youtubeVideoId}
                  title={youtubeTitle}
                  onRemove={() => {
                    setYoutubeVideoId(null);
                    setYoutubeTitle(null);
                  }}
                />
              )}
            </div>
          )}

          {/* Discussion mode */}
          {mode === "discussion" && (
            <div className="space-y-2">
              <div className="relative min-h-[28px]">
                <input
                  ref={discussionHeadlineRef}
                  type="text"
                  value={discussionHeadline}
                  onChange={(e) => setDiscussionHeadline(e.target.value)}
                  onBlur={function (e) {
                    if (!fixedMobileToolbar || mode !== "discussion") return;
                    if (allowMobileComposeBlur(e.relatedTarget)) return;
                    refocusMobileField(discussionHeadlineRef);
                  }}
                  onFocus={() => setActiveField("headline")}
                  placeholder="What's your question or take?"
                  className="w-full text-[19px] font-semibold text-fg bg-transparent border-none outline-none placeholder:text-fg-muted placeholder:font-normal absolute inset-0"
                />
              </div>
              <div className={cn("relative", isFullPage ? "min-h-[3rem]" : "min-h-[140px]")}>
                <textarea
                  ref={discussionTextareaRef}
                  value={discussionText}
                  onChange={(e) => setDiscussionText(e.target.value)}
                  onBlur={function (e) {
                    if (!fixedMobileToolbar || mode !== "discussion") return;
                    if (allowMobileComposeBlur(e.relatedTarget)) return;
                    refocusMobileField(discussionTextareaRef);
                  }}
                  onFocus={() => setActiveField("body")}
                  onPaste={(e) => handlePaste(e, "discussion")}
                  placeholder="Add more context… (optional)"
                  className={cn(
                    "w-full resize-none border-none outline-none bg-transparent placeholder:text-fg-muted mt-2 text-fg",
                    isFullPage
                      ? "min-h-[3rem] text-[17px] font-normal leading-relaxed"
                      : "text-[16px] font-light leading-relaxed min-h-[140px]"
                  )}
                  style={{ caretColor: "var(--accent)" }}
                />
              </div>
              {(showDropZone || images.length > 0) && (
                <ImageAttachments
                  images={images}
                  onImagesChange={(files) => {
                    setImages(files.slice(0, 9));
                    if (files.length > 0) {
                      setVideoFile(null);
                      setGifUrl(null);
                    }
                  }}
                  showDropZone={showDropZone}
                  onDropZoneToggle={setShowDropZone}
                />
              )}
              {videoFile ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <video src={URL.createObjectURL(videoFile)} controls className="w-full rounded-md" />
                </div>
              ) : null}
              {gifUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gifUrl} alt="Selected GIF" className="w-full rounded-md object-cover" />
                </div>
              ) : null}
              {linkPreview ? (
                <div className="mt-2 rounded-xl border border-border bg-sunken p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
                        {linkPreview.domain}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-fg line-clamp-2">{linkPreview.title}</div>
                      {linkPreview.description ? (
                        <div className="mt-1 text-xs text-fg-muted line-clamp-2">{linkPreview.description}</div>
                      ) : null}
                    </div>
                    {linkPreview.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={linkPreview.image} alt="" className="h-14 w-14 rounded-md object-cover" />
                    ) : null}
                    <button
                      type="button"
                      className="text-fg-muted hover:text-fg"
                      onClick={() => {
                        setDismissedPreviewUrl(linkPreview.url);
                        setLinkPreview(null);
                      }}
                    >
                      <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : null}
              {youtubeVideoId && (
                <YouTubeEmbed
                  videoId={youtubeVideoId}
                  title={youtubeTitle}
                  onRemove={() => {
                    setYoutubeVideoId(null);
                    setYoutubeTitle(null);
                  }}
                />
              )}
            </div>
          )}

          {/* Log / Review mode */}
          {mode === "log" && (
            <div className="space-y-2">
              <FilmSearch
                onSelect={handleFilmSelect}
                isHidden={selectedFilm !== null}
                autoFocus={mode === "log"}
              />
              {selectedFilm && (
                <FilmCard
                  film={selectedFilm}
                  starRating={starRating}
                  isRewatch={isRewatch}
                  onStarChange={setStarRating}
                  onRewatchChange={setIsRewatch}
                  onClear={handleClearFilm}
                />
              )}
              {selectedFilm && isResolvingFilm ? (
                <p className="text-[12px] text-fg-muted">Resolving film…</p>
              ) : null}
              {selectedFilm && (
                <div className="space-y-2">
                  {showLogFormatBar && (
                    <div className="flex items-center gap-1 -ml-1">
                      <FormattingToolbar
                        textareaRef={logTextareaRef}
                        value={logText}
                        onChange={setLogText}
                        showDivider={false}
                      />
                    </div>
                  )}
                  <textarea
                    ref={logTextareaRef}
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    onBlur={function (e) {
                      if (!fixedMobileToolbar || mode !== "log") return;
                      if (allowMobileComposeBlur(e.relatedTarget)) return;
                      refocusMobileField(logTextareaRef);
                    }}
                    onFocus={() => setActiveField("body")}
                    placeholder="Add a note… (optional — turns this into a review)"
                    className="w-full text-[17px] font-normal leading-relaxed text-fg min-h-[120px] resize-none border-none outline-none bg-transparent placeholder:text-fg-muted placeholder:font-normal mt-1"
                    style={{ caretColor: "var(--accent)" }}
                  />
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "text-[10px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded-sm",
                        isReview
                          ? "text-film-red bg-red-50"
                          : "text-fg-faint bg-sunken"
                      )}
                    >
                      {isReview ? "Review" : "Log"}
                    </div>
                    <span className="text-[10px] text-fg-faint">
                      → write more to create a Review
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Quoted post embed */}
        {quotedPost && (
          <div
            className={cn(
              "mx-4 mb-3 rounded-xl border border-border bg-sunken overflow-hidden",
              isFullPage ? "ml-4" : "ml-[52px]"
            )}
          >
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-[10px] font-sans font-semibold text-fg-light flex-shrink-0">
                  {quotedPost.avatarInitial}
                </div>
                <span className="text-[13px] font-semibold text-fg truncate">{quotedPost.displayName}</span>
                <span className="text-[12px] text-fg-muted truncate">{quotedPost.handle}</span>
                {quotedPost.timestamp && (
                  <span className="text-[11px] text-fg-muted ml-auto flex-shrink-0">{quotedPost.timestamp}</span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-fg-light line-clamp-3">{quotedPost.text}</p>
            </div>
          </div>
        )}
      </div>

      {submitError ? (
        <p className={cn(
          "mx-4 mb-3 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[13px] font-medium text-film-red",
          isFullPage ? "ml-4" : "ml-[52px]"
        )}>
          {submitError}
        </p>
      ) : null}

      {fixedMobileToolbar ? renderFormattingToolbarRow() : null}

      {fixedMobileToolbar ? (
        <div className="min-h-0 flex-1 bg-bg" aria-hidden />
      ) : null}

      {!fixedMobileToolbar ? renderFormattingToolbarRow() : null}
    </div>
  );
  }
);
