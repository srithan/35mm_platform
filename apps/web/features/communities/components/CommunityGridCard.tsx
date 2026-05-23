"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { formatCount } from "@/lib/utils/formatCount";
import { cn } from "@/lib/utils/cn";
import type { CommunityAccessType } from "../types/community";
import type { CommunitySummary } from "../types/community";

function accessLabel(accessType: CommunityAccessType) {
  if (accessType === "restricted") return "Restricted";
  if (accessType === "private") return "Private";
  return "Public";
}

export function CommunityGridCard({
  community,
  joined,
  onJoinToggle,
}: {
  community: CommunitySummary;
  joined: boolean;
  onJoinToggle: (communityId: string) => void;
}) {
  const router = useRouter();
  const bg = community.cover.gradient || community.avatar.gradient;

  function goToCommunity() {
    router.push(ROUTES.COMMUNITY(community.slug));
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={function () {
        goToCommunity();
      }}
      onKeyDown={function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToCommunity();
        }
      }}
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-md",
        "ring-1 ring-black/5 dark:ring-white/10",
        "cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:z-10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      )}
    >
      <div className="absolute inset-0" style={{ background: bg }} aria-hidden />

      <span
        className="absolute inset-0 flex items-center justify-center font-bold tracking-tight text-white pointer-events-none select-none"
        style={{
          fontSize: "clamp(4rem, 42vw, 7.5rem)",
          lineHeight: 1,
          opacity: 0.12,
        }}
        aria-hidden
      >
        {community.avatar.initial}
      </span>

      <div
        className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none"
        aria-hidden
      />

      <button
        type="button"
        onClick={function (event) {
          event.stopPropagation();
          onJoinToggle(community.id);
        }}
        className={cn(
          "absolute top-2.5 right-2.5 z-10 rounded-full px-3 py-1.5 text-[11px] font-semibold",
          "bg-black/40 text-white/95 backdrop-blur-md border border-white/25",
          "hover:bg-black/55 hover:border-white/35 transition-colors",
          joined && "bg-white/25 border-white/40"
        )}
        aria-label={(joined ? "Leave " : "Join ") + community.name}
      >
        {joined ? "Joined" : "+ Join"}
      </button>

      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-end gap-2 min-w-0">
        <div
          className="w-9 h-9 shrink-0 rounded-full border-2 border-white/90 flex items-center justify-center font-semibold text-[14px] shadow-md"
          style={{
            background: community.avatar.gradient,
            color: community.avatar.textColor,
          }}
        >
          {community.avatar.initial}
        </div>
        <div className="min-w-0 flex-1 pb-0.5">
          <h2 className="font-semibold text-[14px] sm:text-[15px] text-white leading-tight line-clamp-2 drop-shadow-sm">
            {community.name}
          </h2>
          <p className="mt-0.5 text-[11px] sm:text-[12px] text-white/75 truncate">
            {formatCount(community.memberCount)} members · {accessLabel(community.accessType)}
          </p>
        </div>
      </div>
    </article>
  );
}
