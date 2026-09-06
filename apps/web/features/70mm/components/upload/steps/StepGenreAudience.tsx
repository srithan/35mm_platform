"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UploadFormField } from "../UploadFormField";
import {
  CONTENT_RATINGS,
  MAX_GENRES,
  SHORT_FILM_GENRES,
} from "../constants";
import type { ShortFilmUploadFormApi } from "../useShortFilmUploadForm";

export function StepGenreAudience({ upload }: { upload: ShortFilmUploadFormApi }) {
  var form = upload.form;
  var tagInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm sm:p-7">
      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
        Step 3 — Genre & audience
      </p>

      <UploadFormField
        label="Genre"
        required
        hint={"Pick up to " + MAX_GENRES}
      >
        <div className="flex flex-wrap gap-2">
          {SHORT_FILM_GENRES.map(function (genre) {
            var selected = form.genres.indexOf(genre) > -1;
            return (
              <button
                key={genre}
                type="button"
                onClick={function () {
                  upload.toggleGenre(genre);
                }}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
                  selected
                    ? "border-accent bg-accent text-white shadow-md shadow-accent/25 -translate-y-px"
                    : "border-border-strong bg-elevated text-fg-muted hover:border-accent/50 hover:bg-accent/[0.06] hover:text-accent"
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </UploadFormField>

      <div className="my-6 h-px bg-border" />

      <UploadFormField label="Content rating">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CONTENT_RATINGS.map(function (rating) {
            var selected = form.contentRating === rating.code;
            return (
              <button
                key={rating.code}
                type="button"
                onClick={function () {
                  upload.setField("contentRating", rating.code);
                }}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center transition-all duration-200",
                  selected
                    ? "border-accent bg-accent/[0.08] ring-[3px] ring-accent/10"
                    : "border-border-strong bg-elevated hover:border-accent/50 hover:bg-accent/[0.04]"
                )}
              >
                <span
                  className={cn(
                    "block text-[18px] font-extrabold tracking-tight",
                    selected ? "text-accent" : "text-fg"
                  )}
                >
                  {rating.code}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-fg-faint">
                  {rating.label}
                </span>
              </button>
            );
          })}
        </div>
      </UploadFormField>

      <div className="my-6 h-px bg-border" />

      <UploadFormField label="Tags" hint="Press Enter to add">
        <div
          className="flex min-h-[48px] flex-wrap gap-1.5 rounded-xl border border-transparent bg-sunken px-3 py-2 transition focus-within:border-accent/40 focus-within:bg-elevated focus-within:ring-[3px] focus-within:ring-accent/10"
          onClick={function () {
            tagInputRef.current?.focus();
          }}
        >
          {form.tags.map(function (tag) {
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-accent/25 bg-accent/10 px-2.5 py-1 text-[12px] font-semibold text-accent"
              >
                {tag}
                <button
                  type="button"
                  onClick={function (e) {
                    e.stopPropagation();
                    upload.removeTag(tag);
                  }}
                  className="opacity-60 transition hover:opacity-100"
                  aria-label={"Remove tag " + tag}
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
          <input
            ref={tagInputRef}
            type="text"
            placeholder="e.g. indie, dystopian, award-winning"
            className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[13px] text-fg placeholder:text-fg-faint focus:outline-none"
            onKeyDown={function (e) {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                upload.addTag(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      </UploadFormField>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
        <button
          type="button"
          onClick={function () {
            upload.goToStep(2);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-4 py-3 text-[14px] font-semibold text-fg-muted transition hover:border-transparent hover:bg-sunken hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Back
        </button>
        <button
          type="button"
          disabled={!upload.step3Valid}
          onClick={function () {
            upload.goToStep(4);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-[14px] font-bold text-bg shadow-md transition enabled:hover:bg-accent enabled:hover:shadow-lg enabled:hover:shadow-accent/25 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
