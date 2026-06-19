"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INITIAL_UPLOAD_FORM,
  type ShortFilmUploadForm,
  type UploadStep,
  type Visibility,
} from "./types";
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
  const [isPublished, setIsPublished] = useState(false);
  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(function () {
    return function () {
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
      }
    };
  }, []);

  const clearUploadTimer = useCallback(function () {
    if (uploadTimerRef.current) {
      clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
  }, []);

  const startVideoUpload = useCallback(
    function (file: File) {
      clearUploadTimer();
      setForm(function (prev) {
        return {
          ...prev,
          videoFile: file,
          videoUploadProgress: 0,
          videoUploadComplete: false,
        };
      });

      var pct = 0;
      uploadTimerRef.current = setInterval(function () {
        pct += Math.floor(Math.random() * 9) + 3;
        if (pct >= 100) {
          pct = 100;
          clearUploadTimer();
          setForm(function (prev) {
            return {
              ...prev,
              videoUploadProgress: 100,
              videoUploadComplete: true,
            };
          });
        } else {
          setForm(function (prev) {
            return { ...prev, videoUploadProgress: pct };
          });
        }
      }, 160);
    },
    [clearUploadTimer]
  );

  const removeVideo = useCallback(
    function () {
      clearUploadTimer();
      setForm(function (prev) {
        return {
          ...prev,
          videoFile: null,
          videoUploadProgress: 0,
          videoUploadComplete: false,
        };
      });
    },
    [clearUploadTimer]
  );

  const setField = useCallback(function <K extends keyof ShortFilmUploadForm>(
    key: K,
    value: ShortFilmUploadForm[K]
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

  const setVisibility = useCallback(function (visibility: Visibility) {
    setField("visibility", visibility);
  }, [setField]);

  const goToStep = useCallback(function (next: UploadStep) {
    setStep(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const publish = useCallback(function () {
    setIsPublished(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const reset = useCallback(function () {
    clearUploadTimer();
    setForm(function (prev) {
      if (prev.thumbnailPreviewUrl) {
        URL.revokeObjectURL(prev.thumbnailPreviewUrl);
      }
      return INITIAL_UPLOAD_FORM;
    });
    setStep(1);
    setIsPublished(false);
  }, [clearUploadTimer]);

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
