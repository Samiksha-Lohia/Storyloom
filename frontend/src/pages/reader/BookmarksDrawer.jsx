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
          bg: 'bg-[#18181A]',
          text: 'text-[#E6E6E6]',
          border: 'border-[#333333]',
          cardBg: 'bg-[#2A2A30] hover:bg-[#34343E]',
        };
      case 'sepia':
        return {
          bg: 'bg-[#F4ECD8]',
          text: 'text-[#382C1E]',
          border: 'border-[#D9D2C3]',
          cardBg: 'bg-[#FAF4E6] hover:bg-[#FFF9EE]',
        };
      default:
        return {
          bg: 'bg-paper',
          text: 'text-ink',
          border: 'border-rule',
          cardBg: 'bg-paper hover:bg-rule/30',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <div
        className={`w-full max-w-sm h-full flex flex-col border-l ${styles.bg} ${styles.text} ${styles.border}`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${styles.border}`}>
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-ink" />
            <h3 className="font-bold text-sm">Saved Bookmarks</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-rule/40 text-ink cursor-pointer"
            aria-label="Close bookmarks"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2 text-muted">
              <Bookmark className="w-4 h-4 mx-auto text-muted" />
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
                  className={`p-3 rounded border flex items-center justify-between gap-3 ${styles.cardBg} ${styles.border}`}
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
                      <span className="text-[10px] text-muted font-mono">
                        (char {bm.offset})
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block mt-0.5">{dateStr}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToPage(page);
                        onClose();
                      }}
                      className="p-1 rounded hover:bg-rule/40 text-accent cursor-pointer"
                      title="Jump to page"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.offset)}
                      className="p-1 rounded hover:bg-danger/20 text-muted hover:text-danger cursor-pointer"
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
