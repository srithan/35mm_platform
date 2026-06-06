import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import styles from "@/components/layout/SiteHeader/SiteHeader.module.css";

function NotifSkeletonBar(props: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-sm",
        "bg-gradient-to-r from-skeleton via-skeleton-strong to-skeleton",
        "bg-skeleton-shimmer animate-skeleton-shimmer",
        props.className
      )}
    />
  );
}

function NotificationRowSkeleton(props: { index: number }) {
  var textWidths = ["w-[88%]", "w-[72%]", "w-[80%]"] as const;
  var textWidth = textWidths[props.index % textWidths.length];

  return (
    <li className={styles.dropdownListItem} aria-hidden>
      <div className={cn(styles.dropdownRow, styles.dropdownRowNotif)}>
        <NotifSkeletonBar className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
        <NotifSkeletonBar className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
        <div className={cn(styles.dropdownRowMain, "min-w-0 flex-1 pt-0.5")}>
          <NotifSkeletonBar className={cn("h-3 rounded", textWidth)} />
          <NotifSkeletonBar className="mt-2 h-2 w-12 rounded" />
        </div>
      </div>
    </li>
  );
}

export function NotificationDropdownSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map(function (_, index) {
        return <NotificationRowSkeleton key={"notif-skeleton-" + index} index={index} />;
      })}
    </>
  );
}

export function NotificationDropdownEmpty() {
  return (
    <li className={styles.dropdownListItem}>
      <div className={styles.dropdownEmptyState} role="status">
        <div className={styles.dropdownEmptyIconWrap} aria-hidden>
          <Clapperboard className={styles.dropdownEmptyIcon} strokeWidth={1.6} />
          <span className={styles.dropdownEmptyZzz}>z z z</span>
        </div>
        <p className={styles.dropdownEmptyHeadline}>All quiet on set</p>
        <p className={styles.dropdownEmptySubline}>
          Likes, follows, and mentions roll in here when the action starts.
        </p>
        <Link href={ROUTES.DISCOVER} className={styles.dropdownEmptyLink}>
          Browse Discover
        </Link>
      </div>
    </li>
  );
}
