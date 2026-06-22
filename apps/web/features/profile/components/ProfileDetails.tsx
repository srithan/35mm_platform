"use client";

import { MapPin, Link2, Calendar } from "lucide-react";
import { PrivateAccountLock } from "@/components/PrivateAccountLock";
import { formatRoleContextSegment, getRoleDotColor } from "@/lib/utils/userRoleHeadline";
import { ProfileStats } from "./ProfileStats";

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (t.length === 0) {
    return "#";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return "https://" + t;
}

function formatDateOfBirth(raw: string): string | null {
  const t = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const dt = new Date(t + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

const metaRowClass =
  "flex max-w-full min-w-0 items-center gap-2 text-[12px] font-medium leading-[1.35] text-fg-muted";
const metaLinkClass =
  metaRowClass +
  " no-underline transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const headlinePillClass =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-[#fbf7f6] px-3.5 py-1.5";

function ProfileHeadline(props: {
  headline?: string | null;
  headlineContext?: string | null;
  role?: string | null;
  roleContext?: string | null;
}) {
  const headline = props.headline?.trim() ?? "";
  const headlineContext = props.headlineContext?.trim() ?? "";
  const role = props.role?.trim() ?? "";

  if (headline.length > 0) {
    return (
      <div className={headlinePillClass + " mt-2.5"}>
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" aria-hidden />
        <span className="min-w-0 text-[12.5px] font-semibold leading-none text-accent">
          {headline}
          {headlineContext.length > 0 ? <span className="font-semibold"> · {headlineContext}</span> : null}
        </span>
      </div>
    );
  }

  if (role.length > 0) {
    const context = formatRoleContextSegment(role, { roleContext: props.roleContext }) ?? "";
    const dotColor = getRoleDotColor(role);

    return (
      <div className={headlinePillClass + " mt-2.5"}>
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <span className="min-w-0 text-[12.5px] font-semibold leading-none text-accent">
          {role}
          {context.length > 0 ? <span className="font-semibold"> · {context}</span> : null}
        </span>
      </div>
    );
  }

  return null;
}

export function ProfileDetails(props: {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  dateOfBirth?: string | null;
  isOwnProfile?: boolean;
  isPrivate?: boolean;
  role?: string | null;
  roleContext?: string | null;
  headline?: string | null;
  headlineContext?: string | null;
  followerCount?: number;
  followingCount?: number;
  filmsLoggedCount?: number;
  showInlineStats?: boolean;
}) {
  const bio = props.bio.trim();
  const location = props.location.trim();
  const website = props.website.trim();
  const dateOfBirth = props.dateOfBirth?.trim() ?? "";
  const formattedDob = formatDateOfBirth(dateOfBirth);
  const isOwnProfile = Boolean(props.isOwnProfile);
  const metaPlaceholderClass = metaRowClass + " text-fg-faint";

  return (
    <div className="w-full min-w-0">
      <div className="min-w-0">
	        <h1 className="font-sans text-[1.375rem] font-semibold leading-[1.12] tracking-[-0.02em] text-fg md:text-[1.4375rem]">
	          {props.displayName}
	        </h1>
	        <p className="mt-1 font-sans text-[13px] font-normal leading-none text-fg-muted">
	          <span>@{props.username}</span>
	          {props.isPrivate ? (
	            <PrivateAccountLock className="ml-1.5 text-[12px]" />
	          ) : null}
	        </p>
      </div>

      {props.showInlineStats &&
      typeof props.followerCount === "number" &&
      typeof props.followingCount === "number" &&
      typeof props.filmsLoggedCount === "number" ? (
        <div className="mt-3">
          <ProfileStats
            variant="inline"
            username={props.username}
            displayName={props.displayName}
            followerCount={props.followerCount}
            followingCount={props.followingCount}
            filmsLoggedCount={props.filmsLoggedCount}
            isOwnProfile={Boolean(props.isOwnProfile)}
          />
        </div>
      ) : null}

      <ProfileHeadline
        headline={props.headline}
        headlineContext={props.headlineContext}
        role={props.role}
        roleContext={props.roleContext}
      />

      {bio.length > 0 ? (
        <p className="mt-4 font-sans text-[14.5px] leading-[1.55] text-fg">{bio}</p>
      ) : isOwnProfile ? (
        <p className="mt-4 font-sans text-[14.5px] leading-[1.55] text-fg-faint">
          Add Profile Bio
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-col items-start gap-2">
        {location.length > 0 ? (
          <span className={metaRowClass}>
            <MapPin className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            {location}
          </span>
        ) : isOwnProfile ? (
          <span className={metaPlaceholderClass}>
            <MapPin className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            Add your location
          </span>
        ) : null}
        {website.length > 0 ? (
          <a
            href={websiteHref(website)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={"Visit " + website + " (opens in new tab)"}
            className={metaLinkClass}
          >
            <Link2 className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} aria-hidden />
            <span className="min-w-0 truncate">{website}</span>
          </a>
        ) : isOwnProfile ? (
          <span className={metaPlaceholderClass}>
            <Link2 className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            Add your links
          </span>
        ) : null}
        {formattedDob ? (
          <span className={metaRowClass}>
            <Calendar className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            Born {formattedDob}
          </span>
        ) : isOwnProfile ? (
          <span className={metaPlaceholderClass}>
            <Calendar className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            Add your date of birth
          </span>
        ) : null}
        <span className={metaRowClass}>
          <Calendar className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
          Joined Feb 2024
        </span>
      </div>
    </div>
  );
}
