import type { Metadata } from "next";
import {
  CompanyPageContent,
  getCompanyPageMetadata,
} from "@/features/company/components/CompanyPageContent";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return getCompanyPageMetadata(id);
}

export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params;
  return CompanyPageContent({ id });
}
