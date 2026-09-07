import type { VideoAssetStatus } from "@35mm/types";
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";

import { useApiClient } from "@/services/api";
import { uploadPostVideo, type SelectedPostVideo } from "./upload";

export type DraftVideoUploadPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "uploaded"
  | "failed";

export function useDraftVideoUpload(video: SelectedPostVideo | null) {
  const { userId } = useAuth();
  const client = useApiClient();
  const [phase, setPhase] = useState<DraftVideoUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const operation = useRef<{
    video: SelectedPostVideo;
    promise: Promise<VideoAssetStatus>;
    controller: AbortController;
  } | null>(null);

  const start = useCallback((): Promise<VideoAssetStatus> => {
    if (!video || !userId) return Promise.reject(new Error("Sign in and choose a video first."));
    if (operation.current?.video === video) return operation.current.promise;
    operation.current?.controller.abort();
    const controller = new AbortController();
    setError(null);
    setProgress(0);
    setPhase("uploading");
    const promise = uploadPostVideo({
      client,
      ownerId: userId,
      video,
      signal: controller.signal,
      onProgress: setProgress,
      onProcessing: () => setPhase("processing"),
    })
      .then((status) => {
        if (!controller.signal.aborted) {
          setProgress(100);
          setPhase("uploaded");
        }
        return status;
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Video upload failed. Retry to resume.");
          setPhase("failed");
        }
        throw cause;
      });
    operation.current = { video, promise, controller };
    void promise.catch(() => undefined);
    return promise;
  }, [client, userId, video]);

  useEffect(() => {
    if (!video || !userId) {
      operation.current?.controller.abort();
      operation.current = null;
      return;
    }
    void start();
    return () => {
      operation.current?.controller.abort();
      operation.current = null;
    };
  }, [attempt, start, userId, video]);

  const retry = useCallback(() => {
    operation.current?.controller.abort();
    operation.current = null;
    setAttempt((value) => value + 1);
  }, []);
  const cancel = useCallback(() => {
    operation.current?.controller.abort();
    operation.current = null;
  }, []);

  return {
    phase,
    progress,
    error,
    retry,
    ensureUpload: start,
    cancel,
  };
}
