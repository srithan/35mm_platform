import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About – 35mm",
  description: "Learn about 35mm — a community for filmmakers, cinephiles, and visual storytellers.",
};

export default function AboutPage() {
  return (
    <div className="px-6 py-10 max-w-[540px]">
      <h1 className="text-[22px] font-display font-bold text-fg tracking-tight">About 35mm</h1>

      <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
        35mm is a social platform built for filmmakers, cinephiles, and visual storytellers. We believe in creating
        a space where independent voices can share their work, connect with collaborators, and find an audience
        that truly cares about the craft of cinema.
      </p>

      <h2 className="mt-8 text-[16px] font-display font-semibold text-fg">Our mission</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
        To democratise film culture by giving every filmmaker — from first-time shorts to seasoned
        independents — the tools and community to share, discuss, and celebrate moving images.
      </p>

      <h2 className="mt-8 text-[16px] font-display font-semibold text-fg">What we offer</h2>
      <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-fg-muted list-disc pl-5">
        <li>A curated feed of films, reviews, and behind-the-scenes content</li>
        <li>Communities organised around genres, techniques, and festivals</li>
        <li>Direct messaging and collaboration tools for creatives</li>
        <li>Festival listings and submission tracking</li>
      </ul>

      <h2 className="mt-8 text-[16px] font-display font-semibold text-fg">Contact</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
        Have questions or feedback? Reach us at{" "}
        <a href="mailto:hello@35mm.in" className="text-accent hover:underline">hello@35mm.in</a>.
      </p>
    </div>
  );
}
