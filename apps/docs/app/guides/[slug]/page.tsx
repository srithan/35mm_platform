import { notFound } from "next/navigation";
import GettingStarted from "../../../content/guides/getting-started.mdx";
import Pagination from "../../../content/guides/pagination.mdx";
import Errors from "../../../content/guides/errors.mdx";
import RateLimiting from "../../../content/guides/rate-limiting.mdx";
import Idempotency from "../../../content/guides/idempotency.mdx";
import Realtime from "../../../content/guides/realtime.mdx";
import Auth from "../../../content/guides/auth.mdx";
import DataModelOverview from "../../../content/guides/data-model-overview.mdx";
import Changelog from "../../../content/guides/changelog.mdx";
const guides = { "getting-started": GettingStarted, pagination: Pagination, errors: Errors, "rate-limiting": RateLimiting, idempotency: Idempotency, realtime: Realtime, auth: Auth, "data-model-overview": DataModelOverview, changelog: Changelog };
export function generateStaticParams() { return Object.keys(guides).map(slug => ({ slug })); }
export default async function Page({ params }: { params: Promise<{slug:string}> }) { const { slug } = await params; const Guide = guides[slug as keyof typeof guides]; if (!Guide) notFound(); return <main className="shell prose"><Guide /></main>; }
