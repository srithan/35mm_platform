export var POLL_MIN_OPTIONS = 2;
export var POLL_MAX_OPTIONS = 10;
export var POLL_MIN_DURATION_MINUTES = 5;
export var POLL_MAX_DURATION_MINUTES = 10 * 24 * 60;

export type PollDraftOption = {
  label: string;
  imageUrl: string;
  imageFile: File | null;
};

export type PollDraft = {
  type: "ranking" | "image";
  durationDays: number;
  durationHours: number;
  durationMinutes: number;
  resultsVisibility: "after_vote" | "after_end";
  options: PollDraftOption[];
};

export function emptyPollOption(): PollDraftOption {
  return { label: "", imageUrl: "", imageFile: null };
}

export function pollTotalMinutes(days: number, hours: number, minutes: number): number {
  return days * 24 * 60 + hours * 60 + minutes;
}

export function isPollDraftValid(draft: PollDraft): boolean {
  var total = pollTotalMinutes(draft.durationDays, draft.durationHours, draft.durationMinutes);
  if (total < POLL_MIN_DURATION_MINUTES || total > POLL_MAX_DURATION_MINUTES) {
    return false;
  }
  if (draft.options.length < POLL_MIN_OPTIONS || draft.options.length > POLL_MAX_OPTIONS) {
    return false;
  }
  return draft.options.every(function (opt) {
    if (draft.type === "ranking") return opt.label.trim().length > 0;
    return opt.imageFile !== null || opt.imageUrl.trim().length > 0;
  });
}

export function formatPollTimeRemaining(endsAt: string, isEnded: boolean): string {
  if (isEnded) return "Final results";
  var end = Date.parse(endsAt);
  if (Number.isNaN(end)) return "";
  var remaining = Math.max(0, end - Date.now());
  if (remaining < 60_000) return "Less than a minute left";
  if (remaining < 3_600_000) {
    var mins = Math.ceil(remaining / 60_000);
    return mins + " minute" + (mins === 1 ? "" : "s") + " left";
  }
  if (remaining < 86_400_000) {
    var hrs = Math.ceil(remaining / 3_600_000);
    return hrs + " hour" + (hrs === 1 ? "" : "s") + " left";
  }
  var days = Math.ceil(remaining / 86_400_000);
  return days + " day" + (days === 1 ? "" : "s") + " left";
}

export function pollCountdownIntervalMs(endsAt: string): number {
  var end = Date.parse(endsAt);
  if (Number.isNaN(end)) return 60_000;
  var remaining = Math.max(0, end - Date.now());
  if (remaining <= 0) return 60_000;
  if (remaining < 120_000) return 10_000;
  if (remaining < 3_600_000) return 30_000;
  return 60_000;
}

export var DAYS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export var HOURS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
export var MINUTES_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
