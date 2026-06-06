"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { cn } from "@/lib/utils/cn";
import { parseLetterboxdExport } from "../lib/parseLetterboxdExport";
import { formatImportCount, posterGradient } from "../lib/letterboxdImportVisual";
import {
  completeLetterboxdImport,
  queueLetterboxdImport,
  saveLetterboxdImportPreview,
} from "../lib/letterboxdImportStorage";
import type { LetterboxdImportPreview } from "../lib/types";
import styles from "./LetterboxdImportDialog.module.css";

type ImportPhase = "main" | "importing" | "done";

var MODAL_ARIA_LABEL = "Import from Letterboxd";

var EXPORT_LINES = [
  "Letterboxd → Settings → Import & Export",
  'Click "Export Your Data" (they email you a .zip)',
  "Upload that .zip here — diary.csv works too",
];

interface LetterboxdImportDialogProps {
  open: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  initialPreview?: LetterboxdImportPreview | null;
  initialStep?: "main" | "importing" | "done";
}

function resolvePhase(initialStep: ImportPhase | undefined): ImportPhase {
  if (initialStep) return initialStep;
  return "main";
}

function headerCopy(phase: ImportPhase, preview: LetterboxdImportPreview | null) {
  if (phase === "importing") {
    return {
      kicker: "Working",
      title: "Matching your films",
      sub: preview
        ? "Catalog lookup for " + formatImportCount(preview.stats.uniqueFilms) + " titles."
        : "This usually takes a moment.",
    };
  }
  if (phase === "done") {
    return {
      kicker: "Queued",
      title: "Import saved",
      sub: preview
        ? formatImportCount(preview.stats.uniqueFilms) +
          " films will land on your diary as matching finishes."
        : "We'll notify you when it's ready.",
    };
  }
  if (preview) {
    return {
      kicker: "Ready",
      title: "Review your export",
      sub: preview.filename,
    };
  }
  return {
    kicker: "Letterboxd → 35mm",
    title: "Upload your export",
    sub: "Diary, ratings, lists, and reviews — private until you post.",
  };
}

