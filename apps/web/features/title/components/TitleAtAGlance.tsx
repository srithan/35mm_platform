import type { ReactNode } from "react";
import {
  Building2,
  Calendar,
  Clapperboard,
  Clock,
  DollarSign,
  Layers,
  ListVideo,
  Pencil,
  PlayCircle,
  Shield,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TMDBMedia } from "@/lib/tmdb/types";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

const iconInCircle =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
  "border border-border bg-sunken/90 text-fg/70 dark:bg-sunken/40 dark:text-fg/75";

const statCard =
  "flex gap-3 rounded-2xl border border-border bg-elevated/50 p-4 shadow-sm " +
  "dark:bg-sunken/25";

const textBlockBase =
  "flex gap-4 rounded-2xl border border-border bg-elevated/30 p-5 shadow-sm " +
  "dark:bg-sunken/20";

function GlanceStat(props: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className={statCard}>
      <div className={iconInCircle} aria-hidden>
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
          {props.label}
        </p>
        <p className="mt-1.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-fg">
          {props.value}
        </p>
      </div>
    </div>
  );
}

function GlanceTextBlock(props: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className={textBlockBase}>
      <div className={iconInCircle + " h-10 w-10 self-start"} aria-hidden>
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
          {props.label}
        </p>
        <p className="mt-2 text-[14px] font-medium leading-[1.6] text-fg/95">{props.value}</p>
      </div>
    </div>
  );
}

type TitleAtAGlanceProps = {
  isTv: boolean;
  yearStr: string;
  certification: string | undefined;
  detail: TMDBMedia;
  directors: string | undefined;
  creators: string | undefined;
  writers: string | undefined;
};

const stroke = 2;
const ico = "h-5 w-5";

export function TitleAtAGlance(props: TitleAtAGlanceProps) {
  const d = props.detail;
  const stats: { label: string; value: string; icon: ReactNode; key: string }[] = [];

  if (props.yearStr) {
    stats.push({
      key: "year",
      label: props.isTv ? "First aired" : "Release",
      value: props.yearStr,
      icon: <Calendar className={ico} strokeWidth={stroke} />,
    });
  }
  if (props.certification) {
    stats.push({
      key: "cert",
      label: "Content rating",
      value: props.certification,
      icon: <Shield className={ico} strokeWidth={stroke} />,
    });
  }
  if (d.status) {
    stats.push({
      key: "status",
      label: "Status",
      value: d.status,
      icon: <PlayCircle className={ico} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.runtime && d.runtime > 0) {
    stats.push({
      key: "runtime",
      label: "Runtime",
      value: d.runtime + " min",
      icon: <Clock className={ico} strokeWidth={stroke} />,
    });
  }
  if (props.isTv && d.number_of_seasons != null) {
    stats.push({
      key: "seasons",
      label: "Seasons",
      value: String(d.number_of_seasons),
      icon: <Layers className={ico} strokeWidth={stroke} />,
    });
  }
  if (props.isTv && d.number_of_episodes != null) {
    stats.push({
      key: "epcount",
      label: "Total episodes",
      value: String(d.number_of_episodes),
      icon: <ListVideo className={ico} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.budget != null && d.budget > 0) {
    stats.push({
      key: "budget",
      label: "Budget",
      value: "$" + (d.budget / 1000000).toFixed(1) + "M",
      icon: <DollarSign className={ico} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.revenue != null && d.revenue > 0) {
    stats.push({
      key: "revenue",
      label: "Box office",
      value: "$" + (d.revenue / 1000000).toFixed(1) + "M",
      icon: <TrendingUp className={ico} strokeWidth={stroke} />,
    });
  }

  const studiosText =
    d.production_companies && d.production_companies.length > 0
      ? d.production_companies
          .map(function (c) {
            return c.name;
          })
          .join(" · ")
      : "";

  const hasAny =
    stats.length > 0 ||
    Boolean(props.creators) ||
    (Boolean(props.directors) && !props.isTv) ||
    (Boolean(props.writers) && !props.isTv) ||
    Boolean(studiosText);

  if (!hasAny) return null;

  return (
    <section className="min-w-0" aria-label="Key facts at a glance">
      <TitleSectionTitle className="mb-5 text-xl sm:text-2xl">At a glance</TitleSectionTitle>

      {stats.length > 0 ? (
        <ul
          className={cn(
            "mb-4 grid list-none gap-3 p-0",
            "grid-cols-1 sm:grid-cols-2",
            stats.length >= 3 && "lg:grid-cols-3"
          )}
        >
          {stats.map(function (s) {
            return (
              <li key={s.key}>
                <GlanceStat label={s.label} value={s.value} icon={s.icon} />
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3">
        {props.creators ? (
          <GlanceTextBlock
            label="Created by"
            value={props.creators}
            icon={<UserCircle className="h-5 w-5" strokeWidth={stroke} />}
          />
        ) : null}
        {!props.isTv && props.directors ? (
          <GlanceTextBlock
            label="Directed by"
            value={props.directors}
            icon={<Clapperboard className="h-5 w-5" strokeWidth={stroke} />}
          />
        ) : null}
        {!props.isTv && props.writers ? (
          <GlanceTextBlock
            label="Written by"
            value={props.writers}
            icon={<Pencil className="h-5 w-5" strokeWidth={stroke} />}
          />
        ) : null}
        {studiosText ? (
          <div className={textBlockBase}>
            <div className={iconInCircle + " h-10 w-10 self-start"} aria-hidden>
              <Building2 className="h-5 w-5" strokeWidth={stroke} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                Studios
              </p>
              <p className="mt-2 text-[14px] font-medium leading-[1.65] text-fg/90">{studiosText}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
