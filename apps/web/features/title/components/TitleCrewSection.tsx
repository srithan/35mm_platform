import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import type { TMDBPerson } from "@/lib/tmdb/types";
import { groupTitleCrew } from "../lib/titleCrew";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

type TitleCrewSectionProps = {
  crew: TMDBPerson[];
};

function CrewNameLink(props: { person: TMDBPerson }) {
  return (
    <Link
      href={ROUTES.PERSON(props.person.id)}
      className="font-medium text-fg underline decoration-fg/20 underline-offset-[0.2em] transition hover:decoration-fg/60"
    >
      {props.person.name}
    </Link>
  );
}

function CrewCreditRow(props: { role: string; members: TMDBPerson[] }) {
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
  const groups = groupTitleCrew(props.crew);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-fg-muted">Crew credits are not available.</p>
    );
  }

  return (
    <section aria-label="Crew">
      <TitleSectionTitle className="mb-5">Crew</TitleSectionTitle>
      <ul className="flex flex-col gap-3">
        {groups.map(function (group) {
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
}
