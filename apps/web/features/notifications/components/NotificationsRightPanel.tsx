import { Switch } from "@/components/Switch";

export function NotificationsRightPanel() {
  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Your Activity This Week
        </div>
        <div className="border border-border rounded p-3.5 mb-7">
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-fg-light">New followers</span>
            <span className="text-[13px] text-fg">+12</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-fg-light">Post likes</span>
            <span className="text-[13px] text-fg">+247</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-fg-light">Review likes</span>
            <span className="text-[13px] text-fg">+134</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-fg-light">List saves</span>
            <span className="text-[13px] text-fg">+18</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b-0">
            <span className="text-xs text-fg-light">Profile views</span>
            <span className="text-[13px] text-fg">+841</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-6">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Notification Settings
        </div>
        {[
          "New followers",
          "Likes on posts",
          "Comments & replies",
          "Reposts",
          "Mentions",
          "Messages",
          "Festival updates",
          "Watchlist streaming",
          "Group activity",
          "Email digest",
        ].map((label) => (
          <div
            key={label}
            className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
          >
            <span className="text-[12.5px] text-fg-light">{label}</span>
            <Switch checked={true} aria-label={label} />
          </div>
        ))}
      </div>
    </>
  );
}
