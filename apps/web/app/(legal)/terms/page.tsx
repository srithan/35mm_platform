import type { Metadata } from "next";
import {
  LegalBody,
  LegalHeading,
  LegalLink,
  LegalList,
  LegalMeta,
  LegalPage,
  LegalSection,
  LegalTitle,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service – 35mm",
  description: "Terms and conditions for using the 35mm platform.",
};

export default function TermsPage() {
  return (
    <LegalPage>
      <LegalTitle>Terms of Service</LegalTitle>
      <LegalMeta>Last updated: 1 March 2025</LegalMeta>

      <LegalSection>
        <LegalHeading>1. Acceptance of terms</LegalHeading>
        <LegalBody>
          By accessing or using 35mm, you agree to be bound by these terms. If you do not agree, you may not
          use the platform.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>2. Accounts</LegalHeading>
        <LegalBody>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>3. User content</LegalHeading>
        <LegalBody>
          You retain ownership of content you post on 35mm. By posting, you grant us a non-exclusive,
          worldwide licence to display, distribute, and promote your content within the platform.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>4. Prohibited conduct</LegalHeading>
        <LegalList>
          <li>Harassment, hate speech, or threats of violence</li>
          <li>Posting content you do not have the right to share</li>
          <li>Impersonating another person or entity</li>
          <li>Attempting to interfere with or disrupt the platform</li>
          <li>Using automated tools to scrape or spam</li>
        </LegalList>
      </LegalSection>

      <LegalSection>
        <LegalHeading>5. Termination</LegalHeading>
        <LegalBody>
          We reserve the right to suspend or terminate your account if you violate these terms. You may
          delete your account at any time through your settings.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>6. Disclaimers</LegalHeading>
        <LegalBody>
          35mm is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee
          uninterrupted or error-free operation of the platform.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>7. Contact</LegalHeading>
        <LegalBody>
          Questions about these terms? Contact us at{" "}
          <LegalLink href="mailto:legal@35mm.in">legal@35mm.in</LegalLink>.
        </LegalBody>
      </LegalSection>
    </LegalPage>
  );
}
