"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { personRoleForCredit } from "@/lib/routing/personRoles";
import type { TMDBPerson } from "@/lib/tmdb/types";
import {
  groupKeyTitleCrew,
  groupTitleCrewByDepartment,
  titleCrewCreditCount,
} from "../lib/titleCrew";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

type TitleCrewSectionProps = {
  crew: TMDBPerson[];
};

function CrewNameLink(props: { person: TMDBPerson }) {
  const routeRole = personRoleForCredit({
    department: props.person.department,
    job: props.person.job,
  });
  return (
    <Link
      href={ROUTES.PERSON_ROLE(props.person.slug || String(props.person.id), routeRole)}
      className="font-medium text-fg underline decoration-fg/20 underline-offset-[0.2em] transition hover:decoration-fg/60"
    >
      {props.person.name}
    </Link>
  );
}

function CrewCreditRow(props: {
  role: string;
  members: TMDBPerson[];
}) {
  return (
    <li className="grid grid-cols-[minmax(0,38%)_minmax(1.5rem,1fr)_minmax(0,42%)] items-baseline gap-x-3 sm:grid-cols-[minmax(0,11rem)_minmax(2rem,1fr)_minmax(0,1fr)]">
      <span className="text-[14px] leading-snug text-fg-muted">{props.role}</span>
      <span
        aria-hidden
        className="min-h-px self-end border-b border-dotted border-fg/20 pb-[0.35em]"
      />
      <span className="text-right text-[14px] leading-snug text-fg">
        {props.members.map(function (person, index) {
          return (
            <span key={person.id + "-" + props.role}>
              {index > 0 ? (
                <span aria-hidden className="text-fg-muted">
                  {", "}
                </span>
              ) : null}
              <CrewNameLink person={person} />
            </span>
          );
        })}
      </span>
    </li>
  );
}

export function TitleCrewSection(props: TitleCrewSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const keyGroups = useMemo(function () {
    return groupKeyTitleCrew(props.crew);
  }, [props.crew]);
  const departments = useMemo(function () {
    return groupTitleCrewByDepartment(props.crew);
  }, [props.crew]);
  const allGroups = departments.flatMap(function (department) {
    return department.groups;
  });
  const totalCreditCount = titleCrewCreditCount(allGroups);
  const keyCreditCount = titleCrewCreditCount(keyGroups);
  const hasCondensedView =
    keyGroups.length > 0 && keyCreditCount < totalCreditCount;
  const showAll = expanded || !hasCondensedView;

  if (allGroups.length === 0) {
    return (
      <p className="text-sm text-fg-muted">Crew credits are not available.</p>
    );
  }

  return (
    <section aria-label="Crew">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <TitleSectionTitle>Crew</TitleSectionTitle>
          <p className="mt-1 text-xs text-fg-muted">
            {showAll
              ? totalCreditCount +
                (totalCreditCount === 1
                  ? " credit across all departments"
                  : " credits across all departments")
              : "Key crew and craft credits"}
          </p>
        </div>
        {hasCondensedView ? (
          <button
            type="button"
            aria-expanded={showAll}
            aria-controls="title-crew-credits"
            onClick={function () {
              setExpanded(function (current) {
                return !current;
              });
            }}
            className="min-h-9 rounded-full border border-border-strong px-3 text-xs font-semibold text-fg transition hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {showAll
              ? "Show key crew"
              : "View all " + totalCreditCount + " credits"}
          </button>
        ) : null}
      </div>

      <div id="title-crew-credits">
        {showAll ? (
          <div className="flex flex-col gap-8">
            {departments.map(function (department) {
              return (
                <section
                  key={department.department}
                  aria-labelledby={
                    "crew-department-" +
                    department.department
                      .toLocaleLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                  }
                >
                  <h3
                    id={
                      "crew-department-" +
                      department.department
                        .toLocaleLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                    }
                    className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted"
                  >
                    {department.department}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {department.groups.map(function (group) {
                      return (
                        <CrewCreditRow
                          key={group.department + "-" + group.job}
                          role={group.job}
                          members={group.members}
                        />
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {keyGroups.map(function (group) {
              return (
                <CrewCreditRow
                  key={group.department + "-" + group.job}
                  role={group.job}
                  members={group.members}
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
