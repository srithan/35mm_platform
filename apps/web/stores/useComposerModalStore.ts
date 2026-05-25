"use client";

import { create } from "zustand";

export interface QuotedPost {
  postId: string;
  displayName: string;
  handle: string;
  avatarInitial: string;
  text: string;
  timestamp?: string;
}

export interface EditingPost {
  postId: string;
  userId: string;
  type: "text" | "discussion" | "log" | "review" | "image";
  body: string;
  headline?: string;
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

interface ComposerModalState {
  isOpen: boolean;
  quotedPost: QuotedPost | null;
  editingPost: EditingPost | null;
  open: (quoted?: QuotedPost) => void;
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
    open: function (quoted) {
      set({ isOpen: true, quotedPost: quoted || null, editingPost: null });
    },
    openForEdit: function (post) {
      set({ isOpen: true, quotedPost: null, editingPost: post });
    },
    close: function () {
      set({ isOpen: false, quotedPost: null, editingPost: null });
    },
    setQuotedPostOnly: function (quoted) {
      set({ quotedPost: quoted, editingPost: null });
    },
  };
});
