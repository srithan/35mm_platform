import { z } from "zod";

export const profileSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(40, "Display name must be at most 40 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be at most 20 characters.")
    .regex(/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, dots, and underscores."),
  email: z.email("Please enter a valid email address."),
});

export const privacySettingsSchema = z.object({
  privateAccount: z.boolean(),
  allowMessagesFromAnyone: z.boolean(),
  showActivityStatus: z.boolean(),
});

export const notificationSettingsSchema = z.object({
  newFollowers: z.boolean(),
  likesOnPosts: z.boolean(),
  commentsAndReplies: z.boolean(),
  mentions: z.boolean(),
  festivalUpdates: z.boolean(),
  watchlistStreaming: z.boolean(),
  emailDigest: z.boolean(),
});

export const appearanceSettingsSchema = z.object({
  theme: z.enum(["auto", "light", "dark", "matrix", "oppenheimer-bw", "barbie"]),
  videoAutoplay: z.boolean(),
});

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
export type PrivacySettingsFormValues = z.infer<typeof privacySettingsSchema>;
export type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;
export type AppearanceSettingsFormValues = z.infer<typeof appearanceSettingsSchema>;

export function toFormErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
