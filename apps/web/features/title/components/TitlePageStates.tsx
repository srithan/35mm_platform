import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export function TitleErrorState(props: { message?: string | null }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-fg-muted text-[15px] leading-relaxed">
        {props.message || "We couldn’t find this title."}
      </p>
      <Link
        href={ROUTES.DISCOVER}
        className="inline-flex mt-6 text-[14px] font-semibold text-fg underline decoration-fg/25 underline-offset-2 hover:decoration-fg/50"
      >
        Go to Discover
      </Link>
    </div>
  );
}

export function TitlePageLoadingState() {
  return (
    <div className="min-h-full w-full bg-gradient-to-b from-sunken/40 to-bg">
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-6">
        <div className="mb-7 h-[min(46vh,400px)] w-full rounded-3xl border border-fg/10 bg-sunken" />
        <div className="mx-auto mb-8 h-12 max-w-md rounded-2xl border border-fg/10 bg-sunken" />
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="h-8 w-2/3 max-w-lg rounded-lg bg-sunken" />
            <div className="h-4 w-full rounded bg-sunken" />
            <div className="h-4 w-4/5 rounded bg-sunken" />
          </div>
          <div className="hidden h-64 rounded-2xl border border-fg/10 bg-sunken/80 lg:block" />
        </div>
      </div>
    </div>
  );
}
