import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export const TITLE_CREDIT_LINK_CLASS =
  "font-medium text-fg underline decoration-fg/20 underline-offset-[0.2em] transition hover:decoration-fg/60";

export type TitleCreditLinkItem = {
  id: number;
  name: string;
  href: string;
};

export function TitleCreditNameLinks(props: {
  items: TitleCreditLinkItem[];
  separator?: ReactNode;
  className?: string;
}) {
  const separator = props.separator ?? ", ";
  return (
    <>
      {props.items.map(function (item, index) {
        return (
          <span key={item.href}>
            {index > 0 ? (
              <span aria-hidden className="text-fg-muted">
                {separator}
              </span>
            ) : null}
            <Link
              href={item.href}
              className={cn(TITLE_CREDIT_LINK_CLASS, props.className)}
            >
              {item.name}
            </Link>
          </span>
        );
      })}
    </>
  );
}
