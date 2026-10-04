import React from 'react';
import { Link } from 'react-router-dom';

export function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 pb-20 space-y-8">
      {/* Draft Notice Banner */}
      <div
        role="alert"
        className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs"
      >
        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-sm">
          ⚖️
        </div>
        <div>
          <h2 className="font-heading font-bold text-amber-950 text-sm sm:text-base">
            Draft: Requires Legal Review
          </h2>
          <p className="text-amber-900/90 text-xs sm:text-sm mt-1 leading-relaxed">
            This document is a development draft prepared for the SceneCraft platform. It must be formally reviewed and ratified by qualified legal counsel prior to commercial launch.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-stone-900">Home</Link>
        <span>/</span>
        <span className="font-semibold text-stone-800">Legal</span>
        <span>/</span>
        <span className="text-stone-600">{title}</span>
      </nav>

      {/* Header */}
      <header className="border-b border-stone-200 pb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-stone-500 mt-2">
          Effective Date: {lastUpdated || 'October 2026'} • Version 1.0 (Draft)
        </p>
      </header>

      {/* Body Content */}
      <article className="prose prose-stone max-w-none text-stone-700 leading-relaxed font-serif text-sm sm:text-base space-y-6">
        {children}
      </article>

      {/* Footer Back link */}
      <div className="pt-8 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 font-sans">
        <Link to="/" className="text-[#FF500A] font-bold hover:underline">
          &larr; Back to SceneCraft Home
        </Link>
        <span>SceneCraft Legal Department</span>
      </div>
    </div>
  );
}
