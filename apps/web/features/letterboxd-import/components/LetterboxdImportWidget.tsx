"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Film, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatImportCount, posterGradient } from "../lib/letterboxdImportVisual";
import {
  dismissLetterboxdImportWidget,
  readLetterboxdImportRecord,
  shouldShowLetterboxdImportWidget,
} from "../lib/letterboxdImportStorage";
import type { LetterboxdImportRecord } from "../lib/types";
import { LetterboxdImportDialog } from "./LetterboxdImportDialog";

export function LetterboxdImportWidget() {
  var [record, setRecord] = useState<LetterboxdImportRecord | null>(null);
  var [dialogOpen, setDialogOpen] = useState(false);
  var [hydrated, setHydrated] = useState(false);

  var refresh = useCallback(function () {
    setRecord(readLetterboxdImportRecord());
  }, []);

  useEffect(function () {
    refresh();
    setHydrated(true);
  }, [refresh]);

  if (!hydrated || !record || !shouldShowLetterboxdImportWidget(record)) {
    return null;
  }

  var preview = record.preview;
  var isQueued = record.status === "queued" || record.status === "completed";
  var hasPreview = Boolean(preview);

  function openDialog() {
    setDialogOpen(true);
  }

  function dismiss() {
    dismissLetterboxdImportWidget();
    refresh();
  }

  return (
    <>
      <AnimatePresence initial={false}>
        <motion.section
          key="letterboxd-import-widget"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-4 overflow-hidden rounded-xl border border-[#1f7a54]/25 bg-bg shadow-sm"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-2 opacity-80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--bg) 0 7px, transparent 7px 9px, var(--bg) 9px 11px)",
            }}
            aria-hidden
          />

          <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2f22] via-[#143828] to-[#101f19] px-4 pb-4 pt-5 text-white">
            <div
              className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-[#3ecf8e]/20 blur-2xl"
              aria-hidden
            />

            <button
              type="button"
              onClick={dismiss}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss import prompt"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>

            <div className="flex items-start gap-3">
              <div className="relative h-[72px] w-[52px] shrink-0" aria-hidden>
                {[0, 1, 2].map(function (index) {
                  return (
                    <div
                      key={index}
                      className="absolute bottom-0 w-10 rounded-sm shadow-lg ring-1 ring-white/15"
                      style={{
                        left: index * 8,
                        height: 52 - index * 3,
                        transform: "rotate(" + (-8 + index * 7) + "deg)",
                        zIndex: 3 - index,
                        background: posterGradient("widget-" + index),
                      }}
                    />
                  );
                })}
              </div>

              <div className="min-w-0 flex-1 pr-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7dffb8]/90">
                  Letterboxd → 35mm
                </p>
                <h2 className="mt-1 font-display-discover text-[21px] leading-[1.1]">
                  {isQueued && preview
                    ? "Import queued"
                    : "Bring your film history home"}
                </h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/72">
                  {isQueued && preview
                    ? formatImportCount(preview.stats.uniqueFilms) + " films · " + formatImportCount(preview.stats.ratings) + " ratings ready to land on your profile."
                    : "Diary, stars, lists, and reviews — one zip, zero manual re-logging."}
                </p>
              </div>
            </div>

            {hasPreview && preview ? (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: "Films", value: preview.stats.uniqueFilms },
                  { label: "Diary", value: preview.stats.diaryEntries },
                  { label: "Lists", value: preview.stats.lists + (preview.stats.watchlist > 0 ? 1 : 0) },
                ].map(function (chip) {
                  return (
                    <div
                      key={chip.label}
                      className="rounded-lg bg-white/8 px-2 py-1.5 text-center ring-1 ring-white/10 backdrop-blur-sm"
                    >
                      <p className="font-mono text-[13px] font-bold tabular-nums">{formatImportCount(chip.value)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">{chip.label}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5 m-0 p-0 list-none">
                {["Diary & watches", "Star ratings", "Custom lists"].map(function (item) {
                  return (
                    <li key={item} className="flex items-center gap-2 text-[11px] text-white/75">
                      <Sparkles className="h-3 w-3 shrink-0 text-[#7dffb8]" strokeWidth={2} />
                      {item}
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={openDialog}
              className={cn(
                "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[12px] font-bold transition-all",
                isQueued
                  ? "bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/18"
                  : "bg-white text-[#0f2f22] hover:bg-[#eafff4]"
              )}
            >
              {isQueued ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  View import status
                </>
              ) : hasPreview ? (
                <>
                  <Film className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Continue import
                </>
              ) : (
                <>
                  Import my Letterboxd
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </motion.section>
      </AnimatePresence>

      <LetterboxdImportDialog
        open={dialogOpen}
        onClose={function () { setDialogOpen(false); }}
        onStatusChange={refresh}
        initialPreview={preview}
        initialStep={
          record.status === "queued" || record.status === "completed" ? "done" : "main"
        }
      />
    </>
  );
}
