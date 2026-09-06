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
    <div
      role="status"
      aria-label="Loading title"
      className="min-h-screen bg-bg"
    >
      <div
        aria-hidden
        className="h-[200px] bg-sunken motion-safe:animate-pulse sm:h-[360px]"
      />
      <div
        aria-hidden
        className="relative mx-auto -mt-16 grid max-w-[1120px] grid-cols-[92px_minmax(0,1fr)] gap-5 px-5 sm:-mt-24 sm:grid-cols-[184px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-12"
      >
        <div className="aspect-[2/3] rounded-sm bg-sunken-2" />
        <div className="space-y-4 pt-20 sm:pt-28">
          <div className="h-10 w-5/6 rounded bg-sunken" />
          <div className="h-4 w-1/2 rounded bg-sunken" />
          <div className="h-4 w-1/3 rounded bg-sunken" />
        </div>
        <div className="space-y-3">
          <div className="h-11 rounded-full bg-sunken" />
          <div className="h-11 rounded-full bg-sunken" />
        </div>
        <div className="space-y-4">
          <div className="h-4 rounded bg-sunken" />
          <div className="h-4 rounded bg-sunken" />
          <div className="h-4 w-3/4 rounded bg-sunken" />
        </div>
      </div>
    </div>
  );
}
