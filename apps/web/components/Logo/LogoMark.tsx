import { cn } from "@/lib/utils/cn";

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-[1.05em] w-[2.83em] shrink-0 bg-current",
        className
      )}
      style={{
        WebkitMask: "url('/35mm_ny_logo.svg') center / contain no-repeat",
        mask: "url('/35mm_ny_logo.svg') center / contain no-repeat",
      }}
    />
  );
}
