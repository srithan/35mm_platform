import type { Metadata } from "next";
import {
  renderTitleSlugPage,
  titleSlugMetadata,
} from "@/features/title/server/TitleSlugPage";

type PageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return params.then(function ({ slug }) {
    return titleSlugMetadata("movie", slug);
  });
}

export default async function FilmPage({ params }: PageProps) {
  const { slug } = await params;
  return renderTitleSlugPage("movie", slug);
}
