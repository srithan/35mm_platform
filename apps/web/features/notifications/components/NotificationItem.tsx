import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";

interface AvatarStackItem {
  initial: string;
  bg: string;
  color: string;
}

interface NotificationItemProps {
  avatarInitial?: string;
  avatarBg?: string;
  avatarColor?: string;
  avatarStack?: AvatarStackItem[];
  avatarUrl?: string | null;
  /** System notifications (e.g. moderation) render this badge instead of an actor avatar. */
  icon?: React.ReactNode;
  text: React.ReactNode;
  time: string;
  unread?: boolean;
  preview?: string;
  actions?: React.ReactNode;
  thumbnail?: string;
  thumbnailAlt?: string;
}

export function NotificationItem({
  avatarInitial,
  avatarBg,
  avatarColor,
  avatarStack,
  avatarUrl,
  icon,
  text,
  time,
  unread = false,
  preview,
  actions,
  thumbnail,
  thumbnailAlt,
}: NotificationItemProps) {
  const hasStack = avatarStack && avatarStack.length > 0;
  const displayInitial = hasStack ? avatarStack[0].initial : avatarInitial ?? "";

  return (
    <div
      className={cn(
        "py-3.5 border-b border-border cursor-pointer transition-colors duration-150 ease-out hover:bg-hover w-full px-4 rounded animate-fade-up",
        hasStack ? "flex flex-col gap-2" : "flex items-start gap-3"
      )}
    >
      {hasStack ? (
        <>
          <div className="flex items-center flex-shrink-0">
            {avatarStack.map((a, i) => (
              <div
                key={i}
                className="w-[30px] h-[30px] rounded-full border-2 border-bg flex items-center justify-center font-semibold text-xs -ml-2 first:ml-0 flex-shrink-0"
                style={{ background: a.bg, color: a.color, zIndex: avatarStack.length - i }}
              >
                {a.initial}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 min-w-0 pl-[50px]">
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] leading-[1.55] text-fg">{text}</div>
              <div className="text-[11px] text-fg-muted mt-0.5">{time}</div>
              {preview && (
                <div className="mt-2 text-[12.5px] text-fg-light leading-normal py-2 px-2.5 bg-fg/5 border-l-2 border-border rounded-sm">
                  {preview}
                </div>
              )}
              {actions && <div className="flex gap-2 mt-2">{actions}</div>}
            </div>
            {thumbnail && (
              <div className="w-10 flex-shrink-0 aspect-[2/3] rounded-sm overflow-hidden bg-fg relative">
                <Image
                  src={thumbnail}
                  alt={thumbnailAlt ?? ""}
                  width={40}
                  height={60}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span className="w-3 flex-shrink-0 flex justify-end mt-1" aria-hidden>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  unread ? "bg-accent" : "bg-transparent"
                )}
              />
            </span>
          </div>
        </>
      ) : (
        <>
          {icon ? (
            <span className="flex-shrink-0">{icon}</span>
          ) : avatarUrl ? (
            <Avatar
              initial={displayInitial}
              size="md"
              src={avatarUrl}
              className="w-[38px] h-[38px] flex-shrink-0"
            />
          ) : (
            <div
              className={cn(
                "w-[38px] h-[38px] rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-[15px]",
                !avatarBg && "bg-border"
              )}
              style={avatarBg && avatarColor ? { background: avatarBg, color: avatarColor } : undefined}
            >
              {displayInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] leading-[1.55] text-fg">{text}</div>
            <div className="text-[11px] text-fg-muted mt-0.5">{time}</div>
            {preview && (
              <div className="mt-2 text-[12.5px] text-fg-light leading-normal py-2 px-2.5 bg-fg/5 border-l-2 border-border rounded-sm">
                {preview}
              </div>
            )}
            {actions && <div className="flex gap-2 mt-2">{actions}</div>}
          </div>
          {thumbnail && (
            <div className="w-10 flex-shrink-0 aspect-[2/3] rounded-sm overflow-hidden bg-fg relative">
              <Image
                src={thumbnail}
                alt={thumbnailAlt ?? ""}
                width={40}
                height={60}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <span className="w-3 flex-shrink-0 flex justify-end mt-1" aria-hidden>
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                unread ? "bg-accent" : "bg-transparent"
              )}
            />
          </span>
        </>
      )}
    </div>
  );
}
