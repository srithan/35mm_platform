"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { CreepyButton } from "@/components/CreepyButton";
import { SettingsRow, SettingsSection } from "./SettingsFormPrimitives";

export function SettingsDataSecurityPanel() {
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-10">
      <SettingsSection title="Data & storage">
        <div className="space-y-0">
          <SettingsRow
            label="Download your data"
            description="Request a copy of your data"
            href="#"
          />
          <div className="border-t border-border pt-4 mt-0">
            <SettingsRow
              label="Clear cache"
              description="Free up storage used by cached content"
              onClick={() => { }}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <div className="space-y-0 pt-2">
          <div className="flex items-start justify-between gap-4 border-b border-border py-4 sm:items-center">
            <div className="min-w-0">
              <span className="text-[13px] text-fg-light block">
                Deactivate account temporarily
              </span>
              <span className="text-[11.5px] text-fg-muted mt-0.5 block">
                Hide your profile and content. Reactivate anytime by signing in.
              </span>
            </div>
            <CreepyButton
              className="shrink-0"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </CreepyButton>
          </div>
          <div className="flex items-start justify-between gap-4 py-4 sm:items-center">
            <div className="min-w-0">
              <span className="text-[13px] text-fg-light block">
                Delete account
              </span>
              <span className="text-[11.5px] text-fg-muted mt-0.5 block">
                Permanently delete your account and all data
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 border-accent/50 text-accent hover:border-accent hover:bg-accent/5"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={() => {
          // TODO: call deactivate API
        }}
        title="Deactivate your account?"
        description="Your profile and content will be hidden. You can reactivate anytime by signing back in."
        confirmLabel="Deactivate"
        cancelLabel="Keep my account"
        variant="danger"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          // TODO: call delete account API
        }}
        title="Delete your account permanently?"
        description="This action cannot be undone. All your posts, reviews, and data will be permanently removed."
        confirmLabel="Delete my account"
        cancelLabel="No, keep my account"
        variant="danger"
      />
    </div>
  );
}
