"use client";

import Link from "next/link";
import { Calendar, MapPin, Mail, Globe } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { FestivalDetail } from "../data/mockFestivals";
import { MOCK_FESTIVALS } from "../data/mockFestivals";

interface FestivalDetailRightPanelProps {
  festival: FestivalDetail;
}

export function FestivalDetailRightPanel({ festival }: FestivalDetailRightPanelProps) {
  const otherFestivals = MOCK_FESTIVALS.filter((f) => f.slug !== festival.slug).slice(
    0,
    4
  );

  return (
    <>
      {/* Dates & Deadlines */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-5 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
          Dates & Deadlines
        </div>
        <div className="space-y-0">
          {festival.datesAndDeadlines.map((d) => (
            <div
              key={d.label}
              className="flex flex-col gap-1 py-3 border-b border-border last:border-b-0"
            >
              <span className="text-[10px] text-fg-muted uppercase tracking-wider">
                {d.label}
              </span>
              <span className="text-[12px] font-medium text-fg">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Venue */}
      {(festival.contact || festival.venue) && (
        <div className="mb-8 border-t border-border pt-8">
          <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-5">
            Contact & Venue
          </div>
          <div className="space-y-3">
            {festival.contact?.email && (
              <a
                href={`mailto:${festival.contact.email}`}
                className="flex items-center gap-2 text-[12px] text-fg hover:text-accent transition-colors"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                {festival.contact.email}
              </a>
            )}
            {festival.contact?.website && (
              <a
                href={festival.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[12px] text-fg hover:text-accent transition-colors"
              >
                <Globe className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                Website
              </a>
            )}
            {festival.venue && (
              <div className="flex items-start gap-2 text-[12px] text-fg-muted">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <div className="font-medium text-fg">{festival.venue.name}</div>
                  <div>{festival.venue.address}</div>
                  <div>
                    {festival.venue.city}, {festival.venue.country}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Festivals You May Like */}
      <div className="border-t border-border pt-8">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-5">
          Other Festivals You May Like
        </div>
        <div className="space-y-2">
          {otherFestivals.map((f) => (
            <Link
              key={f.id}
              href={ROUTES.FESTIVAL(f.slug)}
              className="block text-[12.5px] leading-snug text-fg hover:text-accent hover:underline transition-colors py-1"
            >
              {f.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
