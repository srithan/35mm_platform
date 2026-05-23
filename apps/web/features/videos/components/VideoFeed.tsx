"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { MOCK_VIDEOS } from "../data/mockVideos";
import { CommentSection } from "@/features/feed/components/CommentSection";
import { formatCount } from "@/lib/utils/formatCount";
import { spawnParticles } from "@/lib/utils/spawnParticles";

const CARD_HEIGHT = "calc(100vh - 48px)";
const PEEK_HEIGHT = 48;
const GAP = 12;

import { Icon } from "@/components/Icon/Icon";

export function VideoFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [likeCount, setLikeCount] = useState(MOCK_VIDEOS[0].likeCount);
  const [muted, setMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const isScrollingProgrammatically = useRef(false);

  const video = MOCK_VIDEOS[currentIndex];
  const canGoUp = currentIndex > 0;
  const canGoDown = currentIndex < MOCK_VIDEOS.length - 1;

  const goToPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    isScrollingProgrammatically.current = true;
    const el = cardRefs.current[currentIndex - 1];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentIndex(currentIndex - 1);
    setLikeCount(MOCK_VIDEOS[currentIndex - 1].likeCount);
    setLiked(false);
    setCaptionExpanded(false);
    setTimeout(() => { isScrollingProgrammatically.current = false; }, 400);
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex >= MOCK_VIDEOS.length - 1) return;
    isScrollingProgrammatically.current = true;
    const el = cardRefs.current[currentIndex + 1];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentIndex(currentIndex + 1);
    setLikeCount(MOCK_VIDEOS[currentIndex + 1].likeCount);
    setLiked(false);
    setCaptionExpanded(false);
    setTimeout(() => { isScrollingProgrammatically.current = false; }, 400);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  // Sync currentIndex with visible card on scroll (incl. wheel / touch)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;
      const { scrollTop, clientHeight } = container;
      const slotH = clientHeight - PEEK_HEIGHT; // card + gap per slot
      const index = Math.round(scrollTop / slotH);
      const clamped = Math.max(0, Math.min(index, MOCK_VIDEOS.length - 1));
      if (clamped !== currentIndex) {
        setCurrentIndex(clamped);
        setLikeCount(MOCK_VIDEOS[clamped].likeCount);
        setLiked(false);
        setCaptionExpanded(false);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex]);

  // Play current video, pause others
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === currentIndex) {
        v.muted = true;
        v.play().catch(() => { });
      } else {
        v.pause();
      }
    });
    setProgress(0);
  }, [currentIndex]);

  const handleVideoClick = () => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 600);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    const next = !muted;
    setMuted(next);
    v.muted = next;
    if (!next) v.play().catch(() => { });
  };

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    if (heartBtnRef.current) spawnParticles(heartBtnRef.current);
  };

  const handleCommentClick = () => {
    setCommentsOpen((o) => !o);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!v || v.duration <= 0) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: `100vh` }}>
      {/* Core layout: video | actions | comments */}
      <div
        className="flex items-start justify-center flex-1 gap-0 px-4 py-6"
        style={{ minHeight: `100vh` }}
      >
        {/* Video scroll container: snap per card, works with wheel/touch/buttons */}
        <div
          ref={scrollRef}
          className="relative flex-shrink-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory rounded-[14px] scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            width: "calc((100vh - 48px) * 9 / 16)",
            height: CARD_HEIGHT,
            scrollSnapType: "y mandatory",
          }}
        >
          <div className="flex flex-col" style={{ gap: GAP }}>
            {MOCK_VIDEOS.map((v, i) => (
              <div
                key={v.id}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="relative flex-shrink-0 rounded-[14px] overflow-hidden bg-black cursor-pointer snap-start snap-always"
                style={{
                  height: `calc(100vh - 48px - ${GAP}px - ${PEEK_HEIGHT}px)`,
                  minHeight: `calc(100vh - 48px - ${GAP}px - ${PEEK_HEIGHT}px)`,
                }}
                onClick={() => {
                  if (i === currentIndex) handleVideoClick();
                  else {
                    isScrollingProgrammatically.current = true;
                    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setCurrentIndex(i);
                    setLikeCount(v.likeCount);
                    setLiked(false);
                    setCaptionExpanded(false);
                    setTimeout(() => { isScrollingProgrammatically.current = false; }, 400);
                  }
                }}
              >
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={v.videoUrl}
                  loop
                  muted
                  playsInline
                  onTimeUpdate={i === currentIndex ? handleTimeUpdate : undefined}
                  className="h-full w-full object-cover outline-none"
                />
                {/* Bottom overlay gradient */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 65%)",
                  }}
                />
                {/* Overlaid content - bottom left */}
                <div className="absolute left-[18px] bottom-[18px] right-[18px] z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm bg-gradient-to-br from-amber-600 to-rose-700 text-white">
                      {v.avatar}
                    </div>
                    <span className="text-white font-semibold text-[14px]">{v.username}</span>
                  </div>
                  {i === currentIndex ? (
                    captionExpanded ? (
                      <div className="mt-1.5 text-white/75 text-[13px] leading-snug">
                        {v.caption}
                        {" "}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCaptionExpanded(false); }}
                          className="text-white/90 font-medium hover:underline"
                        >
                          Less
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 text-white/75 text-[13px] leading-snug line-clamp-2">
                        {v.caption.length > 80 ? `${v.caption.slice(0, 80)}… ` : v.caption}
                        {v.caption.length > 80 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCaptionExpanded(true); }}
                            className="text-white/90 font-medium hover:underline"
                          >
                            More
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="mt-1.5 text-white/75 text-[13px] leading-snug line-clamp-2">
                      {v.caption.length > 80 ? `${v.caption.slice(0, 80)}…` : v.caption}
                    </div>
                  )}
                  {/* Post actions - only for current card */}
                  {i === currentIndex && (
                    <div className="flex items-center gap-4 mt-2.5">
                      <button
                        ref={heartBtnRef}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleLike(); }}
                        className={`flex items-center gap-1.5 text-white/90 hover:text-white transition-colors ${liked ? "text-like" : ""}`}
                      >
                        <Icon name="heart" fill={liked ? "currentColor" : "none"} strokeWidth={1.6} className="w-5 h-5" />
                        <span className="text-[12px] ">{formatCount(likeCount)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(); }}
                        className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                      >
                        <Icon name="chat" strokeWidth={1.6} className="w-5 h-5" />
                        <span className="text-[12px] ">{formatCount(v.commentCount)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                      >
                        <Icon name="share-2" strokeWidth={1.6} className="w-5 h-5" />
                        <span className="text-[12px] ">Share</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Mute - only for current card */}
                {i === currentIndex && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
                    className="absolute bottom-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-white hover:opacity-80 transition-opacity pointer-events-auto"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    <Icon name={muted ? "volume-x" : "volume-2"} className="w-5 h-5" strokeWidth={2} />
                  </button>
                )}
                {/* Progress bar - only for current card */}
                {i === currentIndex && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5">
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                )}
                {/* Play icon overlay - only for current card */}
                {i === currentIndex && showPlayIcon && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Icon name="play" className="w-16 h-16 text-white drop-shadow-lg" fill="currentColor" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions rail - up/down nav only */}
        <div className="flex flex-col items-center ml-4 gap-7">
          <button
            type="button"
            onClick={goToPrev}
            disabled={!canGoUp}
            className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-[var(--fg-light)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous video"
          >
            <Icon name="chevron-up" className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={!canGoDown}
            className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-[var(--fg-light)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next video"
          >
            <Icon name="chevron-down" className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Comments panel - conditional flex sibling */}
        {commentsOpen && (
          <div
            className="w-[300px] flex-shrink-0 ml-4 rounded-[14px] border border-[var(--border)] bg-[var(--bg)] flex flex-col overflow-hidden animate-comments-panel-in"
            style={{ height: "calc(100vh - 48px)" }}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] flex-shrink-0">
              <span className="text-[13px] font-medium text-[var(--fg)] uppercase tracking-wider">
                Comments
              </span>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)]"
                aria-label="Close"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              <CommentSection comments={[]} postId={video.id} postUsername={video.username} />
            </div>
            <div className="flex-shrink-0 border-t border-[var(--border)] p-4">
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-xs bg-skeleton text-[var(--fg-muted)]">
                  S
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Reply to ${video.username}...`}
                    className="flex-1 min-w-0 border border-[var(--border)] rounded-full px-3.5 py-2 text-[13px] text-[var(--fg)] bg-transparent outline-none placeholder:text-[var(--fg-muted)] focus:border-[var(--fg-muted)]"
                  />
                  <button
                    type="button"
                    className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)] px-3 py-1.5 rounded-full hover:bg-hover"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
