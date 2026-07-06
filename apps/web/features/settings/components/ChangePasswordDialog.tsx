"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
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
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ChangePasswordFormValues>({
    resolver: standardSchemaResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange",
  });
  const currentPasswordField = register("currentPassword");
  const newPasswordValue = watch("newPassword");

  useEffect(() => {
    if (!open) {
      reset();
      setSubmitError(null);
      setSaved(false);
      setVisibleFields({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false,
      });
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
      "h-11 w-full select-text rounded-xl border border-border bg-[color-mix(in_srgb,var(--sunken)_58%,var(--elevated))] px-3.5 pr-11 text-[14px] text-fg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_4%,transparent)] outline-none transition-colors placeholder:text-fg-faint focus:border-border-strong focus:bg-[color-mix(in_srgb,var(--elevated)_88%,var(--sunken))] disabled:cursor-not-allowed disabled:opacity-60",
      hasError &&
        "border-accent bg-[color-mix(in_srgb,var(--color-film-red)_6%,var(--sunken))] placeholder:text-accent/40"
    );
  }

  function fieldError(message?: string) {
    return message ? <p className="mt-1.5 text-[11.5px] text-accent">{message}</p> : null;
  }

  function toggleVisible(field: keyof typeof visibleFields) {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function passwordStrength(value: string) {
    const checks = [
      value.length >= 8,
      /[a-z]/.test(value) && /[A-Z]/.test(value),
      /\d/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 1) return { score, label: "Weak", className: "bg-accent" };
    if (score === 2) return { score, label: "Fair", className: "bg-[#b9822e]" };
    if (score === 3) return { score, label: "Good", className: "bg-[#4f8f63]" };
    return { score, label: "Strong", className: "bg-[#1f7a54]" };
  }

  function visibilityButton(field: keyof typeof visibleFields, label: string) {
    const visible = visibleFields[field];
    const Icon = visible ? EyeOff : Eye;

    return (
      <button
        type="button"
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/10"
        onClick={() => toggleVisible(field)}
        aria-label={visible ? "Hide " + label : "Show " + label}
      >
        <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
      </button>
    );
  }

  const strength = passwordStrength(newPasswordValue);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change password"
      description="Enter your current password and choose a new one."
      initialFocusRef={firstFieldRef}
      className="w-[92vw] max-w-[480px] select-none rounded-2xl border border-border bg-elevated shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      contentClassName="p-0 sm:p-0"
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
          <div className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-fg-light" htmlFor="current-password">
                Current password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="current-password"
                  type={visibleFields.currentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={fieldClasses(Boolean(errors.currentPassword))}
                  disabled={isSubmitting}
                  {...currentPasswordField}
                  ref={(element) => {
                    currentPasswordField.ref(element);
                    firstFieldRef.current = element;
                  }}
                />
                {visibilityButton("currentPassword", "current password")}
              </div>
              {fieldError(errors.currentPassword?.message)}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-fg-light" htmlFor="new-password">
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="new-password"
                  type={visibleFields.newPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={fieldClasses(Boolean(errors.newPassword))}
                  disabled={isSubmitting}
                  {...register("newPassword")}
                />
                {visibilityButton("newPassword", "new password")}
              </div>
              {errors.newPassword ? (
                fieldError(errors.newPassword.message)
              ) : newPasswordValue ? (
                <div className="mt-2">
                  <div className="flex gap-1" aria-hidden>
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={cn(
                          "h-1 flex-1 rounded-full bg-border",
                          strength.score >= step && strength.className
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">
                    Strength: {strength.label}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">
                  Minimum 8 characters.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-fg-light" htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirm-new-password"
                  type={visibleFields.confirmNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={fieldClasses(Boolean(errors.confirmNewPassword))}
                  disabled={isSubmitting}
                  {...register("confirmNewPassword")}
                />
                {visibilityButton("confirmNewPassword", "confirmation password")}
              </div>
              {fieldError(errors.confirmNewPassword?.message)}
            </div>
          </div>

          {submitError ? (
            <p className="flex items-start gap-2 rounded-xl border border-accent/25 bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))] px-3.5 py-3 text-[12.5px] leading-relaxed text-accent">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              {submitError}
            </p>
          ) : saved ? (
            <p className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,#1f7a54_25%,var(--border))] bg-[color-mix(in_srgb,#1f7a54_7%,var(--sunken))] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#1f7a54]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Password updated.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-bg px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
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
