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

  const isDark = settings.theme === 'dark';
  const isSepia = settings.theme === 'sepia';
  const textColorClass = isDark ? 'text-white' : isSepia ? 'text-[#382C1E]' : 'text-ink';
  const mutedColorClass = isDark ? 'text-[#A1A1AA]' : isSepia ? 'text-[#7C6A53]' : 'text-muted';
  const divideClass = isDark ? 'lg:divide-[#333333]' : 'lg:divide-rule';

  return (
    <div
      key={`page-${pageNumber}`}
      className={`w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 select-text ${textColorClass}`}
      role="document"
      lang={language}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
      }}
    >
      {twoPageSpread && nextPageText !== null ? (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:divide-x ${divideClass}`}>
          <div className="flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(pageText)}</div>
            <div className={`pt-8 text-center text-xs select-none ${mutedColorClass}`}>
              — {pageNumber} —
            </div>
          </div>

          <div className="lg:pl-12 flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(nextPageText)}</div>
            <div className={`pt-8 text-center text-xs select-none ${mutedColorClass}`}>
              — {pageNumber + 1} —
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto flex flex-col justify-between min-h-[65vh]">
          <div className="space-y-1">{renderFormattedText(pageText)}</div>
          <div className={`pt-8 text-center text-xs select-none ${mutedColorClass}`}>
            — {pageNumber} —
          </div>
        </div>
      )}
    </div>
  );
}

