"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SettingsInput, SettingsSection } from "./SettingsFormPrimitives";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSettingsSchema,
  type ProfileSettingsFormValues,
  toFormErrorMessage,
} from "../schemas/settingsSchemas";
import type { ProfileSettings } from "../types/settings";

interface SettingsAccountPanelProps {
  initialValues: ProfileSettings;
  onSave: (values: ProfileSettingsFormValues) => Promise<void>;
}

export function SettingsAccountPanel({
  initialValues,
  onSave,
}: SettingsAccountPanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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
  }, [initialValues, reset]);

  const submit = handleSubmit(async (values) => {
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
          <SettingsInput
            label="Username"
            value={watch("username")}
            onChange={(value) => setValue("username", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="@username"
            error={errors.username?.message}
            disabled={isSubmitting}
          />
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
              disabled={isSubmitting || !isDirty || !isValid}
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
