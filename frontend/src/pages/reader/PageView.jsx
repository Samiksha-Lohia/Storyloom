import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function PageView({
  pageText,
  nextPageText = null,
  pageNumber,
  _pageCount,
  twoPageSpread = false,
  language = 'en',
  settings = {},
  direction = 1, // 1 for next, -1 for prev
}) {
  const prefersReducedMotion = useReducedMotion();

  const fontSize = settings.fontSize || 18;
  const lineHeight = settings.lineHeight || 1.6;
  const fontFamily = settings.fontFamily === 'sans' ? 'Nunito Sans, sans-serif' : 'Lora, Georgia, serif';

  const variants = prefersReducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir) => ({
          x: dir > 0 ? 50 : -50,
          opacity: 0,
        }),
        center: {
          x: 0,
          opacity: 1,
          transition: { duration: 0.22, ease: 'easeOut' },
        },
        exit: (dir) => ({
          x: dir > 0 ? -50 : 50,
          opacity: 0,
          transition: { duration: 0.18, ease: 'easeIn' },
        }),
      };

  // Format page content into paragraphs
  const renderFormattedText = (text) => {
    if (!text || text.trim().length === 0) {
      return (
        <div className="text-center py-20 italic opacity-40">
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
    <motion.div
      key={`page-${pageNumber}`}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 select-text"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:divide-x lg:divide-stone-300/30">
          {/* Left Page */}
          <div className="flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(pageText)}</div>
            <div className="pt-8 text-center text-xs opacity-40 select-none font-mono">
              — {pageNumber} —
            </div>
          </div>

          {/* Right Page */}
          <div className="lg:pl-12 flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-1">{renderFormattedText(nextPageText)}</div>
            <div className="pt-8 text-center text-xs opacity-40 select-none font-mono">
              — {pageNumber + 1} —
            </div>
          </div>
        </div>
      ) : (
        /* Single Page View */
        <div className="max-w-2xl mx-auto flex flex-col justify-between min-h-[65vh]">
          <div className="space-y-1">{renderFormattedText(pageText)}</div>
          <div className="pt-8 text-center text-xs opacity-40 select-none font-mono">
            — {pageNumber} —
          </div>
        </div>
      )}
    </motion.div>
  );
}
