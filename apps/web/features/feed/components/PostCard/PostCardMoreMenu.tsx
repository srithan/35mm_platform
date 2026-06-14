"use client";

import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { Icon } from "@/components/Icon/Icon";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import { cn } from "@/lib/utils/cn";
import {
  CircleSlash,
  EyeOff,
  Flag,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type {
  PostCardAttachedFilm,
  PostCardAuthorProps,
  PostCardLinkPreview,
  PostVariant,
  SourcePostType,
} from "./types";

interface PostCardMoreMenuProps {
  isPostAuthor: boolean;
  postId?: string;
  userId?: string;
  variant: PostVariant;
  sourcePostType?: SourcePostType;
  text: string;
  headline?: string;
  normalizedMediaUrls: string[];
  linkPreview?: PostCardLinkPreview | null;
  attachedFilm?: PostCardAttachedFilm | null;
  author: Pick<PostCardAuthorProps, "handle">;
  onShare: () => void;
  onDeleteRequest: () => void;
  onBlockRequest: () => void;
  onReportRequest: () => void;
  onMuteSuccess: (payload: { handle: string; userId: string }) => void;
}

export function PostCardMoreMenu({
  isPostAuthor,
  postId,
  userId,
  variant,
  sourcePostType,
  text,
  headline,
  normalizedMediaUrls,
  linkPreview,
  attachedFilm,
  author,
  onShare,
  onDeleteRequest,
  onBlockRequest,
  onReportRequest,
  onMuteSuccess,
}: PostCardMoreMenuProps) {
  const openComposerForEdit = useComposerModalStore((state) => state.openForEdit);
  const muteUserMutation = useMuteUserMutation();

  return (
    <PortalDropdown
      align="end"
      sideOffset={6}
      menuLabel="Post actions"
      menuClassName="min-w-[238px] rounded-2xl border-border bg-elevated p-1.5 shadow-[0_20px_56px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.08)]"
      itemLayout="rich"
      showArrow={false}
      items={[
        ...(isPostAuthor
          ? [
              {
                id: "edit-post",
                label: "Edit post",
                description: "Update text, headline, or film",
                icon: <Icon name="quote" className="w-4 h-4" />,
                onSelect: () => {
                  if (!postId || !userId) return;
                  openComposerForEdit({
                    postId,
                    userId,
                    type:
                      sourcePostType ??
                      (variant === "film-log"
                        ? "log"
                        : variant === "discussion"
                          ? "discussion"
                          : variant === "image"
                            ? "image"
                            : "text"),
                    body: text,
                    headline: headline ?? undefined,
                    mediaUrls: normalizedMediaUrls,
                    linkPreview: linkPreview ?? null,
                    film: attachedFilm ?? null,
                  });
                },
              },
              {
                id: "delete-post",
                label: "Delete post",
                description: "Remove this post from your profile and feeds",
                icon: <Trash2 className="w-4 h-4" strokeWidth={1.8} />,
                danger: true,
                dividerBefore: true,
                onSelect: onDeleteRequest,
              },
            ]
          : []),
        ...(!isPostAuthor && userId
          ? [
              {
                id: "share",
                label: "Share post",
                description: "Send or copy this post",
                icon: <Icon name="share-2" className="w-4 h-4" />,
                onSelect: onShare,
              },
              {
                id: "hide",
                label: "Hide post",
                description: "Remove it from your feed",
                icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                dividerBefore: true,
              },
              {
                id: "fewer-like-this",
                label: "See fewer posts like this",
                description: "Tune your recommendations",
                icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
              },
              {
                id: "mute-user",
                label: `Mute ${author.handle}`,
                description: "Hide their posts from your feed",
                icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                dividerBefore: true,
                onSelect: () => {
                  muteUserMutation.mutate(
                    { userId, muted: false },
                    {
                      onSuccess: () => {
                        onMuteSuccess({ handle: author.handle, userId });
                      },
                    }
                  );
                },
              },
              {
                id: "block-user",
                label: `Block ${author.handle}`,
                description: "Remove and prevent interaction",
                icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
                danger: true,
                onSelect: onBlockRequest,
              },
              {
                id: "report",
                label: "Report post",
                description: "Flag a safety concern",
                icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
                danger: true,
                dividerBefore: true,
                onSelect: onReportRequest,
              },
            ]
          : [
              {
                id: "share",
                label: "Share post",
                description: "Send or copy this post",
                icon: <Icon name="share-2" className="w-4 h-4" />,
                onSelect: onShare,
              },
            ]),
      ]}
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
            "group flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-fg-muted transition-all duration-150",
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
  );
}
