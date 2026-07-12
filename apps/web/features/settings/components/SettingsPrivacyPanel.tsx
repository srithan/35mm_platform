"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ROUTES } from "@/lib/constants/routes";
import { SettingsRow, SettingsSection, SettingsToggle } from "./SettingsFormPrimitives";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
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
	  const [confirmMakePublicOpen, setConfirmMakePublicOpen] = useState(false);

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<PrivacySettingsFormValues>({
    resolver: standardSchemaResolver(privacySettingsSchema),
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

	  async function savePrivacyValues(values: PrivacySettingsFormValues) {
	    setSubmitError(null);
	    await onSave(values);
	    setSaved(true);
	    setTimeout(() => setSaved(false), 2000);
	    reset(values);
	  }

	  function handlePrivateAccountToggle(checked: boolean) {
	    var current = watch("privateAccount");
	    if (current && !checked) {
	      setConfirmMakePublicOpen(true);
	      return;
	    }
	    var next = {
	      ...watch(),
	      privateAccount: checked,
	    };
	    setValue("privateAccount", checked, { shouldDirty: false });
	    void savePrivacyValues(next).catch(function (error: unknown) {
	      setSubmitError(toFormErrorMessage(error, "Could not save privacy settings."));
	      reset(initialValues);
	    });
	  }

  return (
    <div className="space-y-10">
      <SettingsSection title="Visibility">
        <div className="space-y-0">
          <SettingsToggle
	            label="Private account"
	            description="Only approved followers can see your posts"
	            checked={watch("privateAccount")}
	            onChange={handlePrivateAccountToggle}
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
	      <ConfirmDialog
	        open={confirmMakePublicOpen}
	        onClose={() => setConfirmMakePublicOpen(false)}
	        onConfirm={() => {
	          var next = {
	            ...watch(),
	            privateAccount: false,
	          };
	          setValue("privateAccount", false, { shouldDirty: false });
	          void savePrivacyValues(next).catch(function (error: unknown) {
	            setSubmitError(toFormErrorMessage(error, "Could not save privacy settings."));
	            reset(initialValues);
	          });
	        }}
	        title="Make account public?"
	        description="Your posts will become visible to everyone. Any pending follow requests will be approved automatically."
	        cancelLabel="Cancel"
	        confirmLabel="Make Public"
	      />
	      <SettingsSection title="Account controls">
        <div>
          <SettingsRow
            label="Blocked accounts"
            description="Accounts that cannot see your profile, posts, or message you"
            href={ROUTES.SETTINGS_PRIVACY_BLOCKED}
          />
          <SettingsRow
            label="Muted accounts"
            description="Accounts hidden from your feed without blocking"
            href={ROUTES.SETTINGS_PRIVACY_MUTED}
          />
          <SettingsRow
            label="Your reports"
            description="Track the status of content you've reported"
            href={ROUTES.SETTINGS_PRIVACY_REPORTS}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
