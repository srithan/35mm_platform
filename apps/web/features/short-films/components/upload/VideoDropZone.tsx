"use client";

import { useCallback, useRef, useState } from "react";
import { Film, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_RUNTIME_MINUTES,
  MAX_VIDEO_SIZE_GB,
} from "./constants";
import type { ShortFilmUploadFormApi } from "./useShortFilmUploadForm";

export function VideoDropZone({ upload }: { upload: ShortFilmUploadFormApi }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { form, startVideoUpload, removeVideo, formatFileSize } = upload;

  const handleFiles = useCallback(
    function (files: FileList | null) {
      var file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) return;
      startVideoUpload(file);
    },
    [startVideoUpload]
  );

  if (form.videoFile) {
    var uploading = !form.videoUploadComplete;
    return (
      <div className="overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.06] animate-fade-up">
        <div className="flex items-center gap-3.5 p-4 sm:p-5">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/80 to-accent text-white shadow-md">
            <Film className="h-[22px] w-[22px]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-fg">
              {form.videoFile.name}
            </p>
            <p className="mt-0.5 text-[12px] text-fg-muted">
              {formatFileSize(form.videoFile.size)}
              {uploading ? " · Uploading…" : " · Ready"}
            </p>
          </div>
          <button
            type="button"
            onClick={removeVideo}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-fg-muted transition hover:bg-accent/15 hover:text-accent"
            aria-label="Remove video"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-accent/20">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-accent to-[#e06b52] transition-all duration-300",
                form.videoUploadComplete ? "" : "shadow-[0_0_8px_rgba(200,67,42,0.35)]"
              )}
              style={{ width: form.videoUploadProgress + "%" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="text-fg-muted">
              {form.videoUploadComplete ? "Upload complete" : "Uploading…"}
            </span>
            <span className="font-bold tabular-nums text-accent">
              {form.videoUploadProgress}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={function () {
          inputRef.current?.click();
        }}
        onKeyDown={function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={function (e) {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={function () {
          setDragOver(false);
        }}
        onDrop={function (e) {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 sm:py-14",
          dragOver
            ? "scale-[1.01] border-accent bg-accent/[0.06]"
            : "border-border-strong bg-sunken hover:border-accent/50 hover:bg-accent/[0.04]"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
            "bg-[radial-gradient(ellipse_at_center,rgba(200,67,42,0.06)_0%,transparent_70%)]",
            dragOver ? "opacity-100" : "group-hover:opacity-100"
          )}
          aria-hidden
        />
        <div
          className={cn(
            "relative mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-elevated text-accent shadow-md transition-all duration-300",
            dragOver
              ? "bg-fg text-bg shadow-lg shadow-[color-mix(in_srgb,var(--fg)_25%,transparent)]"
              : "group-hover:bg-fg group-hover:text-bg group-hover:shadow-lg group-hover:shadow-[color-mix(in_srgb,var(--fg)_25%,transparent)]"
          )}
        >
          <Upload className="h-[30px] w-[30px] transition-colors" strokeWidth={1.6} aria-hidden />
        </div>
        <p className="relative text-[18px] font-bold text-fg">Drop your film here</p>
        <p className="relative mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-fg-muted">
          Drag and drop or browse from your device
          <br />
          Up to <strong className="font-semibold text-fg">{MAX_VIDEO_SIZE_GB} GB</strong>
          {" · "}
          Max <strong className="font-semibold text-fg">{MAX_RUNTIME_MINUTES} min</strong>
        </p>
        <button
          type="button"
          onClick={function (e) {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-[14px] font-semibold text-bg shadow-md transition hover:opacity-90 hover:-translate-y-px"
        >
          <Upload className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          Choose file
        </button>
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {ACCEPTED_VIDEO_EXTENSIONS.map(function (ext) {
            return (
              <span
                key={ext}
                className="rounded-md border border-border-strong bg-elevated px-2 py-0.5 text-[11px] font-semibold tracking-wide text-fg-faint"
              >
                {ext}
              </span>
            );
          })}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={function (e) {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
