import React from 'react';
import { Bookmark, X, Trash2, ArrowRight } from 'lucide-react';

export default function BookmarksDrawer({
  isOpen,
  onClose,
  bookmarks = [],
  pageOffsets = [],
  theme = 'light',
  onJumpToPage,
  onRemoveBookmark,
}) {
  if (!isOpen) return null;

  // Helper to determine page number from offset
  const getPageForOffset = (offset) => {
    if (!pageOffsets || pageOffsets.length === 0) return 1;
    let low = 0;
    let high = pageOffsets.length - 1;
    let result = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (pageOffsets[mid] <= offset) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return result + 1;
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: 'bg-[#1E1E22]',
          text: 'text-[#E0E0E0]',
          border: 'border-[#2E2E34]',
          cardBg: 'bg-[#2A2A32] hover:bg-[#34343E]',
        };
      case 'sepia':
        return {
          bg: 'bg-[#F4ECD8]',
          text: 'text-[#382C1E]',
          border: 'border-[#DECFA7]',
          cardBg: 'bg-[#FAF4E6] hover:bg-[#FFF9EE]',
        };
      default:
        return {
          bg: 'bg-white',
          text: 'text-stone-900',
          border: 'border-stone-200',
          cardBg: 'bg-stone-50 hover:bg-stone-100',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs">
      <div
        className={`w-full max-w-sm h-full flex flex-col border-l shadow-2xl transition-all ${styles.bg} ${styles.text} ${styles.border}`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${styles.border}`}>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#FF500A]" />
            <h3 className="font-heading font-bold text-lg">Saved Bookmarks</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-200/50 transition cursor-pointer"
            aria-label="Close bookmarks"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2 opacity-60">
              <Bookmark className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-semibold">No bookmarks yet</p>
              <p className="text-xs max-w-xs mx-auto">
                Tap the "Mark" button in the reading toolbar to save your place or mark a favourite passage.
              </p>
            </div>
          ) : (
            bookmarks.map((bm, index) => {
              const page = getPageForOffset(bm.offset);
              const dateStr = bm.createdAt
                ? new Date(bm.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={bm._id || `${bm.offset}-${index}`}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${styles.cardBg} ${styles.border}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToPage(page);
                      onClose();
                    }}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Page {page}</span>
                      <span className="text-[10px] opacity-60 font-mono">
                        (char {bm.offset})
                      </span>
                    </div>
                    <span className="text-[11px] opacity-60 block mt-0.5">{dateStr}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToPage(page);
                        onClose();
                      }}
                      className="p-1.5 rounded-xl hover:bg-stone-200/50 text-[#FF500A] transition cursor-pointer"
                      title="Jump to page"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.offset)}
                      className="p-1.5 rounded-xl hover:bg-red-100/50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
