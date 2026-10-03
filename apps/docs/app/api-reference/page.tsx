import { Reference } from "../../components/reference";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "API Reference · 35mm", robots: { index: false, follow: false } };
export default function Page() { return <main className="reference-shell"><Reference /></main>; }
