import { cn } from "@/lib/utils/cn";

type Tab = "overview" | "reviews";
export function TitleContentTabs(props: {
  contentTab: Tab;
  onSelectOverview: () => void;
  onSelectReviews: () => void;
}) {
  const tabs = [
    {
      id: "reviews",
      label: "Reviews",
      select: props.onSelectReviews,
      panel: "title-reviews-panel",
    },
    {
      id: "overview",
      label: "Cast & details",
      select: props.onSelectOverview,
      panel: "title-panel-overview",
    },
  ] as const;
  return (
    <div
      role="tablist"
      aria-label="Title page sections"
      className="flex gap-8 border-b border-border-strong"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={"title-tab-" + tab.id}
          aria-selected={props.contentTab === tab.id}
          aria-controls={tab.panel}
          tabIndex={props.contentTab === tab.id ? 0 : -1}
          onClick={tab.select}
          onKeyDown={(event) => {
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 1
                  : ["ArrowLeft", "ArrowRight"].includes(event.key)
                    ? 1 - index
                    : null;
            if (next === null) return;
            event.preventDefault();
            tabs[next].select();
            document.getElementById("title-tab-" + tabs[next].id)?.focus();
          }}
          className={cn(
            "-mb-px min-h-12 border-b-2 px-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
            props.contentTab === tab.id
              ? "border-fg font-semibold text-fg"
              : "border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
