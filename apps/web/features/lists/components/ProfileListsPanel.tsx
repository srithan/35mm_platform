"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { FilmListEntry, FilmListSummary } from "@35mm/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { filmResultToFilmPayload, type FilmListSort } from "../api/listsApi";
import { useFilmList, useListMutations, useProfileLists } from "../hooks/useLists";
import { joinListTags, parseListTags } from "../lib/listMeta";
import { ListCard } from "./ListCard";
import { ListEditorModal, type ListEditorValues } from "./ListEditorModal";
import { ListEntryNoteModal } from "./ListEntryNoteModal";

type ProfileListsPanelProps = {
  username: string;
  displayName?: string;
  isOwnProfile: boolean;
};

function nextPositions(entries: FilmListEntry[]): Array<{ entryId: string; position: number }> {
  return entries.map(function (entry, index) {
    return { entryId: entry.id, position: (index + 1) * 10 };
  });
}

export function ProfileListsPanel({ username, displayName, isOwnProfile }: ProfileListsPanelProps) {
  const router = useRouter();
  const [sort, setSort] = useState<FilmListSort>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingList, setEditingList] = useState<FilmListSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FilmListSummary | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingFilm, setPendingFilm] = useState<FilmResult | null>(null);
  const [editingEntry, setEditingEntry] = useState<FilmListEntry | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const listsQuery = useProfileLists(username, sort);
  const selectedListQuery = useFilmList(selectedId);
  const mutations = useListMutations(username, selectedId);

  const lists = useMemo(
    function () {
      return listsQuery.data?.pages.flatMap(function (page) {
        return page.items;
      }) ?? [];
    },
    [listsQuery.data]
  );

  const publicCount = useMemo(
    function () {
      return lists.filter(function (list) {
        return list.visibility === "public";
      }).length;
    },
    [lists]
  );

  useEffect(
    function () {
      var sentinel = sentinelRef.current;
      if (!sentinel) return;
      if (!listsQuery.hasNextPage) return;

      var observer = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
          if (listsQuery.isFetchingNextPage) return;
          void listsQuery.fetchNextPage();
        },
        { rootMargin: "200px 0px 300px 0px" }
      );
      observer.observe(sentinel);
      return function () {
        observer.disconnect();
      };
    },
    [listsQuery.hasNextPage, listsQuery.isFetchingNextPage, listsQuery.fetchNextPage]
  );

  function openCreateModal() {
    setEditorMode("create");
    setEditingList(null);
    setEditorOpen(true);
  }

  function openEditModal(list: FilmListSummary) {
    setEditorMode("edit");
    setEditingList(list);
    setEditorOpen(true);
  }

  function handleEditorSubmit(values: ListEditorValues) {
    if (editorMode === "create") {
      mutations.createList.mutate(
        {
          title: values.title,
          description: values.description || null,
          visibility: values.visibility,
          isRanked: values.isRanked,
          tags: parseListTags(values.tags),
        },
        {
          onSuccess: function (created) {
            setEditorOpen(false);
            setSelectedId(created.id);
          },
        }
      );
      return;
    }

    if (!editingList) return;
    var patch: Parameters<typeof mutations.updateList.mutate>[0]["patch"] = {
      visibility: values.visibility,
    };
    if (editingList.type !== "watchlist") {
      patch.title = values.title;
      patch.description = values.description || null;
      patch.isRanked = values.isRanked;
      patch.tags = parseListTags(values.tags);
    }
    mutations.updateList.mutate(
      { id: editingList.id, patch },
      { onSuccess: function () { setEditorOpen(false); setEditingList(null); } }
    );
  }

  function handleAddFilm(film: FilmResult) {
    if (!selectedId || !selectedListQuery.data) return;
    if (selectedListQuery.data.type === "watchlist") {
      mutations.addEntry.mutate({
        id: selectedId,
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
    if (!selectedId) return;
    if (editingEntry) {
      mutations.updateEntry.mutate(
        { id: selectedId, entryId: editingEntry.id, note },
        { onSuccess: function () { setNoteModalOpen(false); setEditingEntry(null); } }
      );
      return;
    }
    if (!pendingFilm) return;
    mutations.addEntry.mutate(
      {
        id: selectedId,
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
    if (!selectedListQuery.data) return;
    var entries = [...selectedListQuery.data.entries];
    var nextIndex = entryIndex + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    var temp = entries[entryIndex];
    entries[entryIndex] = entries[nextIndex];
    entries[nextIndex] = temp;
    mutations.reorderEntries.mutate({ id: selectedListQuery.data.id, entries: nextPositions(entries) });
  }

  if (listsQuery.isLoading) {
    return <div className="px-6 py-8 text-[13px] text-fg-muted md:px-10">Loading lists...</div>;
  }

  if (listsQuery.isError) {
    return (
      <div className="px-6 py-10 text-center md:px-10">
        <p className="text-[14px] text-fg-muted">Couldn&apos;t load lists right now.</p>
        <button
          type="button"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-[13px] font-medium text-fg hover:bg-hover"
          onClick={function () {
            void listsQuery.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-fg-muted">
            {lists.length}
            {listsQuery.hasNextPage ? "+" : ""} lists
            {publicCount > 0 ? ` · ${publicCount} public` : ""}
          </span>
          <div className="flex items-center gap-2">
            {(["updated", "popular", "alpha"] as FilmListSort[]).map(function (option) {
              return (
                <button
                  key={option}
                  type="button"
                  onClick={function () {
                    setSort(option);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] capitalize transition-colors",
                    sort === option
                      ? "border-fg bg-fg text-bg"
                      : "border-border bg-bg text-fg-muted hover:text-fg"
                  )}
                >
                  {option === "alpha" ? "A-Z" : option}
                </button>
              );
            })}
          </div>
        </div>
        {isOwnProfile ? (
          <Button variant="primary" className="gap-1.5 px-3.5 py-1.5 text-[11px]" onClick={openCreateModal}>
            <Plus className="h-3.5 w-3.5" />
            New list
          </Button>
        ) : null}
      </div>

      {lists.length === 0 ? (
        <EmptyState
          size="lg"
          className="px-6 md:px-10"
          icon={<span className="text-[24px]">📋</span>}
          headline={isOwnProfile ? "No lists yet" : `${displayName ?? username} has no public lists yet`}
          subline={isOwnProfile ? "Curate films into themed collections or keep a private watchlist." : undefined}
          primaryCta={isOwnProfile ? { label: "Create your first list", onClick: openCreateModal } : undefined}
        />
      ) : (
        <div className="divide-y divide-border px-6 md:px-10">
          {lists.map(function (list) {
            var expanded = selectedId === list.id;
            return (
              <ListCard
                key={list.id}
                list={list}
                expanded={expanded}
                detail={expanded ? selectedListQuery.data ?? null : null}
                detailLoading={expanded && selectedListQuery.isLoading}
                isOwnProfile={isOwnProfile}
                onToggle={function () {
                  setSelectedId(expanded ? null : list.id);
                }}
                onEdit={function () {
                  openEditModal(list);
                }}
                onDelete={function () {
                  setDeleteTarget(list);
                }}
                onLike={function () {
                  mutations.toggleLike.mutate({ id: list.id, isLiked: list.isLiked });
                }}
                onClone={function () {
                  mutations.cloneList.mutate(
                    { id: list.id },
                    {
                      onSuccess: function (cloned) {
                        router.push(ROUTES.LIST(cloned.id));
                      },
                    }
                  );
                }}
                onAddFilm={expanded && isOwnProfile ? handleAddFilm : undefined}
                onEditNote={
                  expanded && isOwnProfile && list.type !== "watchlist"
                    ? function (entry) {
                        setEditingEntry(entry);
                        setPendingFilm(null);
                        setNoteModalOpen(true);
                      }
                    : undefined
                }
                onMoveEntry={expanded && isOwnProfile ? handleMoveEntry : undefined}
                onRemoveEntry={
                  expanded && isOwnProfile
                    ? function (entryId) {
                        mutations.removeEntry.mutate({ id: list.id, entryId });
                      }
                    : undefined
                }
                hasMoreEntries={Boolean(selectedListQuery.data?.entriesPage?.hasMore)}
                isLoadingMoreEntries={selectedListQuery.isFetchingNextPage}
                onLoadMoreEntries={function () {
                  if (selectedListQuery.hasNextPage) void selectedListQuery.fetchNextPage();
                }}
              />
            );
          })}
        </div>
      )}

      {listsQuery.hasNextPage ? (
        <div ref={sentinelRef} className="py-4 text-center text-[12px] text-fg-muted">
          {listsQuery.isFetchingNextPage ? "Loading more lists..." : "Scroll for more"}
        </div>
      ) : null}

      <ListEditorModal
        open={editorOpen}
        onClose={function () {
          setEditorOpen(false);
          setEditingList(null);
        }}
        mode={editorMode}
        listType={editingList?.type ?? "custom"}
        initialValues={
          editingList
            ? {
                title: editingList.title,
                description: editingList.description ?? "",
                visibility: editingList.visibility,
                isRanked: editingList.isRanked,
                tags: joinListTags(editingList.tags),
              }
            : undefined
        }
        onSubmit={handleEditorSubmit}
        isSubmitting={mutations.createList.isPending || mutations.updateList.isPending}
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
        open={Boolean(deleteTarget)}
        onClose={function () {
          setDeleteTarget(null);
        }}
        onConfirm={function () {
          if (!deleteTarget) return;
          mutations.deleteList.mutate(deleteTarget.id);
          if (selectedId === deleteTarget.id) setSelectedId(null);
          setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.title ?? "this list"}"?`}
        description="This list and its entries will be removed. This cannot be undone."
        confirmLabel="Delete list"
        variant="danger"
      />
    </div>
  );
}
