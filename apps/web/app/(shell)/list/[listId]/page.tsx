import type { Metadata } from "next";
import { ListDetailContent } from "@/features/lists/components/ListDetailContent";

interface ListPageProps {
  params: Promise<{ listId: string }>;
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { listId } = await params;
  return {
    title: "List",
    description: `Film list ${listId} on 35mm`,
    robots: { index: false, follow: false },
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const { listId } = await params;
  return <ListDetailContent listId={listId} />;
}
