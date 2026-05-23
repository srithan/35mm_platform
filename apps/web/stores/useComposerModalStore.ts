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

interface ComposerModalState {
  isOpen: boolean;
  quotedPost: QuotedPost | null;
  open: (quoted?: QuotedPost) => void;
  close: () => void;
  /** Sets quote context for `/new` on narrow viewports without opening the desktop modal. */
  setQuotedPostOnly: (quoted: QuotedPost | null) => void;
}

export var useComposerModalStore = create<ComposerModalState>(function (set) {
  return {
    isOpen: false,
    quotedPost: null,
    open: function (quoted) {
      set({ isOpen: true, quotedPost: quoted || null });
    },
    close: function () {
      set({ isOpen: false, quotedPost: null });
    },
    setQuotedPostOnly: function (quoted) {
      set({ quotedPost: quoted });
    },
  };
});
