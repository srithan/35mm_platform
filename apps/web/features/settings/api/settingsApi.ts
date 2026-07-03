import type {
  UpdateAppearanceInput,
  UpdateNotificationsInput,
  UpdatePrivacyInput,
  UpdateProfileInput,
  UserSettings,
} from "../types/settings";
import { apiRequest } from "@/features/feed/api/http";

export type UsernameAvailabilityResponse = {
  available: boolean;
  reason?: string;
};

export async function checkUsernameAvailability(
  username: string
): Promise<UsernameAvailabilityResponse> {
  return apiRequest<UsernameAvailabilityResponse>(
    "/v1/usernames/" + encodeURIComponent(username.trim().toLowerCase()) + "/available"
  );
}

export async function getSettings(token: string | null): Promise<UserSettings> {
  const data = await apiRequest<Pick<UserSettings, "profile" | "privacy" | "notifications" | "appearance">>(
    "/v1/me/settings",
    {
      method: "GET",
      token,
    }
  );

  return data;
}

export async function updateProfile(
  input: UpdateProfileInput,
  token: string | null
): Promise<UserSettings> {
  return apiRequest<UserSettings>("/v1/me/settings/profile", {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function updatePrivacy(
  input: UpdatePrivacyInput,
  token: string | null
): Promise<UserSettings> {
  if (input.privateAccount !== undefined) {
    await apiRequest<{ ok: boolean }>("/v1/profiles/me", {
      method: "PATCH",
      token,
      body: { isPrivate: input.privateAccount },
    });
  }

  return apiRequest<UserSettings>("/v1/me/settings/privacy", {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function updateNotifications(
  input: UpdateNotificationsInput,
  token: string | null
): Promise<UserSettings> {
  return apiRequest<UserSettings>("/v1/me/settings/notifications", {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function updateAppearance(
  input: UpdateAppearanceInput,
  token: string | null
): Promise<UserSettings> {
  return apiRequest<UserSettings>("/v1/me/settings/appearance", {
    method: "PATCH",
    token,
    body: input,
  });
}
