import {
  adaptSettingsForUI,
  patchAppearance,
  patchNotifications,
  patchPrivacy,
  patchProfile,
} from "./adapters";
import { readMockSettings, writeMockSettings } from "../data/mockSettings";
import type {
  UpdateAppearanceInput,
  UpdateNotificationsInput,
  UpdatePrivacyInput,
  UpdateProfileInput,
  UserSettings,
} from "../types/settings";

export async function getSettings(): Promise<UserSettings> {
  const data = await readMockSettings();
  return adaptSettingsForUI(data);
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UserSettings> {
  const current = await readMockSettings();
  const next = patchProfile(current, input);
  return writeMockSettings(next);
}

export async function updatePrivacy(
  input: UpdatePrivacyInput
): Promise<UserSettings> {
  const current = await readMockSettings();
  const next = patchPrivacy(current, input);
  return writeMockSettings(next);
}

export async function updateNotifications(
  input: UpdateNotificationsInput
): Promise<UserSettings> {
  const current = await readMockSettings();
  const next = patchNotifications(current, input);
  return writeMockSettings(next);
}

export async function updateAppearance(
  input: UpdateAppearanceInput
): Promise<UserSettings> {
  const current = await readMockSettings();
  const next = patchAppearance(current, input);
  return writeMockSettings(next);
}
