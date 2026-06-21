import type { Metadata } from "next";
import {
  LegalBody,
  LegalHeading,
  LegalLink,
  LegalMeta,
  LegalPage,
  LegalSection,
  LegalTitle,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy – 35mm",
  description: "How 35mm collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage>
      <LegalTitle>Privacy Policy</LegalTitle>
      <LegalMeta>Last updated: 1 March 2025</LegalMeta>

      <LegalSection>
        <LegalHeading>1. Information we collect</LegalHeading>
        <LegalBody>
          We collect information you provide directly — such as your name, email address, profile details,
          and content you post — as well as usage data like pages visited and interactions with features.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>2. How we use your information</LegalHeading>
        <LegalBody>
          Your information helps us provide and improve 35mm, personalise your feed, send relevant
          notifications, and ensure the safety of our community.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>3. Sharing &amp; disclosure</LegalHeading>
        <LegalBody>
          We do not sell your personal information. We may share data with service providers who help
          operate our platform, or when required by law.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>4. Data retention</LegalHeading>
        <LegalBody>
          We retain your information for as long as your account is active or as needed to provide our
          services. You may request deletion of your account and associated data at any time.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>5. Your rights</LegalHeading>
        <LegalBody>
          You can access, correct, or delete your personal data through your account settings, or by
          contacting us at <LegalLink href="mailto:privacy@35mm.in">privacy@35mm.in</LegalLink>.
        </LegalBody>
      </LegalSection>

      <LegalSection id="consumer-health-privacy">
        <LegalHeading>Consumer health privacy</LegalHeading>
        <LegalBody>
          If you are in the United States, health-related information you choose to share may receive
          additional protections under applicable state and federal law. See our full Privacy Policy above
          for how we handle personal data.
        </LegalBody>
      </LegalSection>

      <LegalSection id="cookies">
        <LegalHeading>7. Cookies</LegalHeading>
        <LegalBody>
          We use essential cookies for authentication and preferences. Analytics cookies are only set with
          your consent.
        </LegalBody>
      </LegalSection>

      <LegalSection>
        <LegalHeading>8. Contact</LegalHeading>
        <LegalBody>
          If you have questions about this policy, reach us at{" "}
          <LegalLink href="mailto:privacy@35mm.in">privacy@35mm.in</LegalLink>.
        </LegalBody>
      </LegalSection>
    </LegalPage>
  );
}
