"use client";

import { create } from "zustand";
import type { NsfwCategory, NsfwInfo } from "@35mm/types";

export interface QuotedPostMedia {
  type: "image" | "video";
  url: string;
  videoAssetId?: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  nsfw?: boolean;
  nsfwCategories?: NsfwCategory[];
  variants?: {
    thumb?: string;
    feed?: string;
    full?: string;
  };
}

export interface QuotedPostLinkPreview {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
  presentation: "card_only" | "url_and_card";
}

export interface QuotedPost {
  postId: string;
  displayName: string;
  handle: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  text: string;
  timestamp?: string;
  media?: QuotedPostMedia[];
  linkPreview?: QuotedPostLinkPreview | null;
  nsfw?: NsfwInfo;
}

export interface EditingPost {
  postId: string;
  userId: string;
  type: "text" | "discussion" | "log" | "review" | "image";
  body: string;
  headline?: string;
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
    presentation: "card_only" | "url_and_card";
  } | null;
  film?: {
    id: string;
    tmdbId?: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    rating: number | null;
  } | null;
}

export type ComposerInitialMode = "write" | "discussion" | "log";

interface ComposerModalState {
  isOpen: boolean;
  quotedPost: QuotedPost | null;
  editingPost: EditingPost | null;
  initialMode: ComposerInitialMode | null;
  initialFilm: EditingPost["film"] | null;
  openForFilm: (film: NonNullable<EditingPost["film"]>, openModal?: boolean) => void;
  open: (quoted?: QuotedPost, initialMode?: ComposerInitialMode) => void;
  openForEdit: (post: EditingPost) => void;
  close: () => void;
  /** Sets quote context for `/new` on narrow viewports without opening the desktop modal. */
  setQuotedPostOnly: (quoted: QuotedPost | null) => void;
}

export var useComposerModalStore = create<ComposerModalState>(function (set) {
  return {
    isOpen: false,
    quotedPost: null,
    editingPost: null,
    initialMode: null,
    initialFilm: null,
    openForFilm: function (film, openModal = true) {
      set({ isOpen: openModal, quotedPost: null, editingPost: null, initialMode: "log", initialFilm: film });
    },
    open: function (quoted, initialMode) {
      set({
        isOpen: true,
        quotedPost: quoted || null,
        editingPost: null,
        initialMode: quoted ? null : (initialMode ?? null),
        initialFilm: null,
      });
    },
    openForEdit: function (post) {
      set({ isOpen: true, quotedPost: null, editingPost: post, initialMode: null, initialFilm: null });
    },
    close: function () {
      set({ isOpen: false, quotedPost: null, editingPost: null, initialMode: null, initialFilm: null });
    },
    setQuotedPostOnly: function (quoted) {
      set({ quotedPost: quoted, editingPost: null, initialMode: null, initialFilm: null });
    },
  };
});
