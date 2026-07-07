"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  PostComposer,
  type ComposerPublishState,
  type PostComposerHandle,
} from "@/features/feed/components/PostComposer";
import { Icon } from "@/components/Icon/Icon";
import { ROUTES } from "@/lib/constants/routes";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { ButtonSpinner } from "@/components/ButtonSpinner";

function navigateAwayFromNewPost(router: ReturnType<typeof useRouter>) {
  useComposerModalStore.getState().close();
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(ROUTES.HOME);
  }
}

export function NewPostPage() {
  const router = useRouter();
  const composerRef = useRef<PostComposerHandle | null>(null);
  const quotedPost = useComposerModalStore(function (s) { return s.quotedPost; });
  const editingPost = useComposerModalStore(function (s) { return s.editingPost; });
  const initialMode = useComposerModalStore(function (s) { return s.initialMode; });
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [publishUi, setPublishUi] = useState<ComposerPublishState>({
    canPost: false,
    label: "Post",
    isPublishing: false,
    processingLabel: "Posting...",
  });

  const onPublishStateChange = useCallback(function (state: ComposerPublishState) {
    setPublishUi(state);
  }, []);

  const [scrollLockMobile, setScrollLockMobile] = useState(false);
  useEffect(function () {
    function update() {
      setScrollLockMobile(window.matchMedia("(max-width: 767px)").matches);
    }
    update();
    var mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", update);
    return function () {
      mq.removeEventListener("change", update);
    };
  }, []);
  useScrollLock(scrollLockMobile);

  const requestLeave = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      navigateAwayFromNewPost(router);
    }
  }, [isDirty, router]);

  const handleDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    navigateAwayFromNewPost(router);
  }, [router]);

  const handleKeepWriting = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const handlePosted = useCallback(() => {
    navigateAwayFromNewPost(router);
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        composerRef.current?.submit();
        return;
      }
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (showDiscardConfirm) {
        handleKeepWriting();
      } else {
        requestLeave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDiscardConfirm, handleKeepWriting, requestLeave]);

  return (
    <>
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[80] flex flex-col bg-bg",
          "h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden overscroll-none"
        )}
      >
        <header
          data-new-post-header
          className="fixed left-0 right-0 top-0 z-[82] flex flex-col border-b border-[var(--color-border)] bg-bg"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          <div className="flex h-11 w-full min-w-0 items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={requestLeave}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-fg active:bg-fg/[0.06]"
              aria-label="Back"
            >
              <Icon name="arrow-left" className="h-[22px] w-[22px]" strokeWidth={2.25} />
            </button>
            <div className="min-w-0 flex-1" />
            <div className="flex flex-shrink-0 items-center pr-0.5">
              <button
                type="button"
                disabled={!publishUi.canPost || publishUi.isPublishing}
                aria-busy={publishUi.isPublishing}
                onClick={function () {
                  composerRef.current?.submit();
                }}
                className={cn(
                  "inline-flex min-w-[4.75rem] items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[15px] font-bold leading-tight transition-[opacity,transform] disabled:opacity-100",
                  publishUi.isPublishing
                    ? "cursor-wait bg-accent text-white"
                    : publishUi.canPost
                      ? "bg-accent text-white active:scale-[0.98] active:opacity-90"
                      : "cursor-default bg-accent/18 text-accent/45 disabled:opacity-100"
                )}
              >
                {publishUi.isPublishing ? (
                  <>
                    <ButtonSpinner tone="accent" className="h-4 w-4" />
                    <span>{publishUi.processingLabel}</span>
                  </>
                ) : (
                  <span>{publishUi.label}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            paddingTop: "calc(2.75rem + env(safe-area-inset-top, 0px))",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          <PostComposer
            ref={composerRef}
            variant="fullPage"
            postPrimaryPlacement="header"
            quotedPost={quotedPost}
            editingPost={editingPost}
            initialMode={initialMode}
            onDirtyChange={setIsDirty}
            onSubmit={handlePosted}
            onPublishStateChange={onPublishStateChange}
          />

          <AnimatePresence>
            {showDiscardConfirm && (
              <motion.div
                key="discard-new-post"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
                role="presentation"
                onClick={handleKeepWriting}
              >
                <motion.div
                  data-new-post-discard
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 32, stiffness: 380 }}
                  className="w-full max-w-lg overflow-hidden rounded-t-[10px] bg-bg shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
                  onClick={function (e) { e.stopPropagation(); }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-post-discard-title"
                >
                  <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-fg/15" aria-hidden />
                  <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-film-red">
                        <Icon name="trash-2" className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h2
                      id="new-post-discard-title"
                      className="mb-1.5 text-center text-[20px] font-bold tracking-tight text-fg"
                    >
                      Discard post?
                    </h2>
                    <p className="mb-6 px-1 text-center text-[15px] leading-snug text-fg-muted">
                      This can&apos;t be undone and you&apos;ll lose your draft.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="w-full rounded-full bg-film-red py-3.5 text-[17px] font-bold text-white active:opacity-90"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepWriting}
                        className="w-full rounded-full border border-[var(--color-border)] bg-bg py-3.5 text-[17px] font-bold text-fg active:bg-hover"
                      >
                        Keep writing
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="hidden md:flex min-h-[calc(100vh-2rem)] w-full flex-col items-center pt-10 pb-16 px-6">
        <div className="w-full max-w-[580px]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {editingPost ? "Edit post" : "New post"}
            </h1>
            <p className="text-[14px] text-fg-muted mt-1">
              {editingPost
                ? "Update your post and save changes."
                : "Share an update, start a discussion, or log a film."}
            </p>
          </div>
          <PostComposer
            variant="inline"
            quotedPost={quotedPost}
            editingPost={editingPost}
            initialMode={initialMode}
            onDirtyChange={setIsDirty}
            onSubmit={handlePosted}
          />
        </div>
      </div>
    </>
  );
}
