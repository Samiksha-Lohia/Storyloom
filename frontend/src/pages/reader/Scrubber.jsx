import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function Scrubber({
  currentPage,
  pageCount,
  sceneMarkers = [],
  theme = 'light',
  onPageChange,
}) {
  const [jumpInput, setJumpInput] = useState('');

  const percentage = pageCount > 0 ? Math.round((currentPage / pageCount) * 100) : 0;

  const handleSliderChange = (e) => {
    const targetPage = parseInt(e.target.value, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pageCount) {
      onPageChange(targetPage);
    }
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const targetPage = parseInt(jumpInput, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pageCount) {
      onPageChange(targetPage);
      setJumpInput('');
    }
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          barBg: 'bg-[#18181A] border-[#333333] text-[#E6E6E6]',
          trackBg: 'bg-[#2A2A30]',
          tickBg: 'bg-accent',
          inputBg: 'bg-[#2A2A30] border-[#3E3E48] text-[#E6E6E6]',
        };
      case 'sepia':
        return {
          barBg: 'bg-[#F4ECD8] border-[#D9D2C3] text-[#382C1E]',
          trackBg: 'bg-[#DECFA7]',
          tickBg: 'bg-accent',
          inputBg: 'bg-[#FAF4E6] border-[#D9D2C3] text-[#382C1E]',
        };
      default:
        return {
          barBg: 'bg-paper border-rule text-ink',
          trackBg: 'bg-rule',
          tickBg: 'bg-accent',
          inputBg: 'bg-paper border-rule text-ink',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 border-t px-4 sm:px-8 py-3 ${styles.barBg}`}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <span>
            Page <strong className="font-bold">{currentPage}</strong> of {pageCount}
          </span>
          <span className="text-muted">•</span>
          <span className="text-accent font-bold">{percentage}% read</span>
        </div>

        <div className="flex-1 relative flex items-center mx-2">
          <div className={`absolute inset-x-0 h-1 rounded overflow-hidden ${styles.trackBg}`}>
            <div
              className="h-full bg-accent"
              style={{ width: `${(currentPage / Math.max(1, pageCount)) * 100}%` }}
            />
          </div>

          {sceneMarkers.map((markerPage) => {
            if (markerPage < 1 || markerPage > pageCount) return null;
            const leftPercent = ((markerPage - 1) / Math.max(1, pageCount - 1)) * 100;
            return (
              <button
                key={markerPage}
                type="button"
                onClick={() => onPageChange(markerPage)}
                title={`Scene marker at page ${markerPage}`}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-ink rounded-none z-10 cursor-pointer"
                style={{ left: `calc(${leftPercent}% - 3px)` }}
                aria-label={`Jump to scene at page ${markerPage}`}
              />
            );
          })}

          <input
            type="range"
            min={1}
            max={Math.max(1, pageCount)}
            value={currentPage}
            onChange={handleSliderChange}
            className="relative z-20 w-full h-4 opacity-0 cursor-pointer"
            aria-label="Story scrubber"
          />
        </div>

        <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min={1}
            max={pageCount}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            placeholder="Go to..."
            className={`w-16 px-2 py-1 text-xs rounded text-center border focus:outline-none focus:border-ink ${styles.inputBg}`}
          />
          <button
            type="submit"
            disabled={!jumpInput}
            className="p-1 rounded border border-rule hover:bg-rule/40 disabled:opacity-30 cursor-pointer"
            title="Jump to page"
            aria-label="Submit page jump"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
