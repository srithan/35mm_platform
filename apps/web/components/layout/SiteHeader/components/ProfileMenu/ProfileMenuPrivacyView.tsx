import type { UseMutationResult } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Switch } from "@/components/Switch";
import type { PrivacySettings } from "@/features/settings/types/settings";
import styles from "../../SiteHeader.module.css";

type ProfileMenuPrivacyViewProps = {
  privacySettings: PrivacySettings;
  updatePrivacyMutation: UseMutationResult<unknown, Error, PrivacySettings, unknown>;
  onBack: () => void;
  onToggleSetting: (key: keyof PrivacySettings, checked: boolean) => void;
};

export function ProfileMenuPrivacyView({
  privacySettings,
  updatePrivacyMutation,
  onBack,
  onToggleSetting,
}: ProfileMenuPrivacyViewProps) {
  return (
    <>
      <div className={styles.profileSubmenuHeader}>
        <button
          type="button"
          className={styles.profileSubmenuBack}
          aria-label="Back to account menu"
          onClick={onBack}
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        </button>
        <h2 className={styles.profileSubmenuTitle}>Privacy</h2>
      </div>
      <div className={styles.profileSwitchStack}>
        <div className={styles.profileSwitchRow}>
          <span className={styles.profileSwitchCopy}>
            <span className={styles.profileSwitchLabel}>Private account</span>
            <span className={styles.profileSwitchHint}>Only approved followers can see your posts</span>
          </span>
          <Switch
            checked={privacySettings.privateAccount}
            disabled={updatePrivacyMutation.isPending}
            onChange={function (checked) {
              onToggleSetting("privateAccount", checked);
            }}
            aria-label="Private account"
          />
        </div>
        <div className={styles.profileSwitchRow}>
          <span className={styles.profileSwitchCopy}>
            <span className={styles.profileSwitchLabel}>Allow messages from anyone</span>
            <span className={styles.profileSwitchHint}>Otherwise only people you follow can message you</span>
          </span>
          <Switch
            checked={privacySettings.allowMessagesFromAnyone}
            disabled={updatePrivacyMutation.isPending}
            onChange={function (checked) {
              onToggleSetting("allowMessagesFromAnyone", checked);
            }}
            aria-label="Allow messages from anyone"
          />
        </div>
        <div className={styles.profileSwitchRow}>
          <span className={styles.profileSwitchCopy}>
            <span className={styles.profileSwitchLabel}>Show activity status</span>
            <span className={styles.profileSwitchHint}>Let others see when you are active</span>
          </span>
          <Switch
            checked={privacySettings.showActivityStatus}
            disabled={updatePrivacyMutation.isPending}
            onChange={function (checked) {
              onToggleSetting("showActivityStatus", checked);
            }}
            aria-label="Show activity status"
          />
        </div>
      </div>
      {updatePrivacyMutation.isError ? (
        <p className={styles.profileInlineError}>Could not update privacy.</p>
      ) : null}
    </>
  );
}
