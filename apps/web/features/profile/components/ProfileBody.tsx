"use client";

import { Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ProfileTabs } from "./ProfileTabs";
import { ProfileTabContent } from "./ProfileTabContent";
import { ProfileDetails } from "./ProfileDetails";
import { resolveProfileTabFromPathname } from "@/features/profile/lib/profileRoutes";

export function ProfileBody(props: {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  dateOfBirth?: string | null;
  isOwnProfile?: boolean;
  isPrivate?: boolean;
  isPrivateGate?: boolean;
  role?: string | null;
  roleContext?: string | null;
  headline?: string | null;
  headlineContext?: string | null;
  followerCount: number;
  followingCount: number;
  filmsLoggedCount: number;
}) {
  var pathname = usePathname();
  var routeTab =
    resolveProfileTabFromPathname(pathname ?? "", props.username) ?? "posts";
  var [tab, setTab] = useState(routeTab);
  var pendingStickyScrollYRef = useRef<number | null>(null);
  var previousTabRef = useRef(tab);
  var stickyTop = "calc(var(--site-header-sticky-offset, 4.5rem) + 1rem)";
  var detailsProps = {
    username: props.username,
    displayName: props.displayName,
    bio: props.bio,
    location: props.location,
    website: props.website,
    dateOfBirth: props.dateOfBirth,
    isOwnProfile: props.isOwnProfile,
    isPrivate: props.isPrivate,
    role: props.role,
    roleContext: props.roleContext,
    headline: props.headline,
    headlineContext: props.headlineContext,
    filmsLoggedCount: props.filmsLoggedCount,
  };

  useEffect(
    function () {
      setTab(routeTab);
    },
    [routeTab]
  );

  useLayoutEffect(
    function () {
      if (previousTabRef.current === tab) return;
      previousTabRef.current = tab;

      var stickyScrollY = pendingStickyScrollYRef.current;
      pendingStickyScrollYRef.current = null;
      if (stickyScrollY == null) return;

      window.scrollTo({
        top: stickyScrollY,
        left: window.scrollX,
        behavior: "auto",
      });
    },
    [tab]
  );

  return (
    <div className="pt-2 md:pl-8 md:pt-5">
      <div className="mb-6 hidden px-5 sm:px-6 md:block lg:hidden">
        <ProfileDetails
          {...detailsProps}
          followerCount={props.followerCount}
          followingCount={props.followingCount}
          filmsLoggedCount={props.filmsLoggedCount}
          showInlineStats
        />
      </div>

      <div className="grid items-start gap-11 lg:grid-cols-[242px_minmax(0,1fr)] lg:gap-12">
        <aside
          className="hidden lg:flex lg:w-[242px] lg:shrink-0 lg:flex-col lg:self-start lg:pb-12 lg:pt-10 lg:sticky"
          style={{ top: stickyTop }}
        >
          <ProfileDetails {...detailsProps} />
        </aside>

        <div className="min-w-0">
          <div className="w-full max-w-[640px] lg:ml-auto lg:border-l lg:border-border xl:w-[640px] xl:max-w-[640px]">
            <ProfileTabs
              username={props.username}
              activeTab={tab}
              onTabNavigation={setTab}
              onStickyNavigation={function (scrollY) {
                pendingStickyScrollYRef.current = scrollY;
              }}
            />
            <div className="min-h-[calc(100dvh-var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))-3.25rem)] [overflow-anchor:none] md:min-h-[calc(100dvh-var(--site-header-sticky-offset,4.5rem)-3.25rem)]">
              {props.isPrivateGate ? (
                <EmptyState
                  size="lg"
                  icon={
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-fg-muted">
                      <Lock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                    </span>
                  }
                  headline="This account is private"
                  subline={`Follow ${props.displayName} to see their posts`}
                />
              ) : (
                <ProfileTabContent
                  username={props.username}
                  displayName={props.displayName}
                  tab={tab}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
