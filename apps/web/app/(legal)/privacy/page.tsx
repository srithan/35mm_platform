import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – 35mm",
  description: "How 35mm collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="px-6 py-10 max-w-[540px]">
      <h1 className="text-[22px] font-display font-bold text-fg tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-[12px] text-fg-muted">Last updated: 1 March 2025</p>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">1. Information we collect</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          We collect information you provide directly — such as your name, email address, profile details,
          and content you post — as well as usage data like pages visited and interactions with features.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">2. How we use your information</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          Your information helps us provide and improve 35mm, personalise your feed, send relevant
          notifications, and ensure the safety of our community.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">3. Sharing &amp; disclosure</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          We do not sell your personal information. We may share data with service providers who help
          operate our platform, or when required by law.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">4. Data retention</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          We retain your information for as long as your account is active or as needed to provide our
          services. You may request deletion of your account and associated data at any time.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">5. Your rights</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          You can access, correct, or delete your personal data through your account settings, or by
          contacting us at{" "}
          <a href="mailto:privacy@35mm.in" className="text-accent hover:underline">privacy@35mm.in</a>.
        </p>
      </section>

      <section className="mt-6 scroll-mt-20" id="consumer-health-privacy">
        <h2 className="text-[16px] font-display font-semibold text-fg">Consumer health privacy</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          If you are in the United States, health-related information you choose to share may receive
          additional protections under applicable state and federal law. See our full Privacy Policy above
          for how we handle personal data.
        </p>
      </section>

      <section className="mt-6 scroll-mt-20" id="cookies">
        <h2 className="text-[16px] font-display font-semibold text-fg">7. Cookies</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          We use essential cookies for authentication and preferences. Analytics cookies are only set with
          your consent.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">8. Contact</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          If you have questions about this policy, reach us at{" "}
          <a href="mailto:privacy@35mm.in" className="text-accent hover:underline">privacy@35mm.in</a>.
        </p>
      </section>
    </div>
  );
}
