"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog/Dialog";
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
    return [
      "w-full rounded-sm border bg-transparent px-3 py-2 text-[13px] text-fg outline-none",
      "placeholder:text-fg-muted/60 focus:border-fg-muted",
      hasError ? "border-accent" : "border-border",
    ].join(" ");
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change password"
      description="Enter your current password and choose a new one."
      initialFocusRef={firstFieldRef}
      className="w-[92vw] max-w-[440px] rounded-lg border border-border bg-elevated shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit().catch((error: unknown) => {
            setSubmitError(toFormErrorMessage(error, "Could not update password."));
          });
        }}
      >
        <div>
          <label className="mb-1.5 block text-[11.5px] text-fg-muted" htmlFor="current-password">
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
            <p className="mt-1 text-[11px] text-accent">{errors.currentPassword.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[11.5px] text-fg-muted" htmlFor="new-password">
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
            <p className="mt-1 text-[11px] text-accent">{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[11.5px] text-fg-muted" htmlFor="confirm-new-password">
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
            <p className="mt-1 text-[11px] text-accent">{errors.confirmNewPassword.message}</p>
          ) : null}
        </div>

        {submitError ? (
          <p className="text-[12px] text-accent">{submitError}</p>
        ) : saved ? (
          <p className="text-[12px] text-fg-muted">Password updated.</p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
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
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
