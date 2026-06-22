"use client";

import Image from "next/image";
import {
  Clock,
  Film,
  Hash,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PrivateAccountLock } from "@/components/PrivateAccountLock";
import type { SearchResult } from "./types";

export interface SearchResultRowProps {
  item: SearchResult;
  index: number;
  isActive: boolean;
  onSelect: (item: SearchResult) => void;
  onHover: (index: number) => void;
  onRemoveRecent?: (id: string) => void;
  showRecentIcon?: boolean;
}

export function SearchResultRow({
  item,
  index,
  isActive,
  onSelect,
  onHover,
  onRemoveRecent,
  showRecentIcon = false,
}: SearchResultRowProps) {
  return (
    <li
      id={`searchbar-item-${index}`}
      role="option"
      aria-selected={isActive}
      className={cn(
        "group relative mx-1.5 my-0.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
        "transition-[background-color,transform,box-shadow] duration-150 ease-out",
        "hover:bg-sunken motion-safe:hover:translate-x-0.5",
        "active:scale-[0.995] motion-safe:active:translate-x-px",
        isActive &&
          "bg-[color-mix(in_srgb,var(--accent)_7%,var(--sunken))] shadow-[inset_2px_0_0_0_var(--accent)] motion-safe:translate-x-0.5",
      )}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(item);
      }}
    >
      {showRecentIcon ? (
        <Clock
          className="h-3.5 w-3.5 flex-shrink-0 text-fg-muted"
          aria-hidden
        />
      ) : (
        <SearchResultThumbnail item={item} />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="truncate text-[13px] font-medium leading-snug text-fg">
          <span>{item.label}</span>
          {item.type === "user" && item.isPrivate ? (
            <PrivateAccountLock className="ml-1.5 text-[12px]" />
          ) : null}
        </div>
        {item.sublabel ? (
          <div className="mt-0.5 truncate text-[11px] text-fg-muted">
            {item.sublabel}
          </div>
        ) : null}
      </div>

      {onRemoveRecent ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveRecent(item.id);
          }}
          className="rounded-sm p-0.5 text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
          aria-label={`Remove ${item.label} from recent searches`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </li>
  );
}

function SearchResultThumbnail({ item }: { item: SearchResult }) {
  if (item.type === "film") {
    return (
      <div className="flex h-11 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-hover text-fg-faint transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.03]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            width={32}
            height={44}
            className="h-full w-full object-cover"
            sizes="32px"
          />
        ) : (
          <Film className="h-4 w-4" />
        )}
      </div>
    );
  }

  if (item.type === "user") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-hover text-[11px] font-medium transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.04]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            width={32}
            height={32}
            className="h-full w-full object-cover"
            sizes="32px"
          />
        ) : (
          item.initial || <User className="h-4 w-4" />
        )}
      </div>
    );
  }

  if (item.type === "hashtag") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-[color-mix(in_srgb,var(--accent)_8%,var(--sunken))] text-accent transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.05]">
        <Hash className="h-4 w-4" />
      </div>
    );
  }

  if (item.type === "post") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-hover text-fg-muted transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.04]">
        <MessageSquare className="h-4 w-4" />
      </div>
    );
  }

  if (item.icon) {
    return (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        {item.icon}
      </span>
    );
  }

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
      <Search className="h-4 w-4 text-fg-muted" aria-hidden />
    </div>
  );
}
