import type {
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  ProfileSettings,
  UserSettings,
} from "../types/settings";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function adaptSettingsForUI(settings: UserSettings): UserSettings {
  return clone(settings);
}

export function patchProfile(
  settings: UserSettings,
  profile: ProfileSettings
): UserSettings {
  return { ...settings, profile: clone(profile) };
}

export function patchPrivacy(
  settings: UserSettings,
  privacy: PrivacySettings
): UserSettings {
  return { ...settings, privacy: clone(privacy) };
}

export function patchNotifications(
  settings: UserSettings,
  notifications: NotificationSettings
): UserSettings {
  return { ...settings, notifications: clone(notifications) };
}

export function patchAppearance(
  settings: UserSettings,
  appearance: AppearanceSettings
): UserSettings {
  return { ...settings, appearance: clone(appearance) };
}
