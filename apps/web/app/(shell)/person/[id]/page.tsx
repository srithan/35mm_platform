import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

type PageProps = { params: Promise<{ id: string }> };

const TMDB_PERSON = "https://www.themoviedb.org/person/";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return { title: "Person" };
  }
  return { title: "Person " + id + " — 35mm" };
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-xl font-bold tracking-[-0.02em] text-fg">Cast &amp; crew</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-fg/80">
        35mm doesn&apos;t have a person profile for this ID yet. Open TMDB for full filmography and
        photos.
      </p>
      <a
        href={TMDB_PERSON + id}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-border bg-elevated px-4 py-3 text-[13px] font-semibold text-fg transition hover:border-fg/30"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
        <span>View on TMDB</span>
      </a>
      <p className="mt-8 text-[13px] text-fg-muted">
        <Link href={ROUTES.DISCOVER} className="font-medium text-accent hover:underline">
          Discover
        </Link>{" "}
        ·{" "}
        <Link href={ROUTES.HOME} className="font-medium text-accent hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
