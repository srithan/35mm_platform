"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SettingsSection, SettingsToggle } from "./SettingsFormPrimitives";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  privacySettingsSchema,
  type PrivacySettingsFormValues,
  toFormErrorMessage,
} from "../schemas/settingsSchemas";
import type { PrivacySettings } from "../types/settings";

interface SettingsPrivacyPanelProps {
  initialValues: PrivacySettings;
  onSave: (values: PrivacySettingsFormValues) => Promise<void>;
}

export function SettingsPrivacyPanel({
  initialValues,
  onSave,
}: SettingsPrivacyPanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<PrivacySettingsFormValues>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: initialValues,
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
      <SettingsSection title="Privacy">
        <div className="space-y-0">
          <SettingsToggle
            label="Private account"
            description="Only approved followers can see your posts"
            checked={watch("privateAccount")}
            onChange={(checked) => setValue("privateAccount", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Allow messages from anyone"
            description="Otherwise only people you follow can message you"
            checked={watch("allowMessagesFromAnyone")}
            onChange={(checked) => setValue("allowMessagesFromAnyone", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Show activity status"
            description="Let others see when you're active"
            checked={watch("showActivityStatus")}
            onChange={(checked) => setValue("showActivityStatus", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          {submitError ? (
            <p className="pt-3 text-[12px] text-accent">{submitError}</p>
          ) : null}
          <div className="pt-6">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void submit().catch((error: unknown) => {
                  setSubmitError(
                    toFormErrorMessage(error, "Could not save privacy settings.")
                  );
                });
              }}
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? "Saving…" : saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
