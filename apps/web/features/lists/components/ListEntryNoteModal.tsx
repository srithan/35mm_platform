"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";

type ListEntryNoteModalProps = {
  open: boolean;
  onClose: () => void;
  filmTitle: string;
  initialNote?: string;
  submitLabel?: string;
  onSubmit: (note: string | null) => void;
  isSubmitting?: boolean;
};

export function ListEntryNoteModal({
  open,
  onClose,
  filmTitle,
  initialNote = "",
  submitLabel = "Add film",
  onSubmit,
  isSubmitting = false,
}: ListEntryNoteModalProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState(initialNote);

  useEffect(
    function () {
      if (!open) return;
      setNote(initialNote);
    },
    [open, initialNote]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a note"
      description={filmTitle}
      className="max-w-[440px]"
      initialFocusRef={noteRef}
    >
      <form
        onSubmit={function (e) {
          e.preventDefault();
          onSubmit(note.trim() || null);
        }}
        className="space-y-4"
      >
        <textarea
          ref={noteRef}
          value={note}
          rows={4}
          maxLength={280}
          placeholder="Why is this film on your list?"
          onChange={function (e) {
            setNote(e.target.value);
          }}
          className="w-full resize-y rounded-xl border border-border bg-sunken-2 px-4 py-2.5 text-[16px] font-medium outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 md:text-sm dark:bg-elevated"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
