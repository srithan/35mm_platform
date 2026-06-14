"use client";

import Link from "next/link";
import { Copy, Heart, Pencil, Trash2 } from "lucide-react";
import type { FilmListEntry } from "@35mm/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { FilmPoster } from "@/components/FilmPoster";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatListMeta } from "../lib/listMeta";
import { useFilmList, useListMutations } from "../hooks/useLists";
import { ListEntriesPanel } from "./ListEntriesPanel";
import { ListEntryNoteModal } from "./ListEntryNoteModal";
import { ListEditorModal, type ListEditorValues } from "./ListEditorModal";
import { filmResultToFilmPayload } from "../api/listsApi";
import { joinListTags, parseListTags } from "../lib/listMeta";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function nextPositions(entries: FilmListEntry[]): Array<{ entryId: string; position: number }> {
  return entries.map(function (entry, index) {
    return { entryId: entry.id, position: (index + 1) * 10 };
  });
}

type ListDetailContentProps = {
  listId: string;
  isOwnProfile?: boolean;
};

export function ListDetailContent({ listId, isOwnProfile: isOwnProfileProp }: ListDetailContentProps) {
  const router = useRouter();
  const listQuery = useFilmList(listId);
  const list = listQuery.data ?? null;
  const isOwner = isOwnProfileProp ?? list?.isOwner ?? false;
  const mutations = useListMutations(list?.owner.username, listId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingFilm, setPendingFilm] = useState<FilmResult | null>(null);
  const [editingEntry, setEditingEntry] = useState<FilmListEntry | null>(null);

  const posters = useMemo(
    function () {
      if (!list) return [null, null, null];
      return (list.posterUrls.length ? list.posterUrls : [null, null, null]).slice(0, 3);
    },
    [list]
  );

  if (listQuery.isLoading) {
    return <div className="px-6 py-10 text-[13px] text-fg-muted">Loading list...</div>;
  }

  if (listQuery.isError || !list) {
    return (
      <EmptyState
        size="lg"
        headline="List not found"
        subline="This list may be private or no longer available."
        primaryCta={{ label: "Browse profiles", href: ROUTES.HOME }}
      />
    );
  }

  const resolvedList = list;

  function handleEditorSubmit(values: ListEditorValues) {
    var patch: Parameters<typeof mutations.updateList.mutate>[0]["patch"] = {
      visibility: values.visibility,
    };
    if (resolvedList.type !== "watchlist") {
      patch.title = values.title;
      patch.description = values.description || null;
      patch.isRanked = values.isRanked;
      patch.tags = parseListTags(values.tags);
    }
    mutations.updateList.mutate(
      { id: resolvedList.id, patch },
      {
        onSuccess: function () {
          setEditorOpen(false);
        },
      }
    );
  }

  function handleAddFilm(film: FilmResult) {
    if (resolvedList.type === "watchlist") {
      mutations.addEntry.mutate({
        id: resolvedList.id,
        film: filmResultToFilmPayload(film),
        note: null,
      });
      return;
    }
    setPendingFilm(film);
    setEditingEntry(null);
    setNoteModalOpen(true);
  }

  function handleNoteSubmit(note: string | null) {
    if (editingEntry) {
      mutations.updateEntry.mutate(
        { id: resolvedList.id, entryId: editingEntry.id, note },
        { onSuccess: function () { setNoteModalOpen(false); setEditingEntry(null); } }
      );
      return;
    }
    if (!pendingFilm) return;
    mutations.addEntry.mutate(
      {
        id: resolvedList.id,
        film: filmResultToFilmPayload(pendingFilm),
        note,
      },
      {
        onSuccess: function () {
          setNoteModalOpen(false);
          setPendingFilm(null);
        },
      }
    );
  }

  function handleMoveEntry(entryIndex: number, direction: -1 | 1) {
    var entries = [...resolvedList.entries];
    var nextIndex = entryIndex + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    var temp = entries[entryIndex];
    entries[entryIndex] = entries[nextIndex];
    entries[nextIndex] = temp;
    mutations.reorderEntries.mutate({ id: resolvedList.id, entries: nextPositions(entries) });
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-6 md:px-6">
      <div className="flex gap-3">
        {posters.map(function (src, i) {
          return (
            <div key={i} className="relative z-[3] -mr-2 w-14 shrink-0 last:mr-0">
              <FilmPoster src={src} alt="" size="list" />
            </div>
          );
        })}
      </div>

      <h1 className="mt-4 font-display text-[1.6rem] font-semibold leading-tight text-fg">{list.title}</h1>
      <p className="mt-2 text-[13px] text-fg-muted">
        by{" "}
        <UsernameLink username={list.owner.username} displayName={list.owner.displayName} />
      </p>
      {list.description ? (
        <p className="mt-3 text-[14px] leading-relaxed text-fg-light">{list.description}</p>
      ) : null}
      <p className="mt-3 text-[12px] text-fg-muted">{formatListMeta(list)}</p>

      {list.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {list.tags.map(function (tag) {
            return (
              <span
                key={tag}
                className="rounded-full border border-border bg-sunken px-2.5 py-0.5 text-[11px] font-medium text-fg-muted"
              >
                {tag}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {!isOwner && list.visibility === "public" ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              className={cn(list.isLiked && "border-accent/40 text-accent")}
              onClick={function () {
                mutations.toggleLike.mutate({ id: list.id, isLiked: list.isLiked });
              }}
            >
              <Heart className={cn("mr-1.5 h-3.5 w-3.5", list.isLiked && "fill-current")} />
              {list.isLiked ? "Liked" : "Like"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={function () {
                mutations.cloneList.mutate(
                  { id: list.id },
                  {
                    onSuccess: function (cloned) {
                      router.push(ROUTES.LIST(cloned.id));
                    },
                  }
                );
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Clone
            </Button>
          </>
        ) : null}
        {isOwner ? (
          <>
            <Button variant="secondary" size="sm" onClick={function () { setEditorOpen(true); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            {list.type !== "watchlist" ? (
              <Button variant="danger" size="sm" onClick={function () { setDeleteOpen(true); }}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
          </>
        ) : null}
        <Link
          href={ROUTES.PROFILE_LISTS(list.owner.username)}
          className="inline-flex h-8 items-center rounded-full border border-border px-4 text-[12px] font-semibold text-fg-muted no-underline transition-colors hover:text-fg"
        >
          All lists
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-bg p-4 md:p-5">
        <ListEntriesPanel
          list={list}
          isOwner={isOwner}
          onAddFilm={isOwner ? handleAddFilm : undefined}
          onEditNote={
            isOwner && list.type !== "watchlist"
              ? function (entry) {
                  setEditingEntry(entry);
                  setPendingFilm(null);
                  setNoteModalOpen(true);
                }
              : undefined
          }
          onMoveEntry={isOwner ? handleMoveEntry : undefined}
          onRemoveEntry={
            isOwner
              ? function (entryId) {
                  mutations.removeEntry.mutate({ id: list.id, entryId });
                }
              : undefined
          }
        />
      </div>

      <ListEditorModal
        open={editorOpen}
        onClose={function () { setEditorOpen(false); }}
        mode="edit"
        listType={list.type}
        initialValues={{
          title: list.title,
          description: list.description ?? "",
          visibility: list.visibility,
          isRanked: list.isRanked,
          tags: joinListTags(list.tags),
        }}
        onSubmit={handleEditorSubmit}
        isSubmitting={mutations.updateList.isPending}
      />

      <ListEntryNoteModal
        open={noteModalOpen}
        onClose={function () {
          setNoteModalOpen(false);
          setPendingFilm(null);
          setEditingEntry(null);
        }}
        filmTitle={pendingFilm?.title ?? editingEntry?.film.title ?? "Film"}
        initialNote={editingEntry?.note ?? ""}
        submitLabel={editingEntry ? "Save note" : "Add film"}
        onSubmit={handleNoteSubmit}
        isSubmitting={mutations.addEntry.isPending || mutations.updateEntry.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={function () { setDeleteOpen(false); }}
        onConfirm={function () {
          mutations.deleteList.mutate(list.id, {
            onSuccess: function () {
              router.push(ROUTES.PROFILE_LISTS(list.owner.username));
            },
          });
        }}
        title={`Delete "${list.title}"?`}
        description="This list and its entries will be removed. This cannot be undone."
        confirmLabel="Delete list"
        variant="danger"
      />
    </div>
  );
}
