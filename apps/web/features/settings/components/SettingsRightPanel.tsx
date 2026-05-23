import Link from "next/link";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { ROUTES } from "@/lib/constants/routes";

export function SettingsRightPanel() {
  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Quick links
        </div>
        <div className="border border-border rounded p-3.5 space-y-1">
          <Link
            href={ROUTES.PROFILE(CURRENT_USER.username)}
            className="block text-xs text-fg-light hover:text-fg py-1.5 transition-colors"
          >
            View your profile
          </Link>
          <Link
            href={ROUTES.NOTIFICATIONS}
            className="block text-xs text-fg-light hover:text-fg py-1.5 transition-colors"
          >
            Notification centre
          </Link>
        </div>
      </div>
      <div className="border-t border-border pt-6">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Account
        </div>
        <div className="text-[12px] text-fg-light">
          <p className="mb-2">
            Member since Feb 2024
          </p>
          <p className="text-[11px] text-fg-muted ">
            srithan@example.com
          </p>
        </div>
      </div>
    </>
  );
}
