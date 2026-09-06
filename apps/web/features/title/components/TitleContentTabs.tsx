import { cn } from "@/lib/utils/cn";

export type TitleContentTab = "reviews" | "about" | "cast" | "more";

const TABS: {
  id: TitleContentTab;
  label: string;
  panel: string;
}[] = [
  { id: "reviews", label: "Reviews", panel: "title-reviews-panel" },
  { id: "about", label: "About", panel: "title-panel-about" },
  { id: "cast", label: "Cast & crew", panel: "title-panel-cast" },
  { id: "more", label: "More like this", panel: "title-panel-more" },
];

export function TitleContentTabs(props: {
  contentTab: TitleContentTab;
  onSelectTab: (tab: TitleContentTab) => void;
}) {
  const activeIndex = TABS.findIndex(function (tab) {
    return tab.id === props.contentTab;
  });

  return (
    <div
      role="tablist"
      aria-label="Title page sections"
      className="flex gap-6 overflow-x-auto border-b border-border-strong scrollbar-hide sm:gap-8"
    >
      {TABS.map(function (tab, index) {
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={"title-tab-" + tab.id}
            aria-selected={props.contentTab === tab.id}
            aria-controls={tab.panel}
            tabIndex={props.contentTab === tab.id ? 0 : -1}
            onClick={function () {
              props.onSelectTab(tab.id);
            }}
            onKeyDown={function (event) {
              let next: number | null = null;
              if (event.key === "Home") {
                next = 0;
              } else if (event.key === "End") {
                next = TABS.length - 1;
              } else if (event.key === "ArrowRight") {
                next = (activeIndex + 1) % TABS.length;
              } else if (event.key === "ArrowLeft") {
                next = (activeIndex - 1 + TABS.length) % TABS.length;
              }
              if (next === null) return;
              event.preventDefault();
              props.onSelectTab(TABS[next].id);
              document.getElementById("title-tab-" + TABS[next].id)?.focus();
            }}
            className={cn(
              "-mb-px min-h-12 shrink-0 border-b-2 px-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
              props.contentTab === tab.id
                ? "border-fg font-semibold text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
