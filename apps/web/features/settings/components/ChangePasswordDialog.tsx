"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import {
  changePasswordSchema,
  toFormErrorMessage,
  type ChangePasswordFormValues,
} from "../schemas/settingsSchemas";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { user, isLoaded } = useUser();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange",
  });
  const currentPasswordField = register("currentPassword");

  useEffect(() => {
    if (!open) {
      reset();
      setSubmitError(null);
      setSaved(false);
    }
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSaved(false);

    if (!isLoaded || !user) {
      setSubmitError("Could not load your account. Try again.");
      return;
    }

    await user.updatePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

    reset();
    setSaved(true);
  });

  function fieldClasses(hasError: boolean) {
    return cn(
      "h-11 w-full border-0 bg-transparent px-4 text-[14px] text-fg outline-none placeholder:text-fg-faint disabled:cursor-not-allowed disabled:opacity-60",
      hasError && "placeholder:text-accent/40"
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change password"
      description="Enter your current password and choose a new one."
      initialFocusRef={firstFieldRef}
      className="w-[92vw] max-w-[480px] rounded-2xl border border-border bg-elevated shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      contentClassName="p-0"
    >
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit().catch((error: unknown) => {
            setSubmitError(toFormErrorMessage(error, "Could not update password."));
          });
        }}
      >
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-sunken px-4 py-3.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-fg shadow-sm"
              aria-hidden
            >
              <LockKeyhole className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold tracking-tight text-fg">
                Keep your account protected
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
                Use a new password with at least 8 characters.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-sunken divide-y divide-border">
            <div
              className={cn(
                "px-4 py-3.5",
                errors.currentPassword &&
                  "bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))]"
              )}
            >
              <label className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-fg-muted" htmlFor="current-password">
                <KeyRound className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className={fieldClasses(Boolean(errors.currentPassword))}
                disabled={isSubmitting}
                {...currentPasswordField}
                ref={(element) => {
                  currentPasswordField.ref(element);
                  firstFieldRef.current = element;
                }}
              />
              {errors.currentPassword ? (
                <p className="mt-1.5 text-[11.5px] text-accent">{errors.currentPassword.message}</p>
              ) : null}
            </div>

            <div
              className={cn(
                "px-4 py-3.5",
                errors.newPassword &&
                  "bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))]"
              )}
            >
              <label className="mb-1.5 block text-[12px] font-medium text-fg-muted" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={fieldClasses(Boolean(errors.newPassword))}
                disabled={isSubmitting}
                {...register("newPassword")}
              />
              {errors.newPassword ? (
                <p className="mt-1.5 text-[11.5px] text-accent">{errors.newPassword.message}</p>
              ) : null}
            </div>

            <div
              className={cn(
                "px-4 py-3.5",
                errors.confirmNewPassword &&
                  "bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))]"
              )}
            >
              <label className="mb-1.5 block text-[12px] font-medium text-fg-muted" htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                className={fieldClasses(Boolean(errors.confirmNewPassword))}
                disabled={isSubmitting}
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword ? (
                <p className="mt-1.5 text-[11.5px] text-accent">{errors.confirmNewPassword.message}</p>
              ) : null}
            </div>
          </div>

          {submitError ? (
            <p className="flex items-start gap-2 rounded-2xl border border-accent/25 bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))] px-4 py-3 text-[12.5px] leading-relaxed text-accent">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              {submitError}
            </p>
          ) : saved ? (
            <p className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,#1f7a54_25%,var(--border))] bg-[color-mix(in_srgb,#1f7a54_7%,var(--sunken))] px-4 py-3 text-[12.5px] leading-relaxed text-[#1f7a54]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Password updated.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-bg px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Saving..." : "Save password"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
