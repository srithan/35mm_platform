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

const stroke = 1.75;
const icoSm = "h-3.5 w-3.5 shrink-0 opacity-55";

function GlanceMetric(props: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
        <span aria-hidden>{props.icon}</span>
        {props.label}
      </dt>
      <dd className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-fg">{props.value}</dd>
    </div>
  );
}

function GlanceDetailRow(props: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[8.25rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-8">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
        <span aria-hidden>{props.icon}</span>
        {props.label}
      </dt>
      <dd className="text-[14px] leading-[1.55] text-fg/90">{props.value}</dd>
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

export function TitleAtAGlance(props: TitleAtAGlanceProps) {
  const d = props.detail;
  const stats: { label: string; value: string; icon: ReactNode; key: string }[] = [];

  if (props.yearStr) {
    stats.push({
      key: "year",
      label: props.isTv ? "First aired" : "Release",
      value: props.yearStr,
      icon: <Calendar className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (props.certification) {
    stats.push({
      key: "cert",
      label: "Content rating",
      value: props.certification,
      icon: <Shield className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (d.status) {
    stats.push({
      key: "status",
      label: "Status",
      value: d.status,
      icon: <PlayCircle className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.runtime && d.runtime > 0) {
    stats.push({
      key: "runtime",
      label: "Runtime",
      value: d.runtime + " min",
      icon: <Clock className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (props.isTv && d.number_of_seasons != null) {
    stats.push({
      key: "seasons",
      label: "Seasons",
      value: String(d.number_of_seasons),
      icon: <Layers className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (props.isTv && d.number_of_episodes != null) {
    stats.push({
      key: "epcount",
      label: "Total episodes",
      value: String(d.number_of_episodes),
      icon: <ListVideo className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.budget != null && d.budget > 0) {
    stats.push({
      key: "budget",
      label: "Budget",
      value: "$" + (d.budget / 1000000).toFixed(1) + "M",
      icon: <DollarSign className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && d.revenue != null && d.revenue > 0) {
    stats.push({
      key: "revenue",
      label: "Box office",
      value: "$" + (d.revenue / 1000000).toFixed(1) + "M",
      icon: <TrendingUp className={icoSm} strokeWidth={stroke} />,
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

  const detailRows: { key: string; label: string; value: string; icon: ReactNode }[] = [];

  if (props.creators) {
    detailRows.push({
      key: "creators",
      label: "Created by",
      value: props.creators,
      icon: <UserCircle className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && props.directors) {
    detailRows.push({
      key: "directors",
      label: "Directed by",
      value: props.directors,
      icon: <Clapperboard className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (!props.isTv && props.writers) {
    detailRows.push({
      key: "writers",
      label: "Written by",
      value: props.writers,
      icon: <Pencil className={icoSm} strokeWidth={stroke} />,
    });
  }
  if (studiosText) {
    detailRows.push({
      key: "studios",
      label: "Studios",
      value: studiosText,
      icon: <Building2 className={icoSm} strokeWidth={stroke} />,
    });
  }

  const hasAny = stats.length > 0 || detailRows.length > 0;

  if (!hasAny) return null;

  return (
    <section className="min-w-0" aria-label="Key facts at a glance">
      <TitleSectionTitle className="mb-3">At a glance</TitleSectionTitle>

      <div className="min-w-0">
        {stats.length > 0 ? (
          <dl
            className={cn(
              "grid list-none gap-x-6 gap-y-5 p-0",
              stats.length === 1 && "grid-cols-1",
              stats.length === 2 && "grid-cols-2",
              stats.length >= 3 && "grid-cols-2 sm:grid-cols-3",
              stats.length >= 5 && "lg:grid-cols-4"
            )}
          >
            {stats.map(function (s) {
              return (
                <GlanceMetric key={s.key} label={s.label} value={s.value} icon={s.icon} />
              );
            })}
          </dl>
        ) : null}

        {detailRows.length > 0 ? (
          <dl
            className={cn(
              "flex list-none flex-col gap-4 p-0",
              stats.length > 0 && "mt-5 border-t border-border/50 pt-5"
            )}
          >
            {detailRows.map(function (row) {
              return (
                <GlanceDetailRow
                  key={row.key}
                  label={row.label}
                  value={row.value}
                  icon={row.icon}
                />
              );
            })}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
