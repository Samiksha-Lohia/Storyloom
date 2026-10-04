import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Scrubber
 * Bottom reading progress scrubber with draggable slider, percentage,
 * scene marker ticks from GET /books/:bookId/scene-markers, and jump-to-page input.
 */
export default function Scrubber({
  currentPage,
  pageCount,
  sceneMarkers = [],
  theme = 'light',
  onPageChange,
}) {
  const [jumpInput, setJumpInput] = useState('');
  const [isHoveringTrack, setIsHoveringTrack] = useState(false);

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

  // Color schemes for scrubber based on theme
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          barBg: 'bg-[#1E1E22]/95 border-[#2E2E34] text-[#E0E0E0]',
          trackBg: 'bg-[#2A2A32]',
          tickBg: 'bg-[#FF500A]',
          inputBg: 'bg-[#2A2A32] border-[#3E3E48] text-white',
        };
      case 'sepia':
        return {
          barBg: 'bg-[#EFE6CE]/95 border-[#E2D5B5] text-[#382C1E]',
          trackBg: 'bg-[#DCD0B0]',
          tickBg: 'bg-[#FF500A]',
          inputBg: 'bg-[#FAF4E6] border-[#D6C7A1] text-[#382C1E]',
        };
      default:
        return {
          barBg: 'bg-white/95 border-stone-200 text-stone-800',
          trackBg: 'bg-stone-200',
          tickBg: 'bg-[#FF500A]',
          inputBg: 'bg-stone-50 border-stone-300 text-stone-900',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md px-4 sm:px-8 py-3 transition-colors shadow-lg ${styles.barBg}`}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Current Page & Percentage */}
        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <span>
            Page <strong className="font-bold">{currentPage}</strong> of {pageCount}
          </span>
          <span className="opacity-40">•</span>
          <span className="text-[#FF500A] font-bold">{percentage}% read</span>
        </div>

        {/* Center: Draggable Track with Scene Markers */}
        <div
          className="flex-1 relative flex items-center mx-2 group"
          onMouseEnter={() => setIsHoveringTrack(true)}
          onMouseLeave={() => setIsHoveringTrack(false)}
        >
          {/* Custom Track Background */}
          <div className={`absolute inset-x-0 h-1.5 rounded-full overflow-hidden ${styles.trackBg}`}>
            <div
              className="h-full bg-[#FF500A] transition-all"
              style={{ width: `${(currentPage / Math.max(1, pageCount)) * 100}%` }}
            />
          </div>

          {/* Scene Marker Ticks along Track */}
          {sceneMarkers.map((markerPage) => {
            if (markerPage < 1 || markerPage > pageCount) return null;
            const leftPercent = ((markerPage - 1) / Math.max(1, pageCount - 1)) * 100;
            return (
              <button
                key={markerPage}
                type="button"
                onClick={() => onPageChange(markerPage)}
                title={`Scene marker at page ${markerPage}`}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-3.5 bg-amber-500 hover:bg-[#FF500A] rounded-xs shadow-xs transition-transform hover:scale-125 z-10 cursor-pointer"
                style={{ left: `calc(${leftPercent}% - 4px)` }}
                aria-label={`Jump to scene at page ${markerPage}`}
              />
            );
          })}

          {/* Actual Input Range */}
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

        {/* Right: Quick Jump to Page Form */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min={1}
            max={pageCount}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            placeholder="Go to..."
            className={`w-16 px-2 py-1 text-xs rounded-lg text-center border focus:outline-none focus:ring-1 focus:ring-[#FF500A] ${styles.inputBg}`}
          />
          <button
            type="submit"
            disabled={!jumpInput}
            className="p-1 rounded-lg hover:bg-stone-200/50 disabled:opacity-30 transition cursor-pointer"
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
