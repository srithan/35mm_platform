import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "./LogoMark";

type BrandLogoProps = {
  href?: string;
  className?: string;
  markClassName?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

export function BrandLogo({
  href,
  className,
  markClassName,
  style,
  ariaLabel = "35mm.in Home",
}: BrandLogoProps) {
  const sharedClassName = cn(
    "inline-flex items-center no-underline",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={sharedClassName}
        style={style}
        aria-label={ariaLabel}
      >
        <LogoMark className={markClassName} />
      </Link>
    );
  }

  return (
    <span
      className={sharedClassName}
      style={style}
      role="img"
      aria-label={ariaLabel}
    >
      <LogoMark className={markClassName} />
    </span>
  );
}
