"use client";

import { useCallback, useEffect, useState } from "react";
import { showGlobalFlashToast } from "@/components/FlashToast";

/** A composer choice, scoped to the signed-in account and this browser. */
export function useLogSharingPreference(userId: string | null | undefined) {
  const [choice, setChoice] = useState<{ userId: string | null; share: boolean }>({
    userId: null,
    share: false,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const postToFeed = choice.userId === userId && choice.share;

  useEffect(() => {
    setNotice(null);
    if (!userId) {
      setChoice({ userId: null, share: false });
      return;
    }
    try {
      const stored = window.localStorage.getItem(`35mm.log-sharing.v1.${userId}`);
      setChoice({ userId, share: stored === "feed" || stored === "public" });
    } catch (error) {
      console.warn("[log-sharing] Could not read composer preference", { error });
      setChoice({ userId, share: false });
      setNotice("This browser could not load your sharing preference. This entry will skip follower feeds.");
    }
  }, [userId]);

  const setPostToFeed = useCallback((share: boolean) => {
    setChoice({ userId: userId ?? null, share });
  }, [userId]);

  const rememberSharing = useCallback((share: boolean) => {
    if (!userId) return;
    try {
      window.localStorage.setItem(`35mm.log-sharing.v1.${userId}`, share ? "feed" : "profile");
    } catch (error) {
      console.warn("[log-sharing] Could not save composer preference", { error });
      showGlobalFlashToast("Entry saved. This browser could not remember your sharing preference.", "error");
    }
  }, [userId]);

  return { postToFeed, setPostToFeed, rememberSharing, sharingNotice: notice };
}
