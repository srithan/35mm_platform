import { cn } from "@/lib/utils/cn";
import { MOCK_TITLE_REVIEW_TOTAL } from "../data/mockTitleReviews";

type Tab = "overview" | "reviews";

type TitleContentTabsProps = {
  contentTab: Tab;
  onSelectOverview: () => void;
  onSelectReviews: () => void;
};

export function TitleContentTabs(props: TitleContentTabsProps) {
  return (
    <div
      className="mt-8 border-b border-border"
      role="tablist"
      aria-label="Title page sections"
    >
      <div className="flex gap-8 sm:gap-10">
        <button
          type="button"
          className={cn(
            "relative -mb-px border-b-2 border-transparent pb-3 pt-1 text-left text-[15px] transition-colors",
            props.contentTab === "overview"
              ? "border-fg font-semibold text-fg"
              : "font-medium text-fg-muted hover:text-fg/75"
          )}
          role="tab"
          id="title-tab-overview"
          aria-selected={props.contentTab === "overview"}
          aria-controls="title-panel-overview"
          tabIndex={props.contentTab === "overview" ? 0 : -1}
          onClick={props.onSelectOverview}
        >
          Overview
        </button>
        <button
          type="button"
          className={cn(
            "relative -mb-px flex min-w-0 items-baseline gap-2 border-b-2 border-transparent pb-3 pt-1 text-left text-[15px] transition-colors",
            props.contentTab === "reviews"
              ? "border-fg font-semibold text-fg"
              : "font-medium text-fg-muted hover:text-fg/75"
          )}
          role="tab"
          id="title-tab-reviews"
          aria-selected={props.contentTab === "reviews"}
          aria-controls="title-reviews-panel"
          tabIndex={props.contentTab === "reviews" ? 0 : -1}
          onClick={props.onSelectReviews}
        >
          <span>Reviews</span>
          <span className="text-[13px] font-normal tabular-nums text-fg-muted">
            {MOCK_TITLE_REVIEW_TOTAL.toLocaleString()}
          </span>
        </button>
      </div>
    </div>
  );
}
