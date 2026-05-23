"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface TopStickyBarTabBase {
  id: string;
  label: string;
  mobileLabel?: string;
  badgeCount?: number;
  count?: number;
  disabled?: boolean;
}

export type TopStickyBarTabLink = TopStickyBarTabBase & {
  href: string;
  onClick?: never;
};

export type TopStickyBarTabAction = TopStickyBarTabBase & {
  onClick: () => void;
  href?: never;
};

export type TopStickyBarTabPassive = TopStickyBarTabBase & {
  href?: never;
  onClick?: never;
};

export type TopStickyBarTab =
  | TopStickyBarTabLink
  | TopStickyBarTabAction
  | TopStickyBarTabPassive;

type TopStickyBarVariant = "default" | "headline";

interface TopStickyBarProps {
  tabs: readonly TopStickyBarTab[];
  activeTabId: string;
  title?: string;
  subtitle?: string;
  navAriaLabel?: string;
  variant?: TopStickyBarVariant;
  rootClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  tabsViewportClassName?: string;
  tabsListClassName?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  badgeClassName?: string;
  countClassName?: string;
}

const STYLES_BY_VARIANT: Record<
  TopStickyBarVariant,
  {
    root: string;
    header: string;
    tabsViewport: string;
    tabsList: string;
    tab: string;
    active: string;
    inactive: string;
  }
> = {
  default: {
    root: "",
    header: "",
    tabsViewport: "",
    tabsList: "w-max max-w-full",
    tab: "min-w-max flex-shrink-0 flex justify-center items-center text-[14px] py-3 tracking-[0.02em] transition-all duration-150 md:flex-none",
    active: "text-fg border-accent font-semibold",
    inactive: "text-fg-muted hover:text-fg font-medium",
  },
  headline: {
    root: "bg-bg/95 backdrop-blur-sm",
    header: "px-4 md:px-10",
    tabsViewport: "border-t border-border",
    tabsList: "w-max max-w-full px-4 md:px-10 pt-3",
    tab: "text-[13px] py-1.5 tracking-[0.02em] -mb-[1px] flex-shrink-0 md:flex-none",
    active: "text-fg border-fg font-medium",
    inactive: "text-fg-muted hover:text-fg-light font-normal",
  },
};

export function TopStickyBar({
  tabs,
  activeTabId,
  title,
  subtitle,
  navAriaLabel = "Page sections",
  variant = "default",
  rootClassName,
  headerClassName,
  titleClassName,
  subtitleClassName,
  tabsViewportClassName,
  tabsListClassName,
  tabClassName,
  activeTabClassName,
  inactiveTabClassName,
  badgeClassName,
  countClassName,
}: TopStickyBarProps) {
  const variantStyles = STYLES_BY_VARIANT[variant];

  if (process.env.NODE_ENV !== "production" && tabs.every((tab) => tab.id !== activeTabId)) {
    console.warn(
      `[TopStickyBar] activeTabId "${activeTabId}" does not match any tab id.`,
      tabs.map((tab) => tab.id)
    );
  }

  return (
    <nav
      aria-label={navAriaLabel}
      className={cn(
        "sticky top-0 z-40 bg-bg border-b border-border md:top-[var(--site-header-sticky-offset,4.5rem)]",
        "md:mb-4",
        variantStyles.root,
        rootClassName
      )}
    >
      {(title || subtitle) && (
        <div className={cn("pt-4 pb-0", variantStyles.header, headerClassName)}>
          {title ? (
            <h1 className={cn("font-sans text-[20px] font-semibold text-fg tracking-tight", titleClassName)}>
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className={cn("text-[12px] text-fg-muted font-sans mt-0.5 mb-4", subtitleClassName)}>
              {subtitle}
            </p>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "overflow-x-auto scrollbar-hide md:flex md:justify-center md:overflow-x-visible",
          variantStyles.tabsViewport,
          tabsViewportClassName
        )}
      >
        <div
          className={cn(
            "flex items-center flex-nowrap gap-6 w-max max-w-full",
            variantStyles.tabsList,
            tabsListClassName
          )}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isPassiveTab = !("href" in tab) && !("onClick" in tab);
            const isDisabled = tab.disabled || isPassiveTab;
            const content = (
              <>
                {tab.mobileLabel ? (
                  <>
                    <span className="md:hidden">{tab.mobileLabel}</span>
                    <span className="hidden md:inline">{tab.label}</span>
                  </>
                ) : (
                  <span>{tab.label}</span>
                )}
                {(tab.badgeCount ?? 0) > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center unread-notification-badge text-[9px] font-sans tabular-nums w-4 h-4 rounded-full ml-1.5 align-middle",
                      badgeClassName
                    )}
                  >
                    {tab.badgeCount}
                  </span>
                )}
                {typeof tab.count === "number" && (
                  <span className={cn("text-[11px] text-fg-muted font-sans tabular-nums ml-1", countClassName)}>
                    {tab.count}
                  </span>
                )}
              </>
            );

            const classes = cn(
              "whitespace-nowrap border-b-4 border-transparent -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/10 rounded-sm",
              variantStyles.tab,
              tabClassName,
              isActive
                ? cn(variantStyles.active, activeTabClassName)
                : cn(variantStyles.inactive, inactiveTabClassName),
              isDisabled && "opacity-45 cursor-not-allowed pointer-events-none"
            );

            if ("href" in tab && typeof tab.href === "string") {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(classes, "no-underline")}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={"onClick" in tab ? tab.onClick : undefined}
                aria-pressed={isActive}
                aria-disabled={isDisabled}
                disabled={isDisabled}
                className={classes}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
