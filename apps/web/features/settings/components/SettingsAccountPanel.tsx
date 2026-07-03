"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SettingsInput, SettingsSection } from "./SettingsFormPrimitives";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSettingsSchema,
  type ProfileSettingsFormValues,
  toFormErrorMessage,
} from "../schemas/settingsSchemas";
import type { ProfileSettings } from "../types/settings";
import { checkUsernameAvailability } from "../api/settingsApi";

interface SettingsAccountPanelProps {
  initialValues: ProfileSettings;
  onSave: (values: ProfileSettingsFormValues) => Promise<void>;
}

type UsernameStatus =
  | { state: "idle"; message: string }
  | { state: "current"; message: string }
  | { state: "checking"; message: string }
  | { state: "available"; message: string }
  | { state: "unavailable"; message: string }
  | { state: "error"; message: string };

export function SettingsAccountPanel({
  initialValues,
  onSave,
}: SettingsAccountPanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    state: "idle",
    message: "Use letters, numbers, dots, and underscores.",
  });

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(initialValues);
    setSubmitError(null);
    setSaved(false);
    setUsernameStatus({
      state: "current",
      message: "This is your current profile URL.",
    });
  }, [initialValues, reset]);

  const usernameValue = watch("username");
  const normalizedInitialUsername = initialValues.username.trim().toLowerCase();
  const normalizedUsername = usernameValue.trim().toLowerCase();
  const usernameMessageId = "settings-username-status";
  const usernameError = errors.username?.message;
  const usernameChanged = normalizedUsername !== normalizedInitialUsername;
  const canSaveUsername =
    !usernameChanged ||
    usernameStatus.state === "available";

  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus({
        state: "current",
        message: "This is your current profile URL.",
      });
      return;
    }

    if (usernameError) {
      setUsernameStatus({
        state: "unavailable",
        message: usernameError,
      });
      return;
    }

    if (!normalizedUsername) {
      setUsernameStatus({
        state: "idle",
        message: "Use letters, numbers, dots, and underscores.",
      });
      return;
    }

    setUsernameStatus({
      state: "checking",
      message: "Checking availability...",
    });

    const timeout = window.setTimeout(() => {
      void checkUsernameAvailability(normalizedUsername)
        .then((result) => {
          setUsernameStatus(
            result.available
              ? {
                  state: "available",
                  message: "Username is available.",
                }
              : {
                  state: "unavailable",
                  message: result.reason ?? "Username is not available.",
                }
          );
        })
        .catch(() => {
          setUsernameStatus({
            state: "error",
            message: "Could not check availability. Try again.",
          });
        });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [normalizedUsername, usernameChanged, usernameError]);

  const submit = handleSubmit(async (values) => {
    if (!canSaveUsername) {
      setSubmitError("Choose an available username before saving.");
      return;
    }
    setSubmitError(null);
    await onSave(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    reset(values);
  });

  return (
    <div className="space-y-10">
      <SettingsSection title="Profile">
        <div className="space-y-0">
          <SettingsInput
            label="Display name"
            value={watch("displayName")}
            onChange={(value) => setValue("displayName", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Your display name"
            error={errors.displayName?.message}
            disabled={isSubmitting}
          />
          <div className="border-b border-border py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start sm:gap-5">
            <label
              className="block text-[12.5px] font-medium text-fg-light sm:pt-3"
              htmlFor="settings-username"
            >
              Username
            </label>
            <div className="mt-2 min-w-0 sm:mt-0 sm:max-w-md">
              <div
                className={cn(
                  "relative flex h-11 items-center overflow-hidden rounded-xl border bg-sunken shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_4%,transparent)] transition-colors focus-within:bg-bg",
                  usernameStatus.state === "available" || usernameStatus.state === "current"
                    ? "border-[color-mix(in_srgb,#1f7a54_58%,var(--border-strong))]"
                    : usernameStatus.state === "unavailable" || usernameStatus.state === "error"
                      ? "border-[color-mix(in_srgb,var(--color-film-red)_78%,var(--border-strong))] bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))]"
                      : "border-border-strong focus-within:border-fg-muted"
                )}
              >
                {usernameStatus.state === "checking" ? (
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-fg/8"
                    aria-hidden
                  >
                    <span className="block h-full w-1/3 animate-[settingsUsernameProgress_0.7s_ease-in-out_infinite] rounded-full bg-accent" />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex h-full items-center border-r border-border px-3 text-[13px]",
                    usernameStatus.state === "unavailable" || usernameStatus.state === "error"
                      ? "text-[var(--color-film-red)]"
                      : "text-fg-muted"
                  )}
                >
                  35mm/
                </span>
                <input
                  id="settings-username"
                  type="text"
                  value={usernameValue}
                  placeholder="username"
                  autoComplete="username"
                  onChange={(event) =>
                    setValue("username", event.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                  aria-invalid={Boolean(usernameError) || usernameStatus.state === "unavailable"}
                  aria-describedby={usernameMessageId}
                  className={cn(
                    "min-w-0 flex-1 border-0 bg-transparent px-3 text-[14px] outline-none placeholder:text-fg-faint disabled:cursor-not-allowed disabled:opacity-60",
                    usernameStatus.state === "unavailable" || usernameStatus.state === "error"
                      ? "text-[var(--color-film-red)] placeholder:text-[color-mix(in_srgb,var(--color-film-red)_45%,transparent)]"
                      : "text-fg"
                  )}
                />
                <span className="flex h-full w-10 shrink-0 items-center justify-center">
                  {usernameStatus.state === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-fg-muted" aria-hidden />
                  ) : usernameStatus.state === "available" || usernameStatus.state === "current" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#1f7a54]" aria-hidden />
                  ) : usernameStatus.state === "unavailable" || usernameStatus.state === "error" ? (
                    <XCircle className="h-4 w-4 text-[var(--color-film-red)]" aria-hidden />
                  ) : null}
                </span>
              </div>
              <p
                id={usernameMessageId}
                className={cn(
                  "mt-1.5 text-[12px] font-medium leading-relaxed",
                  usernameStatus.state === "available" || usernameStatus.state === "current"
                    ? "text-[color-mix(in_srgb,#1f7a54_82%,var(--fg))]"
                    : usernameStatus.state === "unavailable" || usernameStatus.state === "error"
                      ? "text-[var(--color-film-red)]"
                      : "text-fg"
                )}
                aria-live="polite"
              >
                {usernameStatus.message}
              </p>
            </div>
          </div>
          <SettingsInput
            label="Email"
            value={watch("email")}
            onChange={(value) => setValue("email", value, { shouldDirty: true, shouldValidate: true })}
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            disabled={isSubmitting}
          />
          {submitError ? (
            <p className="pt-3 text-[12px] text-accent">{submitError}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-6">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void submit().catch((error: unknown) => {
                  setSubmitError(
                    toFormErrorMessage(error, "Could not save account settings.")
                  );
                });
              }}
              disabled={isSubmitting || !isDirty || !isValid || !canSaveUsername}
            >
              {isSubmitting ? "Saving…" : saved ? "Saved" : "Save changes"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
            >
              Change password
            </Button>
          </div>
        </div>
      </SettingsSection>
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
