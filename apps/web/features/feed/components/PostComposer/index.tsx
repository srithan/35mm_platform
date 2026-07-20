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
import type { Editor } from "@tiptap/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";
import type { QuotedPost } from "@/stores/useComposerModalStore";
import type { ComposerInitialMode } from "@/stores/useComposerModalStore";
import type { ComposerMode, FilmResult } from "./types";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextEditor } from "./RichTextEditor";
import { EmojiPicker } from "./EmojiPicker";
import { ImageAttachments } from "./ImageAttachments";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { FilmSearch } from "./FilmSearch";
import { FilmCard } from "./FilmCard";
import { LogNoteField, LOG_MAX_CHARS, REVIEW_THRESHOLD } from "./LogNoteField";
import { Icon } from "@/components/Icon/Icon";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { useCreatePost } from "../../hooks/usePostMutations";
import { useUpdatePost } from "../../hooks/usePostMutations";
import { fetchLinkPreview, type CreatePostInput } from "../../api/postsApi";
import type { EditingPost } from "@/stores/useComposerModalStore";
import { resolveOnboardingFilmsFromTmdb } from "@/features/onboarding/api/onboardingApi";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "@/features/profile/api/mediaApi";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { TenorGifPicker } from "@/features/chat/components/TenorGifPicker";
import { hasVisibleRichText, storedRichTextToPlainText } from "@/lib/utils/richContent";
import {
  emptyPollOption,
  isPollDraftValid,
  pollTotalMinutes,
  type PollDraft,
} from "../../utils/pollUtils";
import { PollComposer } from "./PollComposer";
import { postComposerWritePrompt } from "./writePrompt";

const WRITE_MAX_CHARS = 500;
const POLL_TEXT_MAX_CHARS = 140;
const DISCUSSION_HEADLINE_MAX_CHARS = 120;
const DISCUSSION_BODY_MAX_CHARS = 3000;
const POST_COMPOSER_EMOJI_STYLE = "apple" as const;
const VIDEO_PREVIEW_CLASS = "mx-auto max-h-[min(42vh,360px)] max-w-full rounded-md object-contain bg-black";

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

function modeForEditingPost(
  editingPost: EditingPost | null | undefined,
  fallback: ComposerInitialMode
): ComposerMode {
  if (!editingPost) return fallback;
  if (editingPost.type === "discussion") return "discussion";
  if (editingPost.type === "log" || editingPost.type === "review") return "log";
  return "write";
}

function writeTextForEditingPost(editingPost: EditingPost | null | undefined): string {
  if (!editingPost) return "";
  if (editingPost.type === "discussion" || editingPost.type === "log" || editingPost.type === "review") {
    return "";
  }
  return editingPost.body ?? "";
}

function discussionTextForEditingPost(editingPost: EditingPost | null | undefined): string {
  return editingPost?.type === "discussion" ? editingPost.body ?? "" : "";
}

function discussionHeadlineForEditingPost(editingPost: EditingPost | null | undefined): string {
  return editingPost?.type === "discussion" ? editingPost.headline ?? "" : "";
}

function logTextForEditingPost(editingPost: EditingPost | null | undefined): string {
  return editingPost?.type === "log" || editingPost?.type === "review" ? editingPost.body ?? "" : "";
}

function selectedFilmForEditingPost(editingPost: EditingPost | null | undefined): FilmResult | null {
  if (!editingPost || (editingPost.type !== "log" && editingPost.type !== "review")) return null;
  if (!editingPost.film) return null;
  return {
    id: editingPost.film.tmdbId ?? 0,
    title: editingPost.film.title,
    year: editingPost.film.year ? String(editingPost.film.year) : "",
    language: "",
    genres: editingPost.film.genres ?? [],
    posterPath: editingPost.film.posterUrl,
  };
}

function selectedFilmUlidForEditingPost(editingPost: EditingPost | null | undefined): string | null {
  if (!editingPost || (editingPost.type !== "log" && editingPost.type !== "review")) return null;
  return editingPost.film?.id ?? null;
}

function existingMediaUrlsForEditingPost(editingPost: EditingPost | null | undefined): string[] {
  if (!editingPost || editingPost.type === "log" || editingPost.type === "review") return [];
  return editingPost.mediaUrls ?? [];
}

function isVideoMediaUrl(url: string): boolean {
  var lower = url.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".m4v") ||
    lower.includes("video")
  );
}

