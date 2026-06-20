import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  headline: string;
  subline?: string;
  primaryCta?: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyState({
  icon,
  headline,
  subline,
  primaryCta,
  secondaryCta,
  size = "md",
  className,
}: EmptyStateProps) {
  const spacingBySize = {
    sm: "py-8",
    md: "py-12",
    lg: "py-20",
  }[size];

  function renderCta(
    cta: { label: string; href?: string; onClick?: () => void } | undefined,
    variant: "primary" | "secondary"
  ) {
    if (!cta) return null;

    const baseClass =
      variant === "primary"
        ? "inline-flex h-10 items-center justify-center rounded-full bg-fg px-5 text-[13px] font-semibold text-bg transition-colors hover:opacity-90"
        : "inline-flex h-10 items-center justify-center rounded-full border border-neutral-300 px-5 text-[13px] font-semibold text-fg transition-colors hover:bg-neutral-100";

    if (cta.href) {
      return (
        <Link href={cta.href} className={baseClass}>
          {cta.label}
        </Link>
      );
    }

    return (
      <button type="button" onClick={cta.onClick} className={baseClass}>
        {cta.label}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex max-w-[460px] flex-col items-center text-center",
        spacingBySize,
        className
      )}
    >
      {icon ? <div className="mb-3 text-fg">{icon}</div> : null}
      <h3 className="font-display-discover text-[28px] leading-tight text-fg">{headline}</h3>
      {subline ? <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">{subline}</p> : null}
      {primaryCta || secondaryCta ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {renderCta(primaryCta, "primary")}
          {renderCta(secondaryCta, "secondary")}
        </div>
      ) : null}
    </div>
  );
}
