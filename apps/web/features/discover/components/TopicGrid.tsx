"use client";

import { useState } from "react";
import { TOPICS } from "@/lib/constants/topics";
import { cn } from "@/lib/utils/cn";

export function TopicGrid() {
  const [active, setActive] = useState("All");

  return (
    <div className="flex gap-2 py-4 border-b border-border flex-wrap px-10">
      {TOPICS.map((topic) => (
        <button
          key={topic}
          onClick={() => setActive(topic)}
          className={cn(
            "text-[11px] border rounded-sm px-2.5 py-1 cursor-pointer transition-all",
            active === topic
              ? "bg-fg text-bg border-fg"
              : "text-fg-muted border-border hover:border-fg-muted hover:text-fg"
          )}
        >
          {topic}
        </button>
      ))}
    </div>
  );
}
