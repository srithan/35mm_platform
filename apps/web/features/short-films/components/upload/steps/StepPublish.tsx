"use client";

import { useRef } from "react";
import {
  ArrowLeft,
  Globe,
  ImageIcon,
  Link2,
  Lock,
  Play,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  CharCount,
  UploadFormField,
  uploadInputClass,
} from "../UploadFormField";
import { VISIBILITY_OPTIONS } from "../constants";
import type { ShortFilmUploadFormApi } from "../useShortFilmUploadForm";
import type { Visibility } from "../types";

var VISIBILITY_ICONS: Record<Visibility, typeof Globe> = {
  public: Globe,
  unlisted: Link2,
  private: Lock,
};

export function StepPublish({ upload }: { upload: ShortFilmUploadFormApi }) {
  var form = upload.form;
  var thumbInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm sm:p-7">
      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
        Step 4 — Thumbnail & publish
      </p>

      <UploadFormField label="Thumbnail image">
        {form.thumbnailPreviewUrl ? (
          <div className="group relative aspect-video overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.thumbnailPreviewUrl}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={upload.removeThumbnail}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove thumbnail"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={function () {
              thumbInputRef.current?.click();
            }}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-sunken transition hover:border-accent/50 hover:bg-accent/[0.04]"
          >
            <ImageIcon className="h-8 w-8 text-fg-faint" strokeWidth={1.5} aria-hidden />
            <span className="text-[13px] font-semibold text-fg-muted">
              Click to upload thumbnail
            </span>
            <span className="text-[11px] text-fg-faint">
              JPG, PNG, WebP · 16:9 ratio · Min 1280×720
            </span>
          </button>
        )}
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={function (e) {
            var file = e.target.files?.[0];
            if (file) upload.setThumbnail(file);
            e.target.value = "";
          }}
        />
      </UploadFormField>

      <div className="my-6 h-px bg-border" />

      <UploadFormField label="Visibility">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {VISIBILITY_OPTIONS.map(function (option) {
            var selected = form.visibility === option.value;
            var Icon = VISIBILITY_ICONS[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={function () {
                  upload.setVisibility(option.value);
                }}
                className={cn(
                  "rounded-xl border px-3 py-3.5 text-center transition-all duration-200",
                  selected
                    ? "border-accent bg-accent/[0.08] ring-[3px] ring-accent/10"
                    : "border-border-strong bg-elevated hover:border-accent/50 hover:bg-accent/[0.04]"
                )}
              >
                <span
                  className={cn(
                    "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors",
                    selected ? "bg-accent text-white" : "bg-sunken text-fg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="block text-[13px] font-semibold text-fg">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-faint">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </UploadFormField>

      <div className="my-6 h-px bg-border" />

      <UploadFormField
        label="Schedule release"
        optional
        hint="Leave blank to publish immediately"
      >
        <input
          type="datetime-local"
          value={form.scheduleRelease}
          onChange={function (e) {
            upload.setField("scheduleRelease", e.target.value);
          }}
          className={uploadInputClass()}
        />
      </UploadFormField>

      <UploadFormField label="Festival / awards notes" optional>
        <input
          type="text"
          value={form.festivalNotes}
          maxLength={200}
          placeholder="e.g. Sundance 2024 Official Selection"
          onChange={function (e) {
            upload.setField("festivalNotes", e.target.value);
          }}
          className={uploadInputClass()}
        />
        <CharCount current={form.festivalNotes.length} max={200} />
      </UploadFormField>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={function () {
            upload.goToStep(3);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong px-4 py-3 text-[14px] font-semibold text-fg-muted transition hover:border-transparent hover:bg-sunken hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Back
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-sunken px-5 py-3 text-[14px] font-semibold text-fg-muted transition hover:bg-sunken-2 hover:text-fg"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Save draft
          </button>
          <button
            type="button"
            onClick={upload.publish}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-6 py-3.5 text-[15px] font-bold text-bg shadow-lg shadow-fg/10 transition hover:-translate-y-0.5 hover:opacity-90"
          >
            <Play className="h-4 w-4 fill-current" strokeWidth={2.2} aria-hidden />
            Publish film
          </button>
        </div>
      </div>
    </div>
  );
}
