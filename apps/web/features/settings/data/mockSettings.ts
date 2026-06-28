import type { UserSettings } from "../types/settings";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    displayName: "Srithan",
    username: "srithan",
    email: "srithan@example.com",
  },
  privacy: {
    privateAccount: false,
    allowMessagesFromAnyone: true,
    showActivityStatus: true,
  },
  notifications: {
    newFollowers: true,
    likesOnPosts: true,
    commentsAndReplies: true,
    mentions: true,
    festivalUpdates: true,
    watchlistStreaming: true,
    emailDigest: false,
    emailPreferences: {
      likesOnPosts: false,
      repostsOnPosts: false,
      newFollowers: true,
      followRequests: true,
      followRequestApproved: true,
      comments: true,
      replies: true,
      mentions: true,
      filmLogged: false,
    },
  },
  appearance: {
    theme: "auto",
    accentColor: "theme",
    videoAutoplay: true,
  },
};

let settingsStore: UserSettings = clone(DEFAULT_SETTINGS);
let forcedFailureMessage: string | null = null;

export async function readMockSettings(): Promise<UserSettings> {
  await delay(250);
  if (forcedFailureMessage) throw new Error(forcedFailureMessage);
  return clone(settingsStore);
}

export async function writeMockSettings(next: UserSettings): Promise<UserSettings> {
  await delay(350);
  if (forcedFailureMessage) throw new Error(forcedFailureMessage);
  settingsStore = clone(next);
  return clone(settingsStore);
}

export function resetMockSettings() {
  settingsStore = clone(DEFAULT_SETTINGS);
  forcedFailureMessage = null;
}

export function setMockSettingsFailure(message: string | null) {
  forcedFailureMessage = message;
}
