import { Check, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/Switch";
import { cn } from "@/lib/utils/cn";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";
import type { AccentColorOption } from "@/lib/theme/accentColors";
import { ACCENT_COLOR_OPTIONS } from "@/lib/theme/accentColors";
import { AccentColorPicker } from "@/features/settings/components/AccentColorPicker";
import type { AppearanceSettings } from "@/features/settings/types/settings";
import { PROFILE_THEME_OPTIONS } from "../../types";
import styles from "../../SiteHeader.module.css";

type ProfileMenuAppearanceViewProps = {
  appearanceSettings: AppearanceSettings;
  updateAppearanceMutation: {
    isPending: boolean;
    isError: boolean;
  };
  onBack: () => void;
  onSelectTheme: (theme: ThemeOption) => void;
  onSelectAccentColor: (accentColor: AccentColorOption) => void;
  onToggleVideoAutoplay: (checked: boolean) => void;
};

export function ProfileMenuAppearanceView({
  appearanceSettings,
  updateAppearanceMutation,
  onBack,
  onSelectTheme,
  onSelectAccentColor,
  onToggleVideoAutoplay,
}: ProfileMenuAppearanceViewProps) {
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
        <h2 className={styles.profileSubmenuTitle}>Appearance</h2>
      </div>
      <div className={styles.profileInlineSection}>
        <div className={styles.profileInlineSectionTitle}>Theme</div>
        <div className={styles.profileThemeGrid} role="group" aria-label="Theme">
          {PROFILE_THEME_OPTIONS.map(function (option) {
            const selected = appearanceSettings.theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  styles.profileThemeOption,
                  selected && styles.profileThemeOptionSelected
                )}
                aria-pressed={selected}
                disabled={updateAppearanceMutation.isPending}
                onClick={function () {
                  onSelectTheme(option.id);
                }}
              >
                <span
                  className={styles.profileThemeSwatch}
                  style={{ background: option.swatch }}
                  aria-hidden
                />
                <span className={styles.profileThemeLabel}>{option.label}</span>
                {selected ? (
                  <Check className={styles.profileThemeCheck} size={13} strokeWidth={2.25} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.profileInlineSection}>
        <div className={styles.profileInlineSectionTitle}>Accent color</div>
        <AccentColorPicker
          variant="compact"
          value={appearanceSettings.accentColor}
          disabled={updateAppearanceMutation.isPending}
          onChange={onSelectAccentColor}
        />
        <p className={styles.profileAccentHint}>
          {ACCENT_COLOR_OPTIONS.find(function (option) {
            return option.id === appearanceSettings.accentColor;
          })?.label ?? "Theme default"}
        </p>
      </div>
      <div className={styles.profileSwitchRow}>
        <span className={styles.profileSwitchCopy}>
          <span className={styles.profileSwitchLabel}>Video autoplay</span>
          <span className={styles.profileSwitchHint}>Auto-play videos in feed</span>
        </span>
        <Switch
          checked={appearanceSettings.videoAutoplay}
          disabled={updateAppearanceMutation.isPending}
          onChange={onToggleVideoAutoplay}
          aria-label="Video autoplay"
        />
      </div>
      {updateAppearanceMutation.isError ? (
        <p className={styles.profileInlineError}>Could not update appearance.</p>
      ) : null}
    </>
  );
}
