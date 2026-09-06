"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";
import { Check, ChevronDown, Film, Globe2, Hash, ListOrdered, Lock } from "lucide-react";

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
  const id = useId();
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
    if (isSubmitting || (!isWatchlist && !values.title.trim())) return;
    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    });
  }

  function closeEditor() {
    if (!isSubmitting) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={closeEditor}
      title={mode === "create" ? "Create list" : isWatchlist ? "Watchlist settings" : "Edit list"}
      className="max-w-[560px]"
      headerClassName="border-b-0 px-6 pb-4 pt-5 sm:px-8 sm:pt-6"
      titleClassName="text-[24px] font-semibold leading-tight tracking-tight text-fg sm:text-[26px]"
      contentClassName="flex min-h-0 flex-col overflow-hidden p-0 sm:p-0"
      initialFocusRef={titleRef}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-busy={isSubmitting}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset disabled={isSubmitting} className="min-w-0 px-6 pb-6 pt-4 sm:px-8 disabled:opacity-60">
          {!isWatchlist ? (
            <>
              <label htmlFor={id + "-title"} className="sr-only">List title</label>
              <input
                id={id + "-title"}
                ref={titleRef}
                type="text"
                required
                value={values.title}
                maxLength={120}
                placeholder="Name your list"
                onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-sm border-0 bg-transparent py-2 font-display text-[24px] leading-tight tracking-tight text-fg placeholder:text-fg-muted/60 outline-none focus-visible:shadow-[inset_0_-1px_0_var(--fg-muted)] sm:text-[28px]"
              />
              <label htmlFor={id + "-description"} className="sr-only">Description (optional)</label>
              <textarea
                id={id + "-description"}
                value={values.description}
                maxLength={500}
                rows={3}
                placeholder="What brings these films together? Add a description…"
                onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-3 block max-h-48 min-h-24 w-full resize-y rounded-sm border-0 bg-transparent py-2 text-[16px] leading-relaxed text-fg placeholder:text-fg-muted outline-none focus-visible:shadow-[inset_0_-1px_0_var(--fg-muted)] sm:text-[14px]"
              />
            </>
          ) : (
            <p className="pb-5 text-[14px] leading-relaxed text-fg-muted">Choose who can see your watchlist. Its name stays the same.</p>
          )}

          <fieldset className="mt-5 rounded-3xl bg-sunken p-4">
            <legend className="sr-only">Visibility</legend>
            <p className="mb-3 text-[13px] font-semibold text-fg">Who can see this list?</p>
            <div className="grid grid-cols-2 gap-3">
              {(["public", "private"] as const).map((option) => {
                const Icon = option === "public" ? Globe2 : Lock;
                return (
                  <label key={option} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name={id + "-visibility"}
                      value={option}
                      checked={values.visibility === option}
                      onChange={() => setValues((prev) => ({ ...prev, visibility: option }))}
                      className="peer sr-only"
                    />
                    <span className="flex h-full flex-col gap-3 rounded-2xl border border-transparent p-3.5 text-fg-muted transition-colors hover:bg-elevated peer-checked:border-fg peer-checked:bg-elevated peer-checked:text-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg peer-disabled:cursor-wait">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sunken">
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold">{option === "public" ? "Public" : "Private"}</span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-fg-muted">{option === "public" ? "Anyone can explore it" : "Only you can see it"}</span>
                      </span>
                    </span>
                    <span aria-hidden className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-elevated text-transparent peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {!isWatchlist ? (
            <>
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-sunken p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-fg-muted"><ListOrdered className="h-[18px] w-[18px]" aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold text-fg">Rank this list</span>
                  <span className="mt-0.5 block text-[12px] text-fg-muted">Number films in your chosen order.</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Rank this list"
                  checked={values.isRanked}
                  onChange={(event) => setValues((prev) => ({ ...prev, isRanked: event.target.checked }))}
                  className="peer sr-only"
                />
                <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-border-strong transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-social-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:after:transition-none" />
              </label>

              <details key={String(open)} open={Boolean(initialValues?.tags)} className="group mt-3 rounded-2xl border border-border px-4 open:pb-4">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl text-[13px] font-medium text-fg hover:text-fg-light focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                  <Hash className="h-4 w-4 text-fg-muted" aria-hidden />
                  Tags <span className="text-[11px] font-normal text-fg-muted">Optional</span>
                  <ChevronDown className="ml-auto h-3.5 w-3.5 group-open:rotate-180" aria-hidden />
                </summary>
                <label htmlFor={id + "-tags"} className="sr-only">Tags</label>
                <input
                  id={id + "-tags"}
                  type="text"
                  value={values.tags}
                  placeholder="Noir, cinematography, favourites"
                  aria-describedby={id + "-tags-hint"}
                  onChange={(event) => setValues((prev) => ({ ...prev, tags: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-sunken px-3 py-2.5 text-[16px] text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] sm:text-[13px]"
                />
                <p id={id + "-tags-hint"} className="mt-2 text-[11px] text-fg-muted">Separate tags with commas.</p>
              </details>
            </>
          ) : null}
        </fieldset>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 sm:px-8">
          {error ? <p role="alert" className="mb-3 text-[13px] text-accent">{error}</p> : null}
          <div className="flex flex-col gap-4">
            <span className="flex items-center justify-center gap-2 text-[12px] text-fg-muted"><Film className="h-3.5 w-3.5" aria-hidden />{mode === "create" ? "Next, add the films that belong here." : "Your films stay in this list."}</span>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={closeEditor} disabled={isSubmitting} className="h-11">Cancel</Button>
              <Button type="submit" disabled={isSubmitting || (!isWatchlist && !values.title.trim())} className="h-11 focus-visible:outline-accent disabled:border-border-strong disabled:bg-sunken disabled:text-fg-muted disabled:opacity-100">
                {isSubmitting ? "Saving…" : mode === "create" ? "Create list" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