export function LetterboxdImportDialog(props: LetterboxdImportDialogProps) {
  var [phase, setPhase] = useState<ImportPhase>(resolvePhase(props.initialStep));
  var [preview, setPreview] = useState<LetterboxdImportPreview | null>(props.initialPreview ?? null);
  var [parseError, setParseError] = useState<string | null>(null);
  var [isParsing, setIsParsing] = useState(false);
  var [dragActive, setDragActive] = useState(false);
  var fileInputRef = useRef<HTMLInputElement>(null);
  var dragDepthRef = useRef(0);

  useEffect(
    function () {
      if (!props.open) return;
      setPhase(resolvePhase(props.initialStep));
      setPreview(props.initialPreview ?? null);
      setParseError(null);
      dragDepthRef.current = 0;
      setDragActive(false);
    },
    [props.open, props.initialStep, props.initialPreview]
  );

  useEffect(
    function () {
      if (!props.open) return;

      function isInsideModal(target: EventTarget | null) {
        if (!(target instanceof Node)) return false;
        var dialog = document.querySelector('[aria-label="' + MODAL_ARIA_LABEL + '"]');
        return Boolean(dialog && dialog.contains(target));
      }

      function preventBackgroundScroll(ev: Event) {
        if (isInsideModal(ev.target)) return;
        ev.preventDefault();
      }

      document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });

      return function () {
        document.removeEventListener("wheel", preventBackgroundScroll);
        document.removeEventListener("touchmove", preventBackgroundScroll);
      };
    },
    [props.open]
  );

  function handleClose() {
    if (phase === "importing") return;
    setParseError(null);
    dragDepthRef.current = 0;
    setDragActive(false);
    props.onClose();
  }

  var processFile = useCallback(
    async function (file: File) {
      setParseError(null);
      setIsParsing(true);
      try {
        var parsed = await parseLetterboxdExport(file);
        setPreview(parsed);
        saveLetterboxdImportPreview(parsed);
        props.onStatusChange();
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Could not read that file.");
      } finally {
        setIsParsing(false);
        dragDepthRef.current = 0;
        setDragActive(false);
      }
    },
    [props]
  );

  function onFileInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    var file = ev.target.files?.[0];
    if (file) void processFile(file);
    ev.target.value = "";
  }

  function onDragEnter(ev: React.DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function onDragOver(ev: React.DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
  }

  function onDragLeave(ev: React.DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function onDrop(ev: React.DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    var file = ev.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function startImport() {
    if (!preview) return;
    setPhase("importing");

    window.setTimeout(function () {
      queueLetterboxdImport();
      completeLetterboxdImport();
      props.onStatusChange();
      setPhase("done");
    }, 2200);
  }

  var copy = headerCopy(phase, preview);

  return (
    <Modal
      open={props.open}
      onClose={handleClose}
      ariaLabel={MODAL_ARIA_LABEL}
      closeOnEsc={phase !== "importing"}
      closeOnBackdrop={phase !== "importing"}
      lockScroll={false}
      animated={false}
      contentClassName={cn(
        "w-full max-w-[432px] overflow-hidden border-0 bg-transparent p-0 shadow-none",
        styles.shell
      )}
    >
      <div className={styles.header}>
        <div className={styles.headerGlow} aria-hidden />
        <button
          type="button"
          onClick={handleClose}
          disabled={phase === "importing"}
          className={styles.closeBtn}
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        <p className={styles.kicker}>{copy.kicker}</p>
        <h2 className={styles.title}>{copy.title}</h2>
        <p className={styles.sub}>{copy.sub}</p>
      </div>

      <div className={styles.body}>
        {phase === "main" ? (
          <>
            {!preview ? (
              <>
                <button
                  type="button"
                  disabled={isParsing}
                  onDragEnter={onDragEnter}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={function () {
                    fileInputRef.current?.click();
                  }}
                  className={cn(
                    styles.dropzone,
                    dragActive && styles.dropzoneActive,
                    isParsing && styles.dropzoneDisabled
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.csv,application/zip,text/csv"
                    className="sr-only"
                    onChange={onFileInputChange}
                  />
                  {isParsing ? (
                    <Loader2 className="mb-1 h-5 w-5 animate-spin text-fg-muted" strokeWidth={2} />
                  ) : (
                    <p className={styles.dropzoneType}>.zip or .csv</p>
                  )}
                  <p className={styles.dropzonePrimary}>
                    {isParsing ? "Reading export…" : "Drop file or click to browse"}
                  </p>
                  <p className={styles.dropzoneSecondary}>Letterboxd data export archive</p>
                </button>

                {parseError ? <p className={styles.error}>{parseError}</p> : null}

                <div className={styles.footer}>
                  <details className={styles.details}>
                    <summary className={styles.detailsSummary}>
                      How to export from Letterboxd
                      <ChevronDown className={styles.detailsChevron} size={14} strokeWidth={2.25} />
                    </summary>
                    <ol className={styles.detailsList}>
                      {EXPORT_LINES.map(function (line, index) {
                        return (
                          <li key={line} className={styles.detailsItem}>
                            <span className={styles.detailsIndex}>{index + 1}.</span>
                            <span>{line}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                </div>
              </>
            ) : (
              <div className={styles.doneWrap}>
                <div className={styles.previewFileRow}>
                  <p className={styles.previewFilename}>{preview.filename}</p>
                  <button
                    type="button"
                    onClick={function () {
                      setPreview(null);
                      setParseError(null);
                    }}
                    className={styles.replaceBtn}
                  >
                    Replace
                  </button>
                </div>

                <p className={styles.statsLine}>
                  {formatImportCount(preview.stats.uniqueFilms)} films
                  <span className={styles.statsMuted}>
                    {" "}
                    · {formatImportCount(preview.stats.diaryEntries)} diary ·{" "}
                    {formatImportCount(preview.stats.ratings)} ratings
                  </span>
                  {preview.stats.lists + preview.stats.watchlist + preview.stats.reviews > 0 ? (
                    <span className={styles.statsMuted}>
                      {" "}
                      · {formatImportCount(preview.stats.lists + (preview.stats.watchlist > 0 ? 1 : 0))}{" "}
                      lists
                      {preview.stats.reviews > 0
                        ? " · " + formatImportCount(preview.stats.reviews) + " reviews"
                        : ""}
                    </span>
                  ) : null}
                </p>

                <ul className={styles.filmList}>
                  {preview.sampleFilms.map(function (film, index) {
                    return (
                      <li
                        key={film.name + "-" + String(film.year) + "-" + index}
                        className={styles.filmRow}
                      >
                        <div
                          className={styles.filmPoster}
                          style={{ background: posterGradient(film.name) }}
                          aria-hidden
                        />
                        <div className={styles.filmMeta}>
                          <p className={styles.filmTitle}>{film.name}</p>
                          <p className={styles.filmSub}>
                            {film.year ?? "—"}
                            {film.rating != null ? " · ★" + film.rating : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <p className={styles.previewNote}>
                  Unmatched titles stay as drafts. Nothing is public until you share it.
                </p>

                <button type="button" onClick={startImport} className={styles.importBtn}>
                  Import to 35mm
                </button>
              </div>
            )}
          </>
        ) : null}

        {phase === "importing" ? (
          <div className={styles.working}>
            <Loader2 className="h-5 w-5 animate-spin text-fg-muted" strokeWidth={2} />
            <p className={styles.workingText}>Resolving titles against 35mm catalog…</p>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className={styles.doneWrap}>
            <div className={styles.doneCard}>
              <span className={styles.doneIcon}>
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <p className={styles.doneText}>
                Your history is queued. Posters and credits fill in as each film matches — check
                your diary in a few minutes.
              </p>
            </div>
            <button type="button" onClick={handleClose} className={styles.closeFooterBtn}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
