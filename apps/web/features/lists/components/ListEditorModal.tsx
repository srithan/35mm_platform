"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils/cn";

export type ListEditorValues = {
  title: string;
  description: string;
  visibility: "public" | "private";
  isRanked: boolean;
  tags: string;
};

const EMPTY_VALUES: ListEditorValues = {
  title: "",
  description: "",
  visibility: "public",
  isRanked: false,
  tags: "",
};

type ListEditorModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  listType?: "custom" | "watchlist";
  initialValues?: Partial<ListEditorValues>;
  onSubmit: (values: ListEditorValues) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function ListEditorModal({
  open,
  onClose,
  mode,
  listType = "custom",
  initialValues,
  onSubmit,
  isSubmitting = false,
  error = null,
}: ListEditorModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<ListEditorValues>(EMPTY_VALUES);
  const isWatchlist = listType === "watchlist";

  useEffect(
    function () {
      if (!open) return;
      setValues({
        title: initialValues?.title ?? "",
        description: initialValues?.description ?? "",
        visibility: initialValues?.visibility ?? "public",
        isRanked: initialValues?.isRanked ?? false,
        tags: initialValues?.tags ?? "",
      });
    },
    [open, initialValues]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isWatchlist && !values.title.trim()) return;
    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New list" : isWatchlist ? "Watchlist settings" : "Edit list"}
      description={
        isWatchlist
          ? "Your watchlist title is fixed. You can change visibility here."
          : mode === "create"
            ? "Create a curated collection of films."
            : "Update your list details."
      }
      className="max-w-[480px]"
      initialFocusRef={titleRef}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isWatchlist ? (
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={values.title}
              maxLength={120}
              placeholder="Films that changed how I see light"
              onChange={function (e) {
                setValues(function (prev) {
                  return { ...prev, title: e.target.value };
                });
              }}
              className="w-full rounded-xl border border-border bg-sunken-2 px-4 py-2.5 text-[16px] font-medium outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 md:text-sm dark:bg-elevated"
            />
          </div>
        ) : null}

        {!isWatchlist ? (
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Description
            </label>
            <textarea
              value={values.description}
              maxLength={500}
              rows={3}
              placeholder="What ties these films together?"
              onChange={function (e) {
                setValues(function (prev) {
                  return { ...prev, description: e.target.value };
                });
              }}
              className="w-full resize-y rounded-xl border border-border bg-sunken-2 px-4 py-2.5 text-[16px] font-medium outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 md:text-sm dark:bg-elevated"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            Visibility
          </span>
          <div className="flex gap-2">
            {(["public", "private"] as const).map(function (option) {
              var active = values.visibility === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={function () {
                    setValues(function (prev) {
                      return { ...prev, visibility: option };
                    });
                  }}
                  className={cn(
                    "flex-1 rounded-full border px-3 py-2 text-[13px] font-semibold capitalize transition-colors",
                    active
                      ? "border-fg bg-fg text-bg"
                      : "border-border bg-bg text-fg-muted hover:text-fg"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {!isWatchlist ? (
          <>
            <label className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-fg">
              <input
                type="checkbox"
                checked={values.isRanked}
                onChange={function (e) {
                  setValues(function (prev) {
                    return { ...prev, isRanked: e.target.checked };
                  });
                }}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Show ranked numbers
            </label>

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                Tags
              </label>
              <input
                type="text"
                value={values.tags}
                placeholder="cinematography, festival, noir"
                onChange={function (e) {
                  setValues(function (prev) {
                    return { ...prev, tags: e.target.value };
                  });
                }}
                className="w-full rounded-xl border border-border bg-sunken-2 px-4 py-2.5 text-[16px] font-medium outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 md:text-sm dark:bg-elevated"
              />
            </div>
          </>
        ) : null}

        {error ? <p className="text-[13px] text-accent">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || (!isWatchlist && !values.title.trim())}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Create list" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
