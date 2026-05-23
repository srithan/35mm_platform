import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  initial?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "profile-lg";
  className?: string;
  /** Gradient ring (ink → accent) like canonical sidebar avatar */
  variant?: "default" | "ring";
}

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-lg",
  "profile-lg": "w-20 h-20 text-[28px]",
};

export function Avatar({
  initial,
  src,
  size = "md",
  className,
  variant = "default",
}: AvatarProps) {
  const sizeClass = sizeMap[size];
  const bgClass =
    variant === "ring"
      ? "bg-gradient-to-br from-fg to-accent text-white"
      : "bg-border text-fg-light";

  if (src) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden flex-shrink-0",
          sizeClass,
          bgClass,
          className
        )}
      >
        <Image
          src={src}
          alt=""
          width={size === "lg" || size === "profile-lg" ? 80 : 36}
          height={size === "lg" || size === "profile-lg" ? 80 : 36}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClass,
        bgClass,
        className
      )}
    >
      {initial ?? "?"}
    </div>
  );
}
