"use client";

import { Dialog } from "@/components/Dialog/Dialog";
import { UserCard } from "@/components/UserCard";
import { MOCK_PROFILE_CONNECTIONS } from "@/features/profile/data/mockConnections";

export function ProfileConnectionsModal({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "followers" | "following";
}) {
  const title = kind === "followers" ? "Followers" : "Following";
  const placeholder =
    kind === "followers" ? "Search followers…" : "Search following…";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      contentClassName="p-0 flex flex-col max-h-[min(520px,85vh)]"
    >
      <div className="shrink-0 border-b border-border px-5 py-3">
        <input
          type="search"
          placeholder={placeholder}
          className="w-full border-none bg-transparent font-sans text-[16px] md:text-sm text-fg outline-none placeholder:text-fg-muted focus-visible:ring-0"
          aria-label={placeholder}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {MOCK_PROFILE_CONNECTIONS.map((u) => (
          <UserCard
            key={u.username}
            username={u.username}
            handle={`@${u.username}`}
            role={u.role}
            initial={u.initial}
            avatarBg={u.avatarBg}
            avatarColor={u.avatarColor}
            showFollowButton
          />
        ))}
      </div>
    </Dialog>
  );
}
