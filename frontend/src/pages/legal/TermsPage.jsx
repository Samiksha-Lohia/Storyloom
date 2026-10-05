import React from 'react';
import { LegalPageLayout } from './LegalPageLayout';
import { APP_NAME } from '../../constants/app';

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="October 2026">
      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">1. Acceptance of Terms</h2>
        <p className="text-ink leading-relaxed">
          By accessing or using {APP_NAME} (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. {APP_NAME} provides social reading, manuscript analysis, and serial publishing tools for readers, writers, and accredited publishers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">2. User Roles and Eligibility</h2>
        <p className="text-ink leading-relaxed">
          You must be at least 13 years old (or 16 in certain jurisdictions) to create an account. Accounts registered with the <strong>Publisher</strong> role are subject to administrative vetting and credential verification. Writers retain sole ownership of their original manuscripts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">3. Content Ownership &amp; Publishing Rights</h2>
        <p className="text-ink leading-relaxed">
          Authors retain full intellectual property rights to all original literary works uploaded to {APP_NAME}. By uploading a manuscript, you grant {APP_NAME} a non-exclusive, worldwide, royalty-free license to host, format, display, and analyze the work on the Platform for reading and discovery purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">4. Prohibited Content &amp; Mature Ratings</h2>
        <p className="text-ink leading-relaxed">
          Users must accurately flag stories containing adult themes, graphic violence, or explicit material as <strong>Mature (18+)</strong>. Hate speech, harassment, plagiarized works, non-consensual content, and malicious code are strictly prohibited and result in immediate account termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">5. Limitation of Liability</h2>
        <p className="text-ink leading-relaxed">
          {APP_NAME} is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. {APP_NAME} disclaims all warranties of any kind, whether express or implied.
        </p>
      </section>
    </LegalPageLayout>
  );
}
