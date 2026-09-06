"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { uploadVideo } from "../api/videoApi";

export function useDraftVideoUpload(file: File | null) {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const attemptRef = useRef<{
    file: File;
    controller: AbortController;
    promise: ReturnType<typeof uploadVideo>;
  } | null>(null);
  const [phase, setPhase] = useState<"ready" | "uploading" | "uploaded" | "complete" | "failed">("ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ensureUpload = useCallback((selected: File) => {
    if (attemptRef.current?.file === selected) return attemptRef.current.promise;
    attemptRef.current?.controller.abort();
    const controller = new AbortController();
    setPhase("uploading");
    setProgress(0);
    setError(null);
    const promise = uploadVideo({
      file: selected,
      purpose: "post",
      ownerId: authRef.current.userId ?? "",
      getToken: () => authRef.current.getToken(),
      signal: controller.signal,
      onProgress: (value) => {
        if (!controller.signal.aborted) setProgress(value);
      },
      onProcessing: () => {
        if (!controller.signal.aborted) setPhase("uploaded");
      },
    }).then((asset) => {
      controller.signal.throwIfAborted();
      setProgress(100);
      setPhase(asset.state === "ready" ? "complete" : "uploaded");
      return asset;
    });
    attemptRef.current = { file: selected, controller, promise };
    // Observe background failures even when the user has not pressed Post.
    void promise.catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      attemptRef.current = null;
      setPhase("failed");
      setError(cause instanceof Error ? cause.message : "Video upload failed. Retry to resume.");
    });
    return promise;
  }, []);

  useEffect(() => {
    if (file) void ensureUpload(file);
    else {
      setPhase("ready");
      setProgress(0);
      setError(null);
    }
    return () => {
      attemptRef.current?.controller.abort();
      attemptRef.current = null;
    };
  }, [file, ensureUpload]);

  return { phase, progress, error, ensureUpload, retry: () => {
    if (file) void ensureUpload(file);
  } };
}
