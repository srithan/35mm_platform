import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

type PageProps = {
  params: Promise<{ reportId: string }>;
};

export const metadata: Metadata = {
  title: "Report Status",
  description: "Review what you reported and its current moderation status.",
  robots: { index: false, follow: false },
};

export default async function ReportStatusPage({ params }: PageProps) {
  const { reportId } = await params;
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(reportId)) notFound();
  return (
    <SettingsContent
      initialTab="Privacy"
      privacyList="reports"
      reportId={reportId}
    />
  );
}
