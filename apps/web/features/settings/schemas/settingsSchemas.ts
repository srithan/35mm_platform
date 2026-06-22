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
  accentColor: z.enum([
    "theme",
    "warm-red",
    "crimson",
    "amber",
    "forest",
    "ocean",
    "violet",
    "rose",
  ]),
  videoAutoplay: z.boolean(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "New password must be different from current password.",
    path: ["newPassword"],
  });

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
export type PrivacySettingsFormValues = z.infer<typeof privacySettingsSchema>;
export type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;
export type AppearanceSettingsFormValues = z.infer<typeof appearanceSettingsSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function toFormErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0]?.longMessage || errors[0]?.message || fallback;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
