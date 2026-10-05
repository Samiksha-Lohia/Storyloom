import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { APP_NAME } from '../../constants/app';

export function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 pb-20 space-y-8">
      {/* Draft Notice Banner */}
      <div
        role="alert"
        className="bg-paper border border-rule rounded p-4 flex items-start gap-3.5"
      >
        <div className="w-7 h-7 rounded border border-rule flex items-center justify-center shrink-0 text-xs text-ink">
          <Shield className="w-4 h-4 text-ink" />
        </div>
        <div>
          <h2 className="font-bold text-ink text-xs uppercase tracking-wider">
            Draft: Requires Legal Review
          </h2>
          <p className="text-muted text-xs mt-1 leading-relaxed">
            This document is a development draft prepared for the {APP_NAME} platform. It must be formally reviewed and ratified by qualified legal counsel prior to commercial launch.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="text-xs text-muted flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <span className="font-semibold text-ink">Legal</span>
        <span>/</span>
        <span className="text-muted">{title}</span>
      </nav>

      {/* Header */}
      <header className="border-b border-rule pb-4">
        <h1 className="font-calligraphy text-3xl sm:text-4xl font-normal text-ink">
          {title}
        </h1>
        <p className="text-xs text-muted mt-2">
          Effective Date: {lastUpdated || 'October 2026'} &bull; Version 1.0 (Draft)
        </p>
      </header>

      {/* Body Content */}
      <article className="prose max-w-none text-ink leading-relaxed text-xs sm:text-sm space-y-6">
        {children}
      </article>

      {/* Footer Back link */}
      <div className="pt-6 border-t border-rule flex justify-between items-center text-xs text-muted">
        <Link to="/" className="text-accent font-bold hover:underline">
          &larr; Back to {APP_NAME} Home
        </Link>
        <span>{APP_NAME} Legal Department</span>
      </div>
    </div>
  );
}
