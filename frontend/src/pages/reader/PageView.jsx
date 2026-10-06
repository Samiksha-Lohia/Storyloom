import React from 'react';

export default function PageView({
  pageText,
  nextPageText = null,
  pageNumber,
  _pageCount,
  twoPageSpread = false,
  language = 'en',
  settings = {},
}) {
  const fontSize = settings.fontSize || 18;
  const lineHeight = settings.lineHeight || 1.6;
  const fontFamily =
    settings.fontFamily === 'sans'
      ? 'var(--font-body), "Nunito Sans", -apple-system, sans-serif'
      : 'var(--font-reading), "Lora", Georgia, serif';

  // Format page content into paragraphs
  const renderFormattedText = (text) => {
    if (!text || text.trim().length === 0) {
      return (
        <div className="text-center py-20 italic text-muted">
          (Empty page)
        </div>
      );
    }

    const paragraphs = text.split(/\r?\n\r?\n/);

    return paragraphs.map((para, i) => {
      const trimmed = para.trim();
      if (!trimmed) return null;
      return (
        <p key={i} className="mb-6 leading-relaxed select-text tracking-normal">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div
      key={`page-${pageNumber}`}
      className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 select-text text-ink"
      role="document"
      lang={language}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
      }}
    >
      {twoPageSpread && nextPageText !== null ? (
        /* Two-Page Spread (Desktop >= 1024px) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:divide-x lg:divide-rule">
          {/* Left Page */}
          <div className="flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(pageText)}</div>
            <div className="pt-8 text-center text-xs text-muted select-none">
              — {pageNumber} —
            </div>
          </div>

          {/* Right Page */}
          <div className="lg:pl-12 flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(nextPageText)}</div>
            <div className="pt-8 text-center text-xs text-muted select-none">
              — {pageNumber + 1} —
            </div>
          </div>
        </div>
      ) : (
        /* Single Page View */
        <div className="max-w-2xl mx-auto flex flex-col justify-between min-h-[65vh]">
          <div className="space-y-1">{renderFormattedText(pageText)}</div>
          <div className="pt-8 text-center text-xs text-muted select-none">
            — {pageNumber} —
          </div>
        </div>
      )}
    </div>
  );
}

