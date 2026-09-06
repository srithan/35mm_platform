import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { PersonShareButton } from "@/features/person/components/PersonShareButton";
import { ROUTES } from "@/lib/constants/routes";
import { tmdbItemToTitlePath } from "@/lib/title/paths";
import {
  COMPANY_TITLE_LIMIT,
  TMDB_COMPANY_PAGE,
  companyLogoUrl,
  companyTitleLabel,
  fetchCompanyPageData,
  type CompanyTitle,
} from "../lib/companyPage";

export async function getCompanyPageMetadata(id: string): Promise<Metadata> {
  if (!/^\d+$/.test(id)) {
    return { title: "Studio" };
  }
  const data = await fetchCompanyPageData(id);
  if (!data?.company) return { title: "Studio " + id };
  return { title: data.company.name };
}

export async function CompanyPageContent(props: { id: string }) {
  if (!/^\d+$/.test(props.id)) {
    notFound();
  }

  const data = await fetchCompanyPageData(props.id);
  if (!data?.company) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-semibold leading-none text-fg">
          Studio
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
          35mm could not load this studio. Open TMDB for the company catalog.
        </p>
        <a
          href={TMDB_COMPANY_PAGE + props.id}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2.5 text-[13px] font-semibold text-fg transition hover:border-fg/30"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
          <span>View on TMDB</span>
        </a>
      </div>
    );
  }

  const company = data.company;
  const titles = data.titles;
  const logo = companyLogoUrl(company.logo_path);
  const sharePath = ROUTES.COMPANY(company.id);
  const shareTitle = company.name + " on 35mm";
  const visibleTitles = titles.slice(0, COMPANY_TITLE_LIMIT);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <aside className="order-1 mx-auto w-full max-w-[620px] lg:order-2 lg:sticky lg:top-24 lg:max-w-none">
          <div className="flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-sm bg-sunken p-6 lg:max-w-none">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={company.name + " logo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="font-display text-6xl text-fg-muted">
                {company.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="mt-5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Studio
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-none text-fg">
              {company.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-fg-muted">
              {company.origin_country ? <span>{company.origin_country}</span> : null}
              {company.headquarters ? <span>{company.headquarters}</span> : null}
              <span>
                {titles.length}
                {titles.length === 1 ? " title" : " titles"}
              </span>
            </div>
            {company.parent_company ? (
              <p className="mt-3 text-[13px] text-fg-muted">
                Part of{" "}
                <Link
                  href={ROUTES.COMPANY(company.parent_company.id)}
                  className="font-medium text-fg underline decoration-fg/20 underline-offset-[0.2em] transition hover:decoration-fg/60"
                >
                  {company.parent_company.name}
                </Link>
              </p>
            ) : null}
            {company.description ? (
              <p className="mt-4 line-clamp-[8] text-[13px] leading-relaxed text-fg-muted">
                {company.description}
              </p>
            ) : null}
            {company.homepage ? (
              <a
                href={company.homepage}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
                Official site
              </a>
            ) : null}
            <PersonShareButton path={sharePath} title={shareTitle} />
          </div>
        </aside>

        <section className="order-2 min-w-0 lg:order-1">
          <div className="mb-5 min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Titles
            </p>
            <h2 className="mt-1 text-balance font-display text-3xl font-semibold leading-none text-fg sm:text-4xl">
              {company.name}
            </h2>
            <p className="mt-2 text-[12px] text-fg-muted">
              {titles.length}
              {titles.length === 1 ? " title" : " titles"}
            </p>
          </div>
          {visibleTitles.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
              {visibleTitles.map(function (title: CompanyTitle) {
                const label = companyTitleLabel(title);
                const year = yearFromDate(
                  title.release_date || title.first_air_date || "",
                );
                const description = [label, year].filter(Boolean).join(" · ");
                const poster = posterUrl(title.poster_path, "w342");
                return (
                  <Link
                    key={title.media_type + "-" + title.id}
                    href={tmdbItemToTitlePath(title)}
                    aria-label={description}
                    title={description}
                    className="group aspect-[2/3] overflow-hidden rounded-sm bg-sunken outline-2 outline-offset-2 transition-[outline-color] duration-150 hover:outline hover:outline-fg/80 focus-visible:outline focus-visible:outline-fg motion-reduce:transition-none"
                  >
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-3 text-center text-[12px] font-semibold text-fg-muted">
                        {label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-sm border border-dashed border-border bg-sunken/40 px-4 py-8 text-center text-[13px] text-fg-muted">
              No titles available.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
