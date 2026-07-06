"use client";

import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { useBookmarkToFolderFlow } from "@/features/bookmarks/hooks/useBookmarkToFolderFlow";
import { cn } from "@/lib/utils/cn";
import {
  CircleSlash,
  EyeOff,
  Flag,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

interface CommentCardMoreMenuProps {
  postId: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  isOwnComment: boolean;
  canModerateAuthor: boolean;
  authorHandle: string;
  authorId?: string;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onBlockRequest: () => void;
  onMuteRequest: () => void;
}

export function CommentCardMoreMenu({
  postId,
  postBookmarked = false,
  postBookmarkFolderId = null,
  isOwnComment,
  canModerateAuthor,
  authorHandle,
  authorId,
  onEdit,
  onDeleteRequest,
  onBlockRequest,
  onMuteRequest,
}: CommentCardMoreMenuProps) {
  const bookmarkFlow = useBookmarkToFolderFlow({
    postId: postId,
    initialBookmarked: postBookmarked,
    initialBookmarkFolderId: postBookmarkFolderId,
    menuLabel: "Bookmark post to folder",
    menuDescription: postBookmarked
      ? "Move this post to a folder"
      : "Save this post into a folder",
  });

  const menuItems = [
    ...(bookmarkFlow.menuItem ? [bookmarkFlow.menuItem] : []),
    {
      id: "share",
      label: "Share comment",
      description: "Send or copy this comment",
      icon: <Share2 className="w-4 h-4" strokeWidth={1.8} />,
      dividerBefore: Boolean(bookmarkFlow.menuItem),
    },
    ...(isOwnComment
      ? [
          {
            id: "edit-comment",
            label: "Edit comment",
            description: "Update your comment text",
            icon: <Pencil className="w-4 h-4" strokeWidth={1.8} />,
            dividerBefore: true,
            onSelect: onEdit,
          },
          {
            id: "delete-comment",
            label: "Delete comment",
            description: "Remove this comment from the thread",
            icon: <Trash2 className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            onSelect: onDeleteRequest,
          },
        ]
      : [
          ...(canModerateAuthor && authorId
            ? [
                {
                  id: "mute-user",
                  label: `Mute ${authorHandle}`,
                  description: "Hide their posts from your feed",
                  icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                  dividerBefore: true,
                  onSelect: onMuteRequest,
                },
                {
                  id: "block-user",
                  label: `Block ${authorHandle}`,
                  description: "Remove and prevent interaction",
                  icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
                  danger: true,
                  onSelect: onBlockRequest,
                },
              ]
            : []),
          {
            id: "report",
            label: "Report comment",
            description: "Flag a safety concern",
            icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            dividerBefore: !canModerateAuthor,
          },
        ]),
  ];

  return (
    <>
      <PortalDropdown
        align="end"
        sideOffset={6}
        menuLabel="Comment actions"
        menuClassName="min-w-[238px] rounded-2xl border-border bg-elevated p-1.5 shadow-[0_20px_56px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.08)]"
        itemLayout="rich"
        showArrow={false}
        items={menuItems}
        trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            onKeyDown={onKeyDown}
            aria-label="More options"
            aria-expanded={isOpen}
            aria-controls={menuId}
            aria-haspopup="menu"
            className={cn(
              "group flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-fg-muted transition-all duration-150",
              "hover:border-border hover:bg-hover hover:text-fg active:scale-95",
              isOpen &&
                "border-border bg-sunken text-fg shadow-[inset_0_1px_0_rgb(255_255_255/45%)]"
            )}
          >
            <MoreHorizontal
              className={cn(
                "w-4 h-4 transition-transform duration-150",
                isOpen ? "scale-110" : "group-hover:scale-105"
              )}
              strokeWidth={2}
            />
          </button>
        )}
      />
      {bookmarkFlow.picker}
    </>
  );
}
