"use client";

import { ProfileTabs } from "./ProfileTabs";
import { ProfileTabContent } from "./ProfileTabContent";
import { ProfileDetails } from "./ProfileDetails";

export function ProfileBody(props: {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  isPrivate?: boolean;
  role?: string | null;
  roleContext?: string | null;
  headline?: string | null;
  headlineContext?: string | null;
}) {
  const stickyTop = "calc(var(--site-header-sticky-offset, 4.5rem) + 1rem)";
  const detailsProps = {
    username: props.username,
    displayName: props.displayName,
    bio: props.bio,
    location: props.location,
    website: props.website,
    isPrivate: props.isPrivate,
    role: props.role,
    roleContext: props.roleContext,
    headline: props.headline,
    headlineContext: props.headlineContext,
  };

  return (
    <div className="pt-5 sm:pl-6 md:pl-8">
      <div className="mb-6 pt-10 lg:hidden">
        <ProfileDetails {...detailsProps} />
      </div>

      <div className="grid items-start gap-11 lg:grid-cols-[242px_minmax(0,1fr)] lg:gap-12">
        <aside
          className="hidden lg:flex lg:w-[242px] lg:shrink-0 lg:flex-col lg:self-start lg:border-r lg:border-border lg:pb-12 lg:pt-10 lg:sticky"
          style={{ top: stickyTop }}
        >
          <ProfileDetails {...detailsProps} />
        </aside>

        <div className="min-w-0">
          <div className="ml-auto w-full max-w-[640px] xl:w-[640px] xl:max-w-[640px]">
            <ProfileTabs />
            <ProfileTabContent username={props.username} displayName={props.displayName} />
          </div>
        </div>
      </div>
    </div>
  );
}
