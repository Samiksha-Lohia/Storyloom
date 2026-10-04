import React from 'react';
import { LegalPageLayout } from './LegalPageLayout';

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="October 2026">
      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">1. Acceptance of Terms</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          By accessing or using SceneCraft (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. SceneCraft provides social reading, manuscript analysis, and serial publishing tools for readers, writers, and accredited publishers.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">2. User Roles and Eligibility</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          You must be at least 13 years old (or 16 in certain jurisdictions) to create an account. Accounts registered with the <strong>Publisher</strong> role are subject to administrative vetting and credential verification. Writers retain sole ownership of their original manuscripts.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">3. Content Ownership & Publishing Rights</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          Authors retain full intellectual property rights to all original literary works uploaded to SceneCraft. By uploading a manuscript, you grant SceneCraft a non-exclusive, worldwide, royalty-free license to host, format, display, and analyze the work on the Platform for reading and discovery purposes.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">4. Prohibited Content & Mature Ratings</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          Users must accurately flag stories containing adult themes, graphic violence, or explicit material as <strong>Mature (18+)</strong>. Hate speech, harassment, plagiarized works, non-consensual content, and malicious code are strictly prohibited and result in immediate account termination.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">5. Limitation of Liability</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          SceneCraft is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. SceneCraft disclaims all warranties of any kind, whether express or implied.
        </p>
      </section>
    </LegalPageLayout>
  );
}
