import type { ThemeOption } from "@/lib/theme/ThemeProvider";

export interface ProfileSettings {
  displayName: string;
  username: string;
  email: string;
}

export interface PrivacySettings {
  privateAccount: boolean;
  allowMessagesFromAnyone: boolean;
  showActivityStatus: boolean;
}

export interface NotificationSettings {
  newFollowers: boolean;
  likesOnPosts: boolean;
  commentsAndReplies: boolean;
  mentions: boolean;
  festivalUpdates: boolean;
  watchlistStreaming: boolean;
  emailDigest: boolean;
}

export interface AppearanceSettings {
  theme: ThemeOption;
  videoAutoplay: boolean;
}

export interface UserSettings {
  profile: ProfileSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
}

export type UpdateProfileInput = ProfileSettings;
export type UpdatePrivacyInput = PrivacySettings;
export type UpdateNotificationsInput = NotificationSettings;
export type UpdateAppearanceInput = AppearanceSettings;