function isGifMediaUrl(url: string): boolean {
  var lower = url.toLowerCase();
  return lower.endsWith(".gif") || lower.includes("giphy.com") || lower.includes("tenor.com");
}

function normalizeImageContentType(value: string | null | undefined): string {
  var raw = (value || "").toLowerCase().trim();
  if (!raw) return "image/jpeg";

  var normalized = raw.split(";")[0]!;
  if (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/gif" ||
    normalized === "image/avif" ||
    normalized === "image/heic" ||
    normalized === "image/heif"
  ) {
    return normalized;
  }

  return "image/jpeg";
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

export type ComposerPublishState = {
  canPost: boolean;
  label: string;
  isPublishing: boolean;
  processingLabel: string;
};

export interface PostComposerProps {
  variant?: "inline" | "modal" | "fullPage";
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit?: () => void;
  onClose?: () => void;
  quotedPost?: QuotedPost | null;
  /** When `header`, the primary publish control is rendered outside (e.g. nav bar). */
  postPrimaryPlacement?: "toolbar" | "header";
  onPublishStateChange?: (state: ComposerPublishState) => void;
  editingPost?: EditingPost | null;
  initialMode?: ComposerInitialMode | null;
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
      initialMode,
    },
    ref
  ) {
  const resolvedInitialMode = initialMode ?? "write";
  const initialComposerMode = modeForEditingPost(editingPost, resolvedInitialMode);
  const [mode, setMode] = useState<ComposerMode>(initialComposerMode);
  const [writeText, setWriteText] = useState(() => writeTextForEditingPost(editingPost));
  const [discussionText, setDiscussionText] = useState(() => discussionTextForEditingPost(editingPost));
  const [discussionHeadline, setDiscussionHeadline] = useState(() => discussionHeadlineForEditingPost(editingPost));
  const [logText, setLogText] = useState(() => logTextForEditingPost(editingPost));
  const [selectedFilm, setSelectedFilm] = useState<FilmResult | null>(() => selectedFilmForEditingPost(editingPost));
  const [selectedFilmUlid, setSelectedFilmUlid] = useState<string | null>(() => selectedFilmUlidForEditingPost(editingPost));
  const [isResolvingFilm, setIsResolvingFilm] = useState(false);
  const [starRating, setStarRating] = useState(() => editingPost?.film?.rating ?? 0);
  const [isRewatch, setIsRewatch] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>(() => existingMediaUrlsForEditingPost(editingPost));
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [pollDraft, setPollDraft] = useState<PollDraft | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null>(editingPost?.linkPreview ?? null);
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [postToFeed, setPostToFeed] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const writePlaceholder = useMemo(
    function () {
      if (pollDraft) return "Ask your question...";
      return postComposerWritePrompt(currentDisplayName);
    },
    [currentDisplayName, pollDraft]
  );

  // Track which input is active to show the correct char limit (for discussion mode)
  const [activeField, setActiveField] = useState<"headline" | "body" | null>(() =>
    editingPost ? (editingPost.type === "discussion" ? "headline" : "body") : null
  );

  const discussionHeadlineRef = useRef<HTMLInputElement>(null);
  const [writeEditor, setWriteEditor] = useState<Editor | null>(null);
  const [discussionEditor, setDiscussionEditor] = useState<Editor | null>(null);
  const [logEditor, setLogEditor] = useState<Editor | null>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const writePlainText = storedRichTextToPlainText(writeText);
  const discussionPlainText = storedRichTextToPlainText(discussionText);
  const logPlainText = storedRichTextToPlainText(logText);
  const activeText = mode === "discussion" ? discussionPlainText : mode === "log" ? logPlainText : writePlainText;
  const debouncedActiveText = useDebounce(activeText, 500);
  const hasVisibleQuotedPost = useMemo(() => {
    if (!quotedPost) return false;
    const name = quotedPost.displayName?.trim() ?? "";
    const handle = quotedPost.handle?.trim() ?? "";
    const text = quotedPost.text?.trim() ?? "";
    return name.length > 0 || handle.length > 0 || text.length > 0;
  }, [quotedPost]);
  const resolvedExistingMediaUrls = useMemo(
    function () {
      if (existingMediaUrls.length > 0) return existingMediaUrls;
      if (editingPost?.mediaUrls && editingPost.mediaUrls.length > 0) {
        return editingPost.mediaUrls;
      }
      return [];
    },
    [existingMediaUrls, editingPost]
  );
  const existingVideoUrl = useMemo(
    () => resolvedExistingMediaUrls.find(isVideoMediaUrl) ?? null,
    [resolvedExistingMediaUrls]
  );
  const existingGifMediaUrl = useMemo(
    () => resolvedExistingMediaUrls.find(isGifMediaUrl) ?? null,
    [resolvedExistingMediaUrls]
  );
  const existingImageUrls = useMemo(
    () =>
      resolvedExistingMediaUrls.filter(function (url) {
        return !isVideoMediaUrl(url) && !isGifMediaUrl(url);
      }),
    [resolvedExistingMediaUrls]
  );

  function extractFirstUrl(value: string): string | null {
    var match = value.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  useEffect(() => {
    if (pollDraft) {
      setLinkPreview(null);
      return;
    }
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
  }, [debouncedActiveText, dismissedPreviewUrl, getToken, linkPreview?.url, pollDraft]);

  const charCountData = useMemo(() => {
    if (mode === "write") {
      // Poll posts have a stricter character limit
      var maxChars = pollDraft ? POLL_TEXT_MAX_CHARS : WRITE_MAX_CHARS;
      return { count: writePlainText.length, max: maxChars };
    }
    if (mode === "log") return { count: logPlainText.length, max: LOG_MAX_CHARS };

    // Discussion mode depends on which field is active. Defaults to body limit.
    if (activeField === "headline") {
      return { count: discussionHeadline.length, max: DISCUSSION_HEADLINE_MAX_CHARS };
    }
    return { count: discussionPlainText.length, max: DISCUSSION_BODY_MAX_CHARS };
  }, [mode, activeField, writePlainText, logPlainText, discussionHeadline, discussionPlainText, pollDraft]);

  const charCountRemaining = charCountData.max - charCountData.count;

  const isReview = logPlainText.length > REVIEW_THRESHOLD;
  const showLogFormatBar = logPlainText.length > REVIEW_THRESHOLD;
  const pollDuration = useMemo(function () {
    if (!pollDraft) return 0;
    return pollTotalMinutes(pollDraft.durationDays, pollDraft.durationHours, pollDraft.durationMinutes);
  }, [pollDraft]);
  const pollIsValid = useMemo(function () {
    if (!pollDraft) return false;
    return isPollDraftValid(pollDraft);
  }, [pollDraft]);

  const canPost = useMemo(() => {
    // Poll posts require text (max 140 chars)
    var pollTextValid = pollIsValid
      ? writePlainText.trim().length > 0 && writePlainText.length <= POLL_TEXT_MAX_CHARS
      : true;

    if (editingPost) {
      if (mode === "discussion") {
        return (
          discussionHeadline.trim().length > 0 &&
          discussionHeadline.length <= DISCUSSION_HEADLINE_MAX_CHARS &&
          discussionPlainText.length <= DISCUSSION_BODY_MAX_CHARS
        );
      }
      if (mode === "log") {
        return (
          selectedFilm !== null &&
          selectedFilmUlid !== null &&
          !isResolvingFilm &&
          logPlainText.length <= LOG_MAX_CHARS
        );
      }
      return (
        (writePlainText.trim().length > 0 ||
          images.length > 0 ||
          videoFile !== null ||
          gifUrl !== null ||
          pollIsValid) &&
        writePlainText.length <= WRITE_MAX_CHARS &&
        pollTextValid
      );
    }

    if (mode === "write") {
      // Poll posts require text; regular posts can be media-only
      if (pollIsValid) {
        return pollTextValid;
      }
      return (
        (writePlainText.trim().length > 0 ||
          images.length > 0 ||
          videoFile !== null ||
          gifUrl !== null) &&
        writePlainText.length <= WRITE_MAX_CHARS
      );
    }
    if (mode === "discussion") {
      return (
        discussionHeadline.trim().length > 0 &&
        discussionHeadline.length <= DISCUSSION_HEADLINE_MAX_CHARS &&
        discussionPlainText.length <= DISCUSSION_BODY_MAX_CHARS
      );
    }
    return (
      selectedFilm !== null &&
      selectedFilmUlid !== null &&
      !isResolvingFilm &&
      logPlainText.length <= LOG_MAX_CHARS
    );
  }, [
    editingPost,
    mode,
    writePlainText,
    images.length,
    videoFile,
    gifUrl,
    pollIsValid,
    discussionHeadline,
    discussionPlainText,
    logPlainText,
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

  const postButtonProcessingLabel = useMemo(() => {
    if (editingPost) return "Saving...";
    if (mode === "log") return isReview ? "Reviewing..." : "Logging...";
    return "Posting...";
  }, [editingPost, mode, isReview]);

  const isPublishing =
    isSubmitting || createPostMutation.isPending || updatePostMutation.isPending;

  const modeTabIndex = useMemo(function () {
    var index = MODE_TABS.findIndex(function (tab) {
      return tab.id === mode;
    });
    return index >= 0 ? index : 0;
  }, [mode]);

  const isDirty = useMemo(
    () =>
      writePlainText.trim().length > 0 ||
      discussionPlainText.trim().length > 0 ||
      discussionHeadline.trim().length > 0 ||
      logPlainText.trim().length > 0 ||
      selectedFilm !== null ||
      images.length > 0 ||
      videoFile !== null ||
      gifUrl !== null ||
      pollDraft !== null ||
      youtubeVideoId !== null,
    [
      writePlainText,
      discussionPlainText,
      discussionHeadline,
      logPlainText,
      selectedFilm,
      images.length,
      videoFile,
      gifUrl,
      pollDraft,
      youtubeVideoId,
    ]
  );

  useEffect(() => {
    if (editingPost) return;
    setMode(resolvedInitialMode);
  }, [editingPost, resolvedInitialMode]);

  useEffect(() => {
    if (!editingPost) {
      setExistingMediaUrls([]);
      return;
    }

    setImages([]);
    setVideoFile(null);
    setGifUrl(null);
    setPollDraft(null);
    setShowDropZone(false);
    setWriteText("");
    setDiscussionHeadline("");
    setDiscussionText("");
    setLogText("");
    setSelectedFilm(null);
    setSelectedFilmUlid(null);
    setIsResolvingFilm(false);
    setStarRating(0);
    setIsRewatch(false);
    setExistingMediaUrls(existingMediaUrlsForEditingPost(editingPost));
    setLinkPreview(editingPost.linkPreview ?? null);
    setDismissedPreviewUrl(null);

    if (editingPost.type === "discussion") {
      setMode("discussion");
      setDiscussionHeadline(discussionHeadlineForEditingPost(editingPost));
      setDiscussionText(discussionTextForEditingPost(editingPost));
      setActiveField("headline");
    } else if (editingPost.type === "log" || editingPost.type === "review") {
      setMode("log");
      setLogText(logTextForEditingPost(editingPost));
      setSelectedFilm(selectedFilmForEditingPost(editingPost));
      setSelectedFilmUlid(selectedFilmUlidForEditingPost(editingPost));
      setStarRating(editingPost.film?.rating ?? 0);
      setActiveField("body");
    } else {
      setMode("write");
      setWriteText(writeTextForEditingPost(editingPost));
      setActiveField("body");
    }
  }, [editingPost]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPublishStateChange?.({
      canPost: canPost,
      label: postButtonLabel,
      isPublishing: isPublishing,
      processingLabel: postButtonProcessingLabel,
    });
  }, [canPost, postButtonLabel, postButtonProcessingLabel, isPublishing, onPublishStateChange]);

  const isModal = variant === "modal";
  const isFullPage = variant === "fullPage";
  const postInToolbar = postPrimaryPlacement === "toolbar";
  const fixedMobileToolbar =
    isFullPage && postPrimaryPlacement === "header";

  useEffect(
    function () {
      if (fixedMobileToolbar) {
        setShowEmojiPicker(false);
      }
    },
    [fixedMobileToolbar]
  );

  const hasComposerMedia =
    images.length > 0 ||
    existingImageUrls.length > 0 ||
    existingVideoUrl != null ||
    existingGifMediaUrl != null ||
    showDropZone ||
    videoFile != null ||
    gifUrl != null ||
    youtubeVideoId != null;
  const compactComposeBody = (hasComposerMedia || pollDraft !== null) && !isFullPage;

  function focusWriteTextarea() {
    writeEditor?.commands.focus("end", { scrollIntoView: false });
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

  const handleEditorPaste = useCallback(
    (e: ClipboardEvent, targetMode: ComposerMode) => {
      if (targetMode !== "write" && targetMode !== "discussion") return;
      if (pollDraft) return;
      const clipboardItems = Array.from(e.clipboardData?.items ?? []);
      const pastedImageFiles = clipboardItems
        .map(function (item) {
          if (item.kind !== "file") return null;
          if (!item.type.startsWith("image/")) return null;
          return item.getAsFile();
        })
        .filter(function (file): file is File {
          return file instanceof File;
        });

      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        setImages(function (current) {
          return [...current, ...pastedImageFiles].slice(0, 9);
        });
        setVideoFile(null);
        setGifUrl(null);
        setShowDropZone(false);
        return;
      }

      const pasted = e.clipboardData?.getData("text/plain") ?? "";
      const vid = extractYouTubeId(pasted);
      if (vid) {
        setYoutubeVideoId(vid);
        setYoutubeTitle("YouTube video");
      }
    },
    [pollDraft]
  );

  const handleEmojiInsertFixed = useCallback(
    (emoji: string) => {
      if (mode === "write") {
        writeEditor?.chain().focus().insertContent(emoji).run();
      } else if (mode === "discussion") {
        discussionEditor?.chain().focus().insertContent(emoji).run();
      } else {
        logEditor?.chain().focus().insertContent(emoji).run();
      }
      setShowEmojiPicker(false);
    },
    [mode, writeEditor, discussionEditor, logEditor]
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

  const handleAddPoll = useCallback(function () {
    setPollDraft({
      type: "ranking",
      durationDays: 1,
      durationHours: 0,
      durationMinutes: 0,
      resultsVisibility: "after_vote",
      options: [emptyPollOption(), emptyPollOption()],
    });
    setImages([]);
    setExistingMediaUrls([]);
    setVideoFile(null);
    setGifUrl(null);
    setYoutubeVideoId(null);
    setYoutubeTitle(null);
    setLinkPreview(null);
    setShowDropZone(false);
    setShowGifPicker(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || isSubmitting || createPostMutation.isPending || updatePostMutation.isPending) {
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
    async function uploadPostMedia(file: File): Promise<{
      type: "image" | "video";
      url: string;
      originalUrl: string;
      key: string;
      variants?: {
        thumb?: string;
        feed?: string;
        full?: string;
      };
      thumbnailUrl?: string;
    }> {
      var token = await getToken();
      var presign = await presignProfileMediaUpload(
        {
          kind: "post_media",
          contentType: normalizeImageContentType(file.type),
          contentLength: file.size,
        },
        token
      );

      await uploadToPresignedUrl({
        uploadUrl: presign.uploadUrl,
        contentType: presign.contentType,
        blob: file,
      });

      var isVideo = presign.contentType.startsWith("video/");
      return {
        type: isVideo ? "video" : "image",
        url: presign.publicUrl,
        originalUrl: presign.publicUrl,
        key: presign.objectKey,
        variants: undefined,
        thumbnailUrl: undefined,
      };
    }

    let input: CreatePostInput;
    var mediaUrls: string[] = [];
    var media: CreatePostInput["media"] = [];
    if (mode !== "log" && !pollDraft) {
      if (images.length > 0) {
        var imageFiles = images.slice(0, 9);
        media = await Promise.all(imageFiles.map(uploadPostMedia));
        mediaUrls = media
          .filter((item) => item.type === "image")
          .map((item) => item.url);
      } else if (videoFile) {
        var uploadedVideo = await uploadPostMedia(videoFile);
        media = [uploadedVideo];
        mediaUrls = [uploadedVideo.url];
      } else if (gifUrl) {
        media = [{ type: "image", url: gifUrl }];
        mediaUrls = [gifUrl];
      }
    }
    var pollPayload: CreatePostInput["poll"] | undefined;
    if (pollDraft) {
      if (!pollIsValid) {
        setSubmitError("Poll needs 2-10 valid options and a 5 minute to 10 day duration");
        return;
      }
      var pollOptions = await Promise.all(
        pollDraft.options.map(async function (option) {
          var imageUrl: string | null = null;
          // Only use imageUrl if it's a real URL (not a blob URL)
          if (option.imageUrl && !option.imageUrl.startsWith("blob:")) {
            imageUrl = option.imageUrl.trim();
          }
          // Upload the file if present - use publicUrl (R2) instead of variants (Cloudflare Images)
          if (option.imageFile) {
            var uploadedOptionImage = await uploadPostMedia(option.imageFile);
            imageUrl = uploadedOptionImage.originalUrl;
          }
          return {
            label: option.label.trim() || null,
            imageUrl: imageUrl,
          };
        })
      );
      pollPayload = {
        type: pollDraft.type,
        durationMinutes: pollDuration,
        resultsVisibility: pollDraft.resultsVisibility,
        options: pollOptions,
      };
    }
    if (mode === "discussion") {
      input = {
        type: "discussion",
        headline: discussionHeadline.trim(),
        body: hasVisibleRichText(discussionText) ? discussionText : discussionHeadline.trim(),
        media,
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
        body: hasVisibleRichText(logText) ? logText : `Logged ${selectedFilm.title}`,
        postToFeed,
        visibility: postToFeed ? "public" : "private",
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
        body: writeText,
        media,
        mediaUrls,
        linkPreview: pollPayload ? null : linkPreview,
        poll: pollPayload,
      };
    }

    if (quotedPost?.postId) {
      input.quotedPostId = quotedPost.postId;
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
    setExistingMediaUrls([]);
    setVideoFile(null);
    setGifUrl(null);
    setPollDraft(null);
    setYoutubeVideoId(null);
    setYoutubeTitle(null);
    setLinkPreview(null);
    setDismissedPreviewUrl(null);
    setShowDropZone(false);
    setShowEmojiPicker(false);
    setPostToFeed(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canPost,
    isSubmitting,
    createPostMutation,
    editingPost,
    discussionHeadline,
    discussionText,
    images.length,
    videoFile,
    gifUrl,
    pollDraft,
    pollDuration,
    pollIsValid,
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
    postToFeed,
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
            : "border-[var(--composer-border)] bg-[var(--composer-bg)] px-4 py-2.5 pl-[52px]"
        )}
      >
        <div className="flex items-center gap-0.5 relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
          {mode !== "log" && (
            <>
              <button
                type="button"
                disabled={pollDraft !== null}
                onClick={() => setShowDropZone((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  pollDraft !== null && "cursor-not-allowed opacity-40",
                  fixedMobileToolbar
                    ? cn(
                        "text-accent hover:bg-accent/[0.12]",
                        showDropZone && "bg-accent/15"
                      )
                    : cn(
                        "text-fg-muted hover:bg-hover hover:text-fg",
                        showDropZone && "bg-sunken text-fg"
                      )
                )}
                title="Add images"
              >
                <Icon name="image" className="h-[20px] w-[20px]" strokeWidth={fixedMobileToolbar ? 1.85 : 2} />
              </button>
              <button
                type="button"
                disabled={pollDraft !== null}
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  pollDraft !== null && "cursor-not-allowed opacity-40",
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
                disabled={pollDraft !== null}
                onClick={() => setShowGifPicker((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                  pollDraft !== null && "cursor-not-allowed opacity-40",
                  fixedMobileToolbar
                    ? "text-accent hover:bg-accent/[0.12]"
                    : "text-fg-muted hover:bg-hover hover:text-fg"
                )}
                title="Add GIF"
              >
                <span className="text-[11px] font-bold">GIF</span>
              </button>
              {mode === "write" && !editingPost && (
                <button
                  type="button"
                  onClick={pollDraft ? () => setPollDraft(null) : handleAddPoll}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
                    fixedMobileToolbar
                      ? cn("text-accent hover:bg-accent/[0.12]", pollDraft && "bg-accent/15")
                      : cn("text-fg-muted hover:bg-hover hover:text-fg", pollDraft && "bg-sunken text-fg")
                  )}
                  title={pollDraft ? "Remove poll" : "Add poll"}
                >
                  <Icon name="poll" className="h-[20px] w-[20px]" strokeWidth={2} />
                </button>
              )}
              {!fixedMobileToolbar && (
                <button
                  ref={emojiBtnRef}
                  type="button"
                  onClick={() => setShowEmojiPicker((s) => !s)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg active:scale-[0.97]"
                  title="Emoji"
                >
                  <Icon name="smile" className="h-[20px] w-[20px]" strokeWidth={2} />
                </button>
              )}

              {mode === "write" && (
                <FormattingToolbar
                  editor={writeEditor}
                  showDivider={true}
                  composeChrome={fixedMobileToolbar}
                />
              )}
              {mode === "discussion" && activeField !== "headline" && (
                <FormattingToolbar
                  editor={discussionEditor}
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

          {!fixedMobileToolbar && (
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onInsert={handleEmojiInsertFixed}
              anchorRef={emojiBtnRef}
              emojiStyle={POST_COMPOSER_EMOJI_STYLE}
            />
          )}
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
                    ? "border-transparent bg-[var(--composer-primary)]"
                    : "border-fg/20 bg-[var(--composer-bg)] group-hover:border-fg/40 group-hover:bg-hover"
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
                  <Icon name="check" className="w-[11px] h-[11px] text-[var(--composer-primary-fg)]" strokeWidth={4} />
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
              disabled={!canPost || isPublishing}
              aria-busy={isPublishing}
              onClick={handleSubmit}
              className={cn(
                "inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-full px-5 py-1.5 text-[13px] font-medium transition-all disabled:opacity-100",
                isPublishing && canPost
                  ? "cursor-wait bg-[var(--composer-primary)] text-[var(--composer-primary-fg)] shadow-sm"
                  : canPost
                    ? "bg-[var(--composer-primary)] text-[var(--composer-primary-fg)] shadow-sm hover:bg-[var(--composer-primary-hover)] active:scale-[0.97]"
                    : "cursor-not-allowed bg-sunken-2 text-fg-faint"
              )}
            >
              {isPublishing ? (
                <>
                  <ButtonSpinner className="h-3.5 w-3.5" />
                  <span>{postButtonProcessingLabel}</span>
                </>
              ) : (
                <span>{postButtonLabel}</span>
              )}
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
        !isModal && !isFullPage && "rounded-[var(--composer-radius)] border border-[var(--composer-border)] bg-[var(--composer-bg)]",
        !isModal &&
          !isFullPage &&
          (isFocused
            ? "shadow-[0_4px_24px_rgba(0,0,0,0.08)] ring-1 ring-border"
            : "shadow-sm hover:shadow-md"),
        isModal && "bg-[var(--composer-bg)]"
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
        <div className="relative inline-grid w-max max-w-full grid-cols-3 gap-1 rounded-[var(--composer-control-radius)] border border-[var(--composer-border)] bg-[var(--composer-field-bg)] px-1.5 py-1">
          <div
            className="pointer-events-none absolute inset-y-1 left-1.5 z-0 rounded-[var(--composer-control-radius)] border border-[var(--composer-border)] bg-[var(--composer-bg)] shadow-sm transition-transform duration-200 ease-out"
            style={{
              width: "calc((100% - 1.25rem) / 3)",
              transform: "translateX(calc(" + modeTabIndex + " * (100% + 0.25rem)))",
            }}
            aria-hidden
          />

          {MODE_TABS.map((tab) => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  if (tab.id !== "write") setPollDraft(null);
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors",
                  isActive ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
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
          <Avatar initial={currentInitial} src={currentAvatarUrl} loading="eager" className="w-9 h-9" />
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
              <RichTextEditor
                value={writeText}
                onChange={(value) => setWriteText(value)}
                onEditorReady={setWriteEditor}
                onFocus={() => setActiveField("body")}
                onPaste={(e) => handleEditorPaste(e, "write")}
                onBlur={(e) => {
                  if (!fixedMobileToolbar || mode !== "write") return;
                  if (allowMobileComposeBlur(e.relatedTarget)) return;
                  window.requestAnimationFrame(function () {
                    writeEditor?.commands.focus("end", { scrollIntoView: false });
                  });
                }}
                autoFocus={fixedMobileToolbar && mode === "write"}
                placeholder={writePlaceholder}
                className={cn(
                  isFullPage
                    ? fixedMobileToolbar
                      ? "h-[6.75rem] min-h-[6.75rem] max-h-[6.75rem] overflow-y-auto text-[20px] font-normal leading-[1.35]"
                      : "min-h-[3.25rem] text-[20px] font-normal leading-[1.45]"
                    : isModal
                      ? compactComposeBody
                        ? "min-h-[3rem] text-[19px] font-[600] leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child:before]:font-[600]"
                        : "min-h-[170px] text-[19px] font-[600] leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child:before]:font-[600]"
                      : compactComposeBody
                        ? "min-h-[3rem] text-[19px] font-[600] leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child:before]:font-[600]"
                        : "min-h-[140px] text-[19px] font-[600] leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child:before]:font-[600]"
                )}
              />
              {fixedMobileToolbar && (
                <div className="flex items-center gap-2 pt-0.5 text-[13px] font-medium text-accent">
                  <Icon name="globe" className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span>Everyone can reply</span>
                </div>
              )}
              {pollDraft ? (
                <>
                  {writePlainText.trim().length === 0 ? (
                    <p className="text-[12px] text-accent font-medium">
                      Add a question above (max 140 characters)
                    </p>
                  ) : null}
                  <PollComposer
                    draft={pollDraft}
                    isValid={pollIsValid}
                    onChange={setPollDraft}
                    onRemove={function () {
                      setPollDraft(null);
                    }}
                  />
                </>
              ) : null}
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
              {images.length === 0 && videoFile == null && gifUrl == null && existingImageUrls.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-[2px] rounded-[6px] overflow-hidden border border-border">
                  {existingImageUrls.map(function (url, index) {
                    return (
                      <div
                        key={url + ":" + index}
                        className="relative aspect-video bg-sunken overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {videoFile ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <div className="relative">
                    <video
                      src={URL.createObjectURL(videoFile)}
                      controls
                      className={VIDEO_PREVIEW_CLASS}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/80"
                      onClick={() => setVideoFile(null)}
                      aria-label="Remove video"
                      title="Remove video"
                    >
                      <Icon name="x" className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </div>
              ) : images.length === 0 && gifUrl == null && existingVideoUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <video src={existingVideoUrl} controls className={VIDEO_PREVIEW_CLASS} />
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
              ) : images.length === 0 && videoFile == null && existingGifMediaUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={existingGifMediaUrl} alt="Existing GIF" className="w-full rounded-md object-cover" />
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
              <RichTextEditor
                value={discussionText}
                onChange={(value) => setDiscussionText(value)}
                onEditorReady={setDiscussionEditor}
                onFocus={() => setActiveField("body")}
                onPaste={(e) => handleEditorPaste(e, "discussion")}
                onBlur={(e) => {
                  if (!fixedMobileToolbar || mode !== "discussion") return;
                  if (allowMobileComposeBlur(e.relatedTarget)) return;
                  window.requestAnimationFrame(function () {
                    discussionEditor?.commands.focus("end", { scrollIntoView: false });
                  });
                }}
                placeholder="Add more context... (optional)"
                className={cn(
                  "mt-2",
                  isFullPage
                    ? "min-h-[3rem] text-[17px] font-normal leading-relaxed"
                    : compactComposeBody
                      ? "min-h-[3rem] text-[16px] font-light leading-relaxed"
                      : "min-h-[140px] text-[16px] font-light leading-relaxed"
                )}
              />
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
              {images.length === 0 && videoFile == null && gifUrl == null && existingImageUrls.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-[2px] rounded-[6px] overflow-hidden border border-border">
                  {existingImageUrls.map(function (url, index) {
                    return (
                      <div
                        key={url + ":" + index}
                        className="relative aspect-video bg-sunken overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {videoFile ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <video src={URL.createObjectURL(videoFile)} controls className={VIDEO_PREVIEW_CLASS} />
                </div>
              ) : images.length === 0 && gifUrl == null && existingVideoUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  <video src={existingVideoUrl} controls className={VIDEO_PREVIEW_CLASS} />
                </div>
              ) : null}
              {gifUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gifUrl} alt="Selected GIF" className="w-full rounded-md object-cover" />
                </div>
              ) : images.length === 0 && videoFile == null && existingGifMediaUrl ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-sunken p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={existingGifMediaUrl} alt="Existing GIF" className="w-full rounded-md object-cover" />
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
              <LogNoteField
                value={logText}
                onChange={setLogText}
                editor={logEditor}
                onEditorReady={setLogEditor}
                isReview={isReview}
                showFormatBar={showLogFormatBar}
                editable={selectedFilm !== null}
                onBlur={function (e) {
                  if (!fixedMobileToolbar || mode !== "log") return;
                  if (allowMobileComposeBlur(e.relatedTarget)) return;
                  window.requestAnimationFrame(function () {
                    logEditor?.commands.focus("end", { scrollIntoView: false });
                  });
                }}
                onFocus={function () {
                  setActiveField("body");
                }}
              />
            </div>
          )}
        </div>
        </div>

        {/* Quoted post embed */}
        {hasVisibleQuotedPost && quotedPost && (
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
