"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ChatList } from "./ChatList";

export function ChatPageMobile() {
  const [activeTab, setActiveTab] = useState<
    "all" | "requests" | "archived"
  >("all");
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-full select-none">
      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-bg">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search people or messages"
            value={search}
            onChange={function (e) {
              setSearch(e.target.value);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-border/60 text-fg text-[16px] placeholder:text-fg-muted border-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25 focus:bg-border/80 select-text"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Tabs: All | Requests | Archived */}
      <div className="shrink-0 border-b border-border bg-bg">
        <div className="grid grid-cols-3 w-full">
          <button
            type="button"
            onClick={function () {
              setActiveTab("all");
            }}
            className={cn(
              "py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px text-center px-1",
              activeTab === "all"
                ? "text-fg border-accent"
                : "text-fg-muted border-transparent hover:text-fg-light"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={function () {
              setActiveTab("requests");
            }}
            className={cn(
              "py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px text-center px-1",
              activeTab === "requests"
                ? "text-fg border-accent"
                : "text-fg-muted border-transparent hover:text-fg-light"
            )}
          >
            Requests
          </button>
          <button
            type="button"
            onClick={function () {
              setActiveTab("archived");
            }}
            className={cn(
              "py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px text-center px-1",
              activeTab === "archived"
                ? "text-fg border-accent"
                : "text-fg-muted border-transparent hover:text-fg-light"
            )}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatList
          showHeader={false}
          searchQuery={
            activeTab === "all" ||
            activeTab === "archived" ||
            activeTab === "requests"
              ? search
              : ""
          }
          conversationFilter={
            activeTab === "archived"
              ? "archived"
              : activeTab === "requests"
                ? "requests"
                : "active"
          }
        />
      </div>
    </div>
  );
}
