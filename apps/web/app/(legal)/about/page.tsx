import type { Metadata } from "next";
import {
  LegalBody,
  LegalHeading,
  LegalLead,
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  LegalTitle,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "About – 35mm",
  description: "Learn about 35mm — a community for filmmakers, cinephiles, and visual storytellers.",
};

export default function AboutPage() {
  return (
    <LegalPage>
      <LegalTitle>About 35mm</LegalTitle>

      <LegalLead>
        35mm is a social platform built for filmmakers, cinephiles, and visual storytellers. We believe in creating
        a space where independent voices can share their work, connect with collaborators, and find an audience
        that truly cares about the craft of cinema.
      </LegalLead>

      <LegalSection>
        <LegalHeading>Our mission</LegalHeading>
        <LegalBody>
          To democratise film culture by giving every filmmaker — from first-time shorts to seasoned
          independents — the tools and community to share, discuss, and celebrate moving images.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>What we offer</LegalHeading>
        <LegalList>
          <li>A curated feed of films, reviews, and behind-the-scenes content</li>
          <li>Communities organised around genres, techniques, and festivals</li>
          <li>Direct messaging and collaboration tools for creatives</li>
          <li>Festival listings and submission tracking</li>
        </LegalList>
      </LegalSection>

      <LegalSection>
        <LegalHeading>Contact</LegalHeading>
        <LegalBody>
          Have questions or feedback? Reach us at{" "}
          <LegalLink href="mailto:hello@35mm.in">hello@35mm.in</LegalLink>.
        </LegalBody>
      </LegalSection>
    </LegalPage>
  );
}
