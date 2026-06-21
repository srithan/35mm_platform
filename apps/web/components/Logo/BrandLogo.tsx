import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "./LogoMark";

type BrandLogoProps = {
  href?: string;
  className?: string;
  markClassName?: string;
  children: React.ReactNode;
  ariaLabel?: string;
};

export function BrandLogo({
  href,
  className,
  markClassName,
  children,
  ariaLabel = "35mm.in Home",
}: BrandLogoProps) {
  const content = (
    <>
      <LogoMark className={markClassName} />
      <span className="min-w-0">{children}</span>
    </>
  );

  const sharedClassName = cn(
    "inline-flex items-center gap-[0.42em] no-underline",
    className
  );

  if (href) {
    return (
      <Link href={href} className={sharedClassName} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return <span className={sharedClassName}>{content}</span>;
}
