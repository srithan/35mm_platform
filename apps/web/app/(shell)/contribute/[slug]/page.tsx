import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContributionFormPage } from "@/features/contribute/components/ContributionFormPage";
import { CONTRIBUTION_CONFIG_BY_SLUG } from "@/features/contribute/lib/contributionConfig";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const config = CONTRIBUTION_CONFIG_BY_SLUG.get(resolved.slug as never);
  if (!config) {
    return {
      title: "Contribute",
    };
  }
  return {
    title: config.title,
    description: config.description,
  };
}

export default async function ContributionKindPage({ params }: PageProps) {
  const resolved = await params;
  const config = CONTRIBUTION_CONFIG_BY_SLUG.get(resolved.slug as never);
  if (!config) notFound();
  return <ContributionFormPage config={config} />;
}
