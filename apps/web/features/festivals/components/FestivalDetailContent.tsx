"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useShowCoverBackButton } from "@/lib/hooks/useShowCoverBackButton";
import type { FestivalDetail } from "../data/mockFestivals";
import { FestivalDetailRightPanel } from "./FestivalDetailRightPanel";
import { CategoriesFeesTab } from "./CategoriesFeesTab";
import { cn } from "@/lib/utils/cn";

interface FestivalDetailContentProps {
  festival: FestivalDetail;
}

const TABS = ["About", "Categories & Fees", "Rules", "Reviews", "Photos"] as const;

const BADGE_LABELS: Record<string, string> = {
  "academy-award": "Academy Award® Qualifying",
  bafta: "BAFTA Qualifying",
  "top-100": "Top 100",
  "best-reviewed": "Best Reviewed",
  new: "New",
  "fiapf-accredited": "FIAPF Accredited",
};

export function FestivalDetailContent({ festival }: FestivalDetailContentProps) {
  const router = useRouter();
  const showCoverBack = useShowCoverBackButton();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("About");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const photos = festival.photos ?? [];
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  return (
    <div className="pb-10">
      {/* Cover + Page Picture — page picture overlaps bottom of cover, extends into space above nav */}
      <div className="relative mx-10 mt-4">
        <div className="w-full h-[180px] rounded-lg overflow-hidden bg-gradient-to-br from-fg/90 via-poster-bg-to to-accent/20 relative">
          <Image
            src={festival.coverPicture}
            alt=""
            fill
            className="object-cover opacity-85"
            priority
            sizes="1200px"
          />
        </div>

        {/* Back — only when not a direct in-tab / deep-link (see useShowCoverBackButton) */}
        {showCoverBack ? (
          <button
            type="button"
            onClick={function () {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(ROUTES.FESTIVALS);
            }}
            className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/35 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm transition-colors hover:bg-black/45 md:left-4 md:top-4"
            aria-label="Back to festivals"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
        ) : null}

        {/* Page picture: bottom of cover, extends down — nav strip will sit below with clearance */}
        <div
          className="absolute left-4 md:left-6 bottom-0 translate-y-1/2 w-20 h-20 rounded-xl overflow-hidden border-4 border-elevated shadow-lg bg-elevated z-10"
          aria-hidden
        >
          <Image
            src={festival.pagePicture}
            alt=""
            width={80}
            height={80}
            className="w-full h-full object-cover aspect-square"
          />
        </div>
      </div>

      {/* Page header — tags, name, tagline (below Page Picture, above tab bar) */}
      <header className="px-10 mt-14 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {festival.badges?.map((b) => (
            <span
              key={b}
              className={cn(
                "text-[9px] rounded px-1.5 py-0.5 uppercase tracking-wider",
                b === "academy-award" || b === "bafta"
                  ? "text-film-gold border border-film-gold/50 bg-elevated dark:border-border"
                  : "text-accent border border-accent/40"
              )}
            >
              {BADGE_LABELS[b] ?? b}
            </span>
          ))}
          {festival.eventType === "film-festival" && (
            <span className="text-[9px] text-fg-muted border border-border rounded px-1.5 py-0.5 uppercase tracking-wider">
              Film Festival
            </span>
          )}
        </div>
        <h1 className="text-[24px] md:text-[28px] font-semibold italic text-fg leading-tight">
          {festival.name}
        </h1>
        {festival.tagline && (
          <p className="text-[14px] text-fg-muted mt-2">{festival.tagline}</p>
        )}
      </header>

      {/* Nav strip — tabs left, Submit Now right */}
      <div className="border-b border-border mx-10 px-0">
        <div className="flex items-center justify-between gap-4 py-4">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2 px-0.5 text-[12px] tracking-[0.02em] transition-colors border-b-2 -mb-px",
                  activeTab === tab
                    ? "text-fg border-fg font-medium"
                    : "text-fg-muted border-transparent hover:text-fg"
                )}
              >
                {tab}
                {tab === "Reviews" && festival.reviewCount != null && (
                  <span className="ml-1.5 text-fg-muted font-normal">
                    {festival.reviewCount}
                  </span>
                )}
                {tab === "Photos" && festival.photoCount != null && (
                  <span className="ml-1.5 text-fg-muted font-normal">
                    {festival.photoCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <Link
            href={ROUTES.FESTIVAL(festival.slug)}
            className="text-[12px] font-medium bg-fg text-bg px-4 py-2 rounded hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Submit Now
          </Link>
        </div>
      </div>

      {/* Content: two-column (About) or single-column (other tabs) */}
      <div
        className={cn(
          "grid gap-8 px-10 pt-8",
          activeTab === "About" ? "grid-cols-[1fr_260px]" : "grid-cols-1"
        )}
      >
        <div>
          {/* Tab content */}
          {activeTab === "About" && (
            <div className="prose prose-sm max-w-none">
              <p className="text-[14px] text-fg leading-relaxed">{festival.about}</p>
              {festival.whySubmit && festival.whySubmit.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[12px] uppercase tracking-wider text-fg-muted mb-3">
                    Why Submit?
                  </h3>
                  <ul className="space-y-2">
                    {festival.whySubmit.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-[14px] text-fg leading-relaxed"
                      >
                        <span className="text-accent">●</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {festival.awards && festival.awards.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[12px] uppercase tracking-wider text-fg-muted mb-3">
                    Awards & Prizes
                  </h3>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-fg">
                    {festival.awards.map((a) => (
                      <li key={a}>● {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "Categories & Fees" && (
            <CategoriesFeesTab festival={festival} />
          )}

          {activeTab === "Rules" && (
            <div className="prose prose-sm max-w-none">
              {festival.rules ? (
                <div
                  className="text-[13px] text-fg leading-relaxed whitespace-pre-line"
                  style={{ fontVariantNumeric: "normal" }}
                >
                  {festival.rules}
                </div>
              ) : (
                <>
                  <p className="text-[14px] text-fg leading-relaxed">
                    {festival.rulesExcerpt ?? "Rules and terms will be displayed here."}
                  </p>
                  <p className="text-[13px] text-fg-muted mt-4">
                    Visit the festival website for complete rules and regulations.
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === "Reviews" && (
            <div className="text-center py-12">
              <div className="text-[48px] italic text-fg">
                {festival.rating ?? "—"}
              </div>
              <div className="text-[12px] text-fg-muted mt-1">
                Overall Rating · {festival.reviewCount ?? 0} Reviews
              </div>
              <p className="text-[13px] text-fg-muted mt-6 max-w-sm mx-auto">
                Reviews from filmmakers will appear here once the festival has
                received submissions.
              </p>
            </div>
          )}

          {activeTab === "Photos" && (
            <div className="py-6">
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openLightbox(i)}
                      className="aspect-square relative overflow-hidden rounded-lg bg-fg/5 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <Image
                        src={url}
                        alt={`Festival photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[13px] text-fg-muted">
                    Festival photos and gallery will be displayed here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photo lightbox — 80vh, blurred backdrop, rendered via portal to escape overflow clipping */}
          {lightboxOpen &&
            photos.length > 0 &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 z-[var(--z-modal-lightbox)] flex items-center justify-center p-4 font-sans"
                role="dialog"
                aria-modal="true"
                aria-label="Photo viewer"
              >
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
                  aria-label="Close"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-fg text-bg hover:bg-fg/90 shadow-lg transition-colors"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-7 h-7" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-fg text-bg hover:bg-fg/90 shadow-lg transition-colors"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-7 h-7" strokeWidth={2} />
                    </button>
                  </>
                )}
                <div className="relative z-10 max-h-[80vh] max-w-[90vw] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[lightboxIndex]}
                    alt={`Festival photo ${lightboxIndex + 1} of ${photos.length}`}
                    className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-xl"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 z-20 p-2 rounded-full bg-fg/80 text-bg hover:bg-fg transition-colors"
                  aria-label="Close lightbox"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>,
              document.body
            )}

        </div>
        {activeTab === "About" && (
          <aside className="border-l border-border pl-6 pt-2 sticky top-0 self-start">
            <FestivalDetailRightPanel festival={festival} />
          </aside>
        )}
      </div>
    </div>
  );
}
