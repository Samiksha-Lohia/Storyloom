import React from 'react';
import { LegalPageLayout } from './LegalPageLayout';
import { APP_NAME } from '../../constants/app';

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="October 2026">
      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">1. Information We Collect</h2>
        <p className="text-ink leading-relaxed">
          We collect information you provide directly to us when creating an account, publishing content, or interacting with stories. This includes account credentials (name, email, hashed password), role-specific metadata (such as publisher company affiliations), and reading interaction data (bookmarks, reading progress, and reactions).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">2. How We Use Information</h2>
        <p className="text-ink leading-relaxed">
          We use collected information to provide, maintain, and improve the {APP_NAME} platform, personalize your reading feed, calculate aggregate popularity metrics (such as read counts and trending stories), protect the integrity of our community, and facilitate author discovery by accredited publishers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">3. Manuscript Analysis &amp; AI Insights</h2>
        <p className="text-ink leading-relaxed">
          Uploaded manuscripts are processed through our automated structural pipeline solely to generate story metrics (such as scene pacing, reading time, and character co-occurrence networks). Your private manuscripts are not sold to third-party model trainers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base text-ink">4. Your Privacy Rights</h2>
        <p className="text-ink leading-relaxed">
          You may access, update, or delete your account information at any time via your settings. If you wish to export your data or delete your account permanently, please contact our privacy team at privacy@storyloom.app.
        </p>
      </section>
    </LegalPageLayout>
  );
}
