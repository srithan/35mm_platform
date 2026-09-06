"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INITIAL_UPLOAD_FORM,
  type ShortFilmUploadForm,
  type UploadStep,
  type Visibility,
} from "./types";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadVideo,
  publishFilm,
  forgetVideoUpload,
} from "@/features/videos/api/videoApi";
import { videoKeys } from "@/features/videos/hooks/queryKeys";
import {
  presignProfileMediaUpload,
  uploadToPresignedUrl,
} from "@/features/profile/api/mediaApi";
import { MAX_GENRES, MAX_TAGS } from "./constants";

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(1) + " GB";
  }
  return (bytes / 1048576).toFixed(1) + " MB";
}

export function useShortFilmUploadForm() {
  const [step, setStep] = useState<UploadStep>(1);
  const [form, setForm] = useState<ShortFilmUploadForm>(INITIAL_UPLOAD_FORM);
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadVideo({
        file,
        purpose: "film",
        ownerId: userId ?? "",
        getToken,
        signal: abortRef.current?.signal,
        onProgress: (pct) =>
          setForm((prev) => ({ ...prev, videoUploadProgress: pct })),
        onProcessing: () => setProcessing(true),
      });
    },
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!uploadMutation.data || !form.videoUploadComplete)
        throw new Error("Upload and process your film first.");
      const token = await getToken();
      let thumbnailUrl: string | null = null;
      if (form.thumbnailFile) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            form.thumbnailFile.type,
          ) ||
          form.thumbnailFile.size > 12 * 1024 * 1024
        ) {
          throw new Error("Thumbnail must be JPG, PNG or WebP, up to 12 MB.");
        }
        const signed = await presignProfileMediaUpload(
          {
            kind: "post_media",
            contentType: form.thumbnailFile.type,
            contentLength: form.thumbnailFile.size,
          },
          token,
        );
        await uploadToPresignedUrl({
          uploadUrl: signed.uploadUrl,
          contentType: signed.contentType,
          blob: form.thumbnailFile,
        });
        thumbnailUrl = signed.publicUrl;
      }
      return publishFilm(
        uploadMutation.data.id,
        {
          title: form.title,
          description: form.description,
          tagline: form.tagline,
          director: form.director,
          year: form.year ? Number(form.year) : null,
          language: form.language,
          country: form.country,
          genres: form.genres,
          contentRating: form.contentRating,
          tags: form.tags,
          festivalNotes: form.festivalNotes,
          visibility: form.visibility,
          releaseAt: form.scheduleRelease
            ? new Date(form.scheduleRelease).toISOString()
            : null,
          thumbnailUrl,
        },
        token,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: videoKeys.all }),
  });
  const isPublished = publishMutation.isSuccess;
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (form.thumbnailPreviewUrl)
        URL.revokeObjectURL(form.thumbnailPreviewUrl);
    };
  }, [form.thumbnailPreviewUrl]);
  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
  }, []);
  const startVideoUpload = useCallback(
    async function (file: File) {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setProcessing(false);
      setForm((prev) => ({
        ...prev,
        videoFile: file,
        videoUploadProgress: 0,
        videoUploadComplete: false,
      }));
      try {
        const asset = await uploadMutation.mutateAsync(file);
        if (controller.signal.aborted) return;
        setForm((prev) => ({
          ...prev,
          videoUploadComplete: true,
          videoUploadProgress: 100,
          runtime: asset.durationSeconds
            ? String(Math.ceil(asset.durationSeconds / 60))
            : "",
        }));
        setProcessing(false);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Video upload failed",
          );
          setProcessing(false);
        }
      }
    },
    [uploadMutation.mutateAsync],
  );
  const removeVideo = useCallback(
    function () {
      abortRef.current?.abort();
      if (form.videoFile) forgetVideoUpload(form.videoFile);
      uploadMutation.reset();
      setError(null);
      setProcessing(false);
      setForm((prev) => ({
        ...prev,
        videoFile: null,
        videoUploadProgress: 0,
        videoUploadComplete: false,
      }));
    },
    [form.videoFile, uploadMutation.reset],
  );

  const setField = useCallback(function <K extends keyof ShortFilmUploadForm>(
    key: K,
    value: ShortFilmUploadForm[K],
  ) {
    setForm(function (prev) {
      return { ...prev, [key]: value };
    });
  }, []);

  const toggleGenre = useCallback(function (genre: string) {
    setForm(function (prev) {
      var idx = prev.genres.indexOf(genre);
      if (idx > -1) {
        return {
          ...prev,
          genres: prev.genres.filter(function (g) {
            return g !== genre;
          }),
        };
      }
      if (prev.genres.length >= MAX_GENRES) return prev;
      return { ...prev, genres: prev.genres.concat(genre) };
    });
  }, []);

  const addTag = useCallback(function (raw: string) {
    var tag = raw.trim().replace(/,$/, "");
    if (!tag) return;
    setForm(function (prev) {
      if (prev.tags.indexOf(tag) > -1 || prev.tags.length >= MAX_TAGS) {
        return prev;
      }
      return { ...prev, tags: prev.tags.concat(tag) };
    });
  }, []);

  const removeTag = useCallback(function (tag: string) {
    setForm(function (prev) {
      return {
        ...prev,
        tags: prev.tags.filter(function (t) {
          return t !== tag;
        }),
      };
    });
  }, []);

  const setThumbnail = useCallback(function (file: File) {
    var previewUrl = URL.createObjectURL(file);
    setForm(function (prev) {
      if (prev.thumbnailPreviewUrl) {
        URL.revokeObjectURL(prev.thumbnailPreviewUrl);
      }
      return {
        ...prev,
        thumbnailFile: file,
        thumbnailPreviewUrl: previewUrl,
      };
    });
  }, []);

  const removeThumbnail = useCallback(function () {
    setForm(function (prev) {
      if (prev.thumbnailPreviewUrl) {
        URL.revokeObjectURL(prev.thumbnailPreviewUrl);
      }
      return {
        ...prev,
        thumbnailFile: null,
        thumbnailPreviewUrl: null,
      };
    });
  }, []);

  const setVisibility = useCallback(
    function (visibility: Visibility) {
      setField("visibility", visibility);
    },
    [setField],
  );

  const goToStep = useCallback(function (next: UploadStep) {
    setStep(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const publish = useCallback(
    async function () {
      setError(null);
      try {
        await publishMutation.mutateAsync();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not publish film",
        );
      }
    },
    [publishMutation.mutateAsync],
  );

  const reset = useCallback(
    function () {
      cancelUpload();
      setForm(function (prev) {
        if (prev.thumbnailPreviewUrl) {
          URL.revokeObjectURL(prev.thumbnailPreviewUrl);
        }
        return INITIAL_UPLOAD_FORM;
      });
      setStep(1);
      publishMutation.reset();
      uploadMutation.reset();
      setError(null);
    },
    [cancelUpload],
  );

  const step1Valid = form.videoUploadComplete;
  const step2Valid =
    form.title.trim().length > 2 && form.description.trim().length > 5;
  const step3Valid = form.genres.length > 0;

  const checklist = [
    form.videoUploadComplete,
    step2Valid,
    form.genres.length > 0,
    isPublished,
  ];

  return {
    step,
    form,
    isPublished,
    error,
    processing,
    isPublishing: publishMutation.isPending,
    publishedFilmId: publishMutation.data?.filmId,
    step1Valid,
    step2Valid,
    step3Valid,
    checklist,
    formatFileSize,
    startVideoUpload,
    removeVideo,
    setField,
    toggleGenre,
    addTag,
    removeTag,
    setThumbnail,
    removeThumbnail,
    setVisibility,
    goToStep,
    publish,
    reset,
  };
}

export type ShortFilmUploadFormApi = ReturnType<typeof useShortFilmUploadForm>;
