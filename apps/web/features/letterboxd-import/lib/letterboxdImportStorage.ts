import type { LetterboxdImportPreview, LetterboxdImportRecord } from "./types";

var STORAGE_KEY = "35mm:letterboxd-import:v1";

function defaultRecord(): LetterboxdImportRecord {
  return {
    status: "idle",
    preview: null,
    dismissedAt: null,
    queuedAt: null,
    completedAt: null,
  };
}

export function readLetterboxdImportRecord(): LetterboxdImportRecord {
  if (typeof window === "undefined") return defaultRecord();

  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRecord();
    var parsed = JSON.parse(raw) as LetterboxdImportRecord;
    if (!parsed || typeof parsed !== "object") return defaultRecord();
    return {
      status: parsed.status ?? "idle",
      preview: parsed.preview ?? null,
      dismissedAt: parsed.dismissedAt ?? null,
      queuedAt: parsed.queuedAt ?? null,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return defaultRecord();
  }
}

export function writeLetterboxdImportRecord(record: LetterboxdImportRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function dismissLetterboxdImportWidget() {
  var record = readLetterboxdImportRecord();
  record.dismissedAt = new Date().toISOString();
  writeLetterboxdImportRecord(record);
}

export function saveLetterboxdImportPreview(preview: LetterboxdImportPreview) {
  var record = readLetterboxdImportRecord();
  record.status = "preview";
  record.preview = preview;
  record.dismissedAt = null;
  writeLetterboxdImportRecord(record);
}

export function queueLetterboxdImport() {
  var record = readLetterboxdImportRecord();
  record.status = "queued";
  record.queuedAt = new Date().toISOString();
  writeLetterboxdImportRecord(record);
}

export function completeLetterboxdImport() {
  var record = readLetterboxdImportRecord();
  record.status = "completed";
  record.completedAt = new Date().toISOString();
  writeLetterboxdImportRecord(record);
}

export function resetLetterboxdImportRecord() {
  writeLetterboxdImportRecord(defaultRecord());
}

export function shouldShowLetterboxdImportWidget(record: LetterboxdImportRecord) {
  if (record.dismissedAt) return false;
  return true;
}
