"use client";

import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/Avatar/Avatar";
import { initialForName } from "@/features/profile/hooks/useCurrentUserProfile";

/**
 * Shrunk sticky identity row (`ProfileMiniHeader.appear`): width is set by fixed parent aligned to hero / cover bounds.
 */
export function ProfileMiniHeader(props: {
  displayName: string;
  tagline: string;
  avatarUrl?: string | null;
  visible: boolean;
}) {
  const initial = initialForName(props.displayName);

  return (
    <header
      className={cn(
        "ProfileMiniHeader w-full max-w-none border-b border-border bg-bg/[0.94] backdrop-blur-md shadow-[0_1px_0_rgb(15_23_42/6%)] rounded-b-lg overflow-hidden box-border",
        "transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform]",
        props.visible ? "appear opacity-100 translate-y-0" : "-translate-y-full opacity-0"
      )}
      role="banner"
      aria-label={
        props.visible ? props.displayName + " · profile sticky summary" : undefined
      }
      aria-hidden={!props.visible}
    >
      <div className="flex flex-row gap-4 items-center min-h-[3.25rem] py-2.5 w-full box-border px-5 sm:px-6 md:px-8">
        <div className="profilePhotoContainer shrink-0 w-11 h-11 rounded-full overflow-hidden ring-1 ring-border bg-sunken-2 relative">
          <Avatar
            initial={initial}
            src={props.avatarUrl}
            className="w-11 h-11"
          />
        </div>
        <div className="infoContainer flex flex-col min-w-0 flex-1 leading-tight">
          <h3 className="m-0 p-0 text-[17px] font-semibold text-fg tracking-tight truncate">
            {props.displayName}
          </h3>
          <p className="m-0 mt-0.5 text-[13px] text-fg-muted truncate">{props.tagline}</p>
        </div>
      </div>
    </header>
  );
}
