import React from 'react';
import { LegalPageLayout } from './LegalPageLayout';

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="October 2026">
      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">1. Information We Collect</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          We collect information you provide directly to us when creating an account, publishing content, or interacting with stories. This includes account credentials (name, email, hashed password), role-specific metadata (such as publisher company affiliations), and reading interaction data (bookmarks, reading progress, and reactions).
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">2. How We Use Information</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          We use collected information to provide, maintain, and improve the SceneCraft platform, personalize your reading feed, calculate aggregate popularity metrics (such as read counts and trending stories), protect the integrity of our community, and facilitate author discovery by accredited publishers.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">3. Manuscript Analysis & AI Insights</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          Uploaded manuscripts are processed through our automated structural pipeline solely to generate story metrics (such as scene pacing, reading time, and character co-occurrence networks). Your private manuscripts are not sold to third-party model trainers.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">4. Your Privacy Rights</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          You may access, update, or delete your account information at any time via your settings. If you wish to export your data or delete your account permanently, please contact our privacy team at privacy@scenecraft.local.
        </p>
      </section>
    </LegalPageLayout>
  );
}
