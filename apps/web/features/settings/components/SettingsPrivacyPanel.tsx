"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  fetchMyBlocks,
  fetchMyMutes,
  unblockUser,
  unmuteUser,
} from "@/features/profile/api/profileApi";

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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

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

  const blocksQuery = useQuery({
    queryKey: ["privacy", "blocks"],
    queryFn: async () => fetchMyBlocks(await getToken()),
  });
  const mutesQuery = useQuery({
    queryKey: ["privacy", "mutes"],
    queryFn: async () => fetchMyMutes(await getToken()),
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      await unblockUser(userId, await getToken());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy", "blocks"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await unmuteUser(userId, await getToken());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy", "mutes"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
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
      <SettingsSection title="Blocked accounts">
        <div className="space-y-2">
          {(blocksQuery.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">No blocked accounts.</p>
          ) : (
            blocksQuery.data?.items.map((item) => (
              <div key={item.userId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="text-sm text-fg">
                  {item.displayName} <span className="text-fg-muted">@{item.username}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => unblockMutation.mutate(item.userId)}
                >
                  Unblock
                </Button>
              </div>
            ))
          )}
        </div>
      </SettingsSection>
      <SettingsSection title="Muted accounts">
        <div className="space-y-2">
          {(mutesQuery.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">No muted accounts.</p>
          ) : (
            mutesQuery.data?.items.map((item) => (
              <div key={item.userId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="text-sm text-fg">
                  {item.displayName} <span className="text-fg-muted">@{item.username}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => unmuteMutation.mutate(item.userId)}
                >
                  Unmute
                </Button>
              </div>
            ))
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
