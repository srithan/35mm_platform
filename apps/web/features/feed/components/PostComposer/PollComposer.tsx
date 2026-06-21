"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";
import {
  emptyPollOption,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  DAYS_OPTIONS,
  HOURS_OPTIONS,
  MINUTES_OPTIONS,
  type PollDraft,
  type PollDraftOption,
} from "../../utils/pollUtils";

interface PollComposerProps {
  draft: PollDraft;
  isValid: boolean;
  onChange: (draft: PollDraft) => void;
  onRemove: () => void;
}

export function PollComposer({ draft, isValid, onChange, onRemove }: PollComposerProps) {
  var previewUrlsRef = useRef<Map<number, string>>(new Map());

  // Auto-detect poll type based on whether any images are added
  var hasAnyImages = draft.options.some(function (opt) {
    return opt.imageFile !== null || (opt.imageUrl && !opt.imageUrl.startsWith("blob:"));
  });

  // Update type when images change
  useEffect(function () {
    var newType: "image" | "ranking" = hasAnyImages ? "image" : "ranking";
    if (draft.type !== newType) {
      onChange({ ...draft, type: newType });
    }
  }, [hasAnyImages, draft, onChange]);

  useEffect(function () {
    return function () {
      previewUrlsRef.current.forEach(function (url) {
        URL.revokeObjectURL(url);
      });
      previewUrlsRef.current.clear();
    };
  }, []);

  var updateOption = useCallback(
    function (index: number, patch: Partial<PollDraftOption>) {
      onChange({
        ...draft,
        options: draft.options.map(function (opt, i) {
          return i === index ? { ...opt, ...patch } : opt;
        }),
      });
    },
    [draft, onChange]
  );

  var addOption = useCallback(
    function () {
      if (draft.options.length >= POLL_MAX_OPTIONS) return;
      onChange({ ...draft, options: [...draft.options, emptyPollOption()] });
    },
    [draft, onChange]
  );

  var removeOption = useCallback(
    function (index: number) {
      if (draft.options.length <= POLL_MIN_OPTIONS) return;
      previewUrlsRef.current.delete(index);
      onChange({
        ...draft,
        options: draft.options.filter(function (_, i) {
          return i !== index;
        }),
      });
    },
    [draft, onChange]
  );

  var clearImage = useCallback(
    function (index: number) {
      if (previewUrlsRef.current.has(index)) {
        URL.revokeObjectURL(previewUrlsRef.current.get(index)!);
        previewUrlsRef.current.delete(index);
      }
      updateOption(index, { imageFile: null, imageUrl: "" });
    },
    [updateOption]
  );

  function getPreviewUrl(index: number, option: PollDraftOption): string | null {
    if (option.imageUrl) return option.imageUrl;
    if (!option.imageFile) return null;
    if (!previewUrlsRef.current.has(index)) {
      previewUrlsRef.current.set(index, URL.createObjectURL(option.imageFile));
    }
    return previewUrlsRef.current.get(index) || null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-border overflow-hidden">
      {/* Options */}
      <div className="divide-y divide-border">
        {draft.options.map(function (option, index) {
          var previewUrl = getPreviewUrl(index, option);
          var hasImage = previewUrl !== null;

          return (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              {/* Image upload */}
              <label className="relative shrink-0 cursor-pointer group">
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors",
                    hasImage ? "border-transparent" : "border-border hover:border-accent/50"
                  )}
                >
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="image" className="w-4 h-4 text-fg-muted" strokeWidth={1.5} />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={function (e) {
                    var file = e.target.files?.[0];
                    if (!file) return;
                    var url = URL.createObjectURL(file);
                    previewUrlsRef.current.set(index, url);
                    updateOption(index, { imageFile: file, imageUrl: url });
                    e.target.value = "";
                  }}
                />
                {/* Remove image button */}
                {hasImage ? (
                  <button
                    type="button"
                    onClick={function (e) {
                      e.preventDefault();
                      e.stopPropagation();
                      clearImage(index);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fg text-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="x" className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                ) : null}
              </label>

              <input
                type="text"
                value={option.label}
                onChange={function (e) {
                  updateOption(index, { label: e.target.value });
                }}
                placeholder={"Choice " + (index + 1)}
                className="flex-1 min-w-0 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
              />

              {draft.options.length > POLL_MIN_OPTIONS ? (
                <button
                  type="button"
                  onClick={function () {
                    removeOption(index);
                  }}
                  className="shrink-0 text-fg-muted hover:text-accent transition-colors"
                  aria-label="Remove"
                >
                  <Icon name="x" className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          );
        })}

        {/* Add option row */}
        {draft.options.length < POLL_MAX_OPTIONS ? (
          <button
            type="button"
            onClick={addOption}
            className="flex w-full items-center px-4 py-3 text-[15px] text-accent hover:bg-accent/5 transition-colors"
          >
            <Icon name="plus" className="w-4 h-4 mr-2" strokeWidth={2} />
            Add another choice
          </button>
        ) : null}
      </div>

      {/* Duration section */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-fg-muted">Poll length</span>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <select
                value={draft.durationDays}
                onChange={function (e) {
                  onChange({ ...draft, durationDays: Number(e.target.value) });
                }}
                className="w-14 rounded-lg border border-border bg-bg px-2 py-1.5 text-[14px] text-fg text-center outline-none focus:border-accent cursor-pointer"
              >
                {DAYS_OPTIONS.map(function (d) {
                  return (
                    <option key={d} value={d}>{d}</option>
                  );
                })}
              </select>
              <span className="text-[11px] text-fg-muted mt-1">Days</span>
            </div>

            <div className="flex flex-col items-center">
              <select
                value={draft.durationHours}
                onChange={function (e) {
                  onChange({ ...draft, durationHours: Number(e.target.value) });
                }}
                className="w-14 rounded-lg border border-border bg-bg px-2 py-1.5 text-[14px] text-fg text-center outline-none focus:border-accent cursor-pointer"
              >
                {HOURS_OPTIONS.map(function (h) {
                  return (
                    <option key={h} value={h}>{h}</option>
                  );
                })}
              </select>
              <span className="text-[11px] text-fg-muted mt-1">Hours</span>
            </div>

            <div className="flex flex-col items-center">
              <select
                value={draft.durationMinutes}
                onChange={function (e) {
                  onChange({ ...draft, durationMinutes: Number(e.target.value) });
                }}
                className="w-14 rounded-lg border border-border bg-bg px-2 py-1.5 text-[14px] text-fg text-center outline-none focus:border-accent cursor-pointer"
              >
                {MINUTES_OPTIONS.map(function (m) {
                  return (
                    <option key={m} value={m}>{m}</option>
                  );
                })}
              </select>
              <span className="text-[11px] text-fg-muted mt-1">Minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results visibility */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-fg-muted">Show results</span>
          <select
            value={draft.resultsVisibility}
            onChange={function (e) {
              onChange({ ...draft, resultsVisibility: e.target.value as "after_vote" | "after_end" });
            }}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 text-[14px] text-fg outline-none focus:border-accent cursor-pointer"
          >
            <option value="after_vote">After voting</option>
            <option value="after_end">When poll ends</option>
          </select>
        </div>
      </div>

      {/* Remove poll */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={onRemove}
          className="w-full px-4 py-2.5 text-[14px] text-film-red hover:bg-film-red/5 transition-colors"
        >
          Remove poll
        </button>
      </div>
    </div>
  );
}
