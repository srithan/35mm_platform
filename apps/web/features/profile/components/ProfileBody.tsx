"use client";

import { ProfileSidebarTabs, ProfileStickyTabs } from "./ProfileTabs";
import { ProfileTabContent } from "./ProfileTabContent";

export function ProfileBody(props: {
  username: string;
  displayName: string;
}) {
  return (
    <div className="pt-5">
      <div className="-mx-5 sm:-mx-6 md:-mx-8 lg:mx-0">
        <div className="lg:hidden mb-6">
          <ProfileStickyTabs />
        </div>
      </div>
      <div className="flex gap-11 lg:gap-12 items-start">
        <ProfileSidebarTabs />
        <div className="min-w-0 flex-1">
          <ProfileTabContent username={props.username} displayName={props.displayName} />
        </div>
      </div>
    </div>
  );
}
