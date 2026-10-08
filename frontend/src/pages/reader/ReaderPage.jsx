import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bookmark,
  BookOpen,
  Columns2,
  Square,
  BookmarkCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageView from './PageView';
import Scrubber from './Scrubber';
import ReaderSettingsPopover from './ReaderSettingsPopover';
import BookmarksDrawer from './BookmarksDrawer';
import { InsightsDrawer } from '../../components/common/InsightsDrawer';
import MatureGateModal from './MatureGateModal';
import FinishCard from './FinishCard';
import { Skeleton } from '../../components/common/Skeleton';

export function ReaderPage() {
  const { bookId } = useParams();
  const { user, updateUser } = useAuth();

  const [book, setBook] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [turnDirection, setTurnDirection] = useState(1);
  const [sceneMarkers, setSceneMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pagesCache, setPagesCache] = useState({});

  const [libraryEntry, setLibraryEntry] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [settings, setSettings] = useState({
    fontSize: user?.readerSettings?.fontSize || 18,
    lineHeight: user?.readerSettings?.lineHeight || 1.6,
    fontFamily: user?.readerSettings?.fontFamily || 'serif',
    theme: user?.readerSettings?.theme || 'light',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showMatureGate, setShowMatureGate] = useState(false);
  const [twoPageSpread, setTwoPageSpread] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );

  const touchStartRef = useRef({ x: 0, y: 0 });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const wide = window.innerWidth >= 1024;
      setIsWideScreen(wide);
      if (!wide) setTwoPageSpread(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user?.readerSettings) {
      setSettings((prev) => ({
        ...prev,
        ...user.readerSettings,
      }));
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function initializeReader() {
      try {
        setLoading(true);
        setError('');

        const bookData = await api.books.getById(bookId);
        if (!isMounted) return;
        setBook(bookData);
        const count = bookData.pageCount || 1;
        setPageCount(count);

        const isOwner = user && (bookData.writerId?._id || bookData.writerId) === user.id;
        const isAdmin = user?.role === 'admin';
        if (bookData.mature && !user?.matureAckAt && !isOwner && !isAdmin) {
          setShowMatureGate(true);
        }

        try {
          const markers = await api.books.getSceneMarkers(bookId);
          if (isMounted) setSceneMarkers(markers);
        } catch (scErr) {
          console.warn('Scene markers unavailable:', scErr);
        }

        const queryParams = new URLSearchParams(window.location.search);
        const urlPage = parseInt(queryParams.get('page'), 10);
        let targetStartPage = 1;

        if (user) {
          try {
            const entry = await api.me.getLibraryBook(bookId);
            if (isMounted && entry) {
              setLibraryEntry(entry);
              const resumePage = entry.currentPage || 1;
              if (resumePage >= 1 && resumePage <= count) {
                targetStartPage = resumePage;
              }
            }
          } catch {
          }
        }

        if (!isNaN(urlPage) && urlPage >= 1 && urlPage <= count) {
          targetStartPage = urlPage;
        }

        if (isMounted) {
          setCurrentPage(targetStartPage);
        }
      } catch (err) {
        if (isMounted) {
          if (err.code === 'MATURE_ACK_REQUIRED') {
            setShowMatureGate(true);
          } else {
            setError(err.message || 'Story could not be loaded for reading.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (bookId) {
      initializeReader();
    }

    return () => {
      isMounted = false;
    };
  }, [bookId, user]);

  const fetchPageWindow = useCallback(
    async (targetPage) => {
      if (!bookId) return;

      const from = Math.max(1, targetPage - 1);
      const to = Math.min(pageCount, from + 4);

      try {
        const res = await api.books.getPages(bookId, from, to);
        if (res?.pages) {
          setPagesCache((prev) => {
            const updated = { ...prev };
            res.pages.forEach((p) => {
              updated[p.page] = p.text;
            });
            return updated;
          });
        }
      } catch (err) {
        if (err.code === 'MATURE_ACK_REQUIRED') {
          setShowMatureGate(true);
        } else {
          console.warn('Failed to fetch page window:', err);
        }
      }
    },
    [bookId, pageCount]
  );

  useEffect(() => {
    if (pageCount > 0) {
      fetchPageWindow(currentPage);
    }
  }, [currentPage, pageCount, fetchPageWindow]);

  useEffect(() => {
    if (!libraryEntry?.bookmarks || !book?.pageOffsets) {
      setIsBookmarked(false);
      return;
    }
    const currentOffset = book.pageOffsets[currentPage - 1] || 0;
    const nextOffset = book.pageOffsets[currentPage] || Infinity;

    const matched = libraryEntry.bookmarks.some(
      (b) => b.offset >= currentOffset && b.offset < nextOffset
    );
    setIsBookmarked(matched);
  }, [currentPage, libraryEntry, book]);

  const saveProgress = useCallback(
    (page) => {
      if (!user) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const offset =
            book?.pageOffsets && book.pageOffsets[page - 1] !== undefined
              ? book.pageOffsets[page - 1]
              : 0;
          const updated = await api.me.updateLibraryBook(bookId, {
            currentPage: page,
            currentOffset: offset,
          });
          if (updated) {
            setLibraryEntry(updated);
          }
        } catch (err) {
          console.warn('Progress save warning:', err.message);
        }
      }, 1000);
    },
    [book, bookId, user]
  );

  useEffect(() => {
    if (user && book && currentPage > 0) {
      saveProgress(currentPage);
    }
  }, [book, user, currentPage, saveProgress]);

  const goToPage = useCallback(
    (targetPage) => {
      const bounded = Math.max(1, Math.min(pageCount, targetPage));
      if (bounded !== currentPage) {
        setTurnDirection(bounded > currentPage ? 1 : -1);
        setCurrentPage(bounded);
        saveProgress(bounded);
      }
    },
    [currentPage, pageCount, saveProgress]
  );

  const nextPage = useCallback(() => {
    const step = twoPageSpread ? 2 : 1;
    if (currentPage < pageCount) {
      goToPage(currentPage + step);
    } else if (currentPage === pageCount) {
      setCurrentPage(pageCount + 1);
    }
  }, [currentPage, pageCount, goToPage, twoPageSpread]);

  const prevPage = useCallback(() => {
    const step = twoPageSpread ? 2 : 1;
    if (currentPage > 1) {
      goToPage(currentPage - step);
    }
  }, [currentPage, goToPage, twoPageSpread]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
  };

  const handleContainerClick = (e) => {
    if (e.target.closest('button, a, input, select, [role="button"]')) return;

    const width = window.innerWidth;
    const clickX = e.clientX;

    if (clickX < width * 0.12) {
      prevPage();
    } else if (clickX > width * 0.88) {
      nextPage();
    }
  };

  const handleUpdateSettings = async (newAttrs) => {
    const updated = { ...settings, ...newAttrs };
    setSettings(updated);
    if (user) {
      try {
        const res = await api.me.updateSettings(newAttrs);
        if (res?.readerSettings) {
          updateUser({ readerSettings: res.readerSettings });
        }
      } catch (err) {
        console.warn('Failed to save settings:', err);
      }
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !book?.pageOffsets) return;
    const currentOffset = book.pageOffsets[currentPage - 1] || 0;

    try {
      if (isBookmarked) {
        const updated = await api.me.updateLibraryBook(bookId, {
          removeBookmark: { offset: currentOffset },
        });
        if (updated) setLibraryEntry(updated);
        setIsBookmarked(false);
      } else {
        const updated = await api.me.updateLibraryBook(bookId, {
          addBookmark: { offset: currentOffset },
        });
        if (updated) setLibraryEntry(updated);
        setIsBookmarked(true);
      }
    } catch (err) {
      console.warn('Bookmark update failed:', err);
    }
  };

  const getThemeStyles = () => {
    switch (settings.theme) {
      case 'dark':
        return {
          wrapperBg: 'bg-[#121214] text-white',
          topBarBg: 'bg-[#18181B] border-[#2E2E33] text-white',
          navArrow: 'bg-[#222226] hover:bg-[#2E2E33] text-white border-[#383840]',
          btn: 'border-[#383840] hover:bg-[#2E2E33] text-white',
          subtitle: 'text-[#9CA3AF]',
        };
      case 'sepia':
        return {
          wrapperBg: 'bg-[#F4ECD8] text-[#382C1E]',
          topBarBg: 'bg-[#F4ECD8] border-[#D9D2C3] text-[#382C1E]',
          navArrow: 'bg-[#EAE0C7] hover:bg-[#DFD4B7] text-[#382C1E] border-[#D9D2C3]',
          btn: 'border-[#D9D2C3] hover:bg-rule/40 text-[#382C1E]',
          subtitle: 'text-[#7C6A53]',
        };
      default:
        return {
          wrapperBg: 'bg-paper text-ink',
          topBarBg: 'bg-paper border-rule text-ink',
          navArrow: 'bg-paper hover:bg-rule/40 border border-rule text-ink',
          btn: 'border-rule hover:bg-rule/40 text-ink',
          subtitle: 'text-muted',
        };
    }
  };

  const themeStyles = getThemeStyles();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 ${themeStyles.wrapperBg}`}>
        <p className="text-sm font-bold text-muted">Loading…</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-paper text-ink">
        <h2 className="text-xl font-bold mb-2">Unable to Open Reader</h2>
        <p className="text-muted text-sm max-w-md mb-6">{error || 'Story not found.'}</p>
        <Link to="/browse">
          <button className="px-4 py-2 bg-ink text-paper rounded text-sm font-bold cursor-pointer">
            Back to Catalogue
          </button>
        </Link>
      </div>
    );
  }

  const isAtFinishCard = currentPage > pageCount;
  const currentText = pagesCache[currentPage] || '';
  const nextSpreadText = twoPageSpread && currentPage + 1 <= pageCount ? pagesCache[currentPage + 1] || '' : null;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between select-text relative ${themeStyles.wrapperBg}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >
      <header
        className={`sticky top-0 inset-x-0 z-40 border-b px-4 sm:px-8 py-3 flex items-center justify-between ${themeStyles.topBarBg}`}
      >
        <div className="flex items-center gap-3">
          <Link
            to={`/book/${bookId}`}
            className={`p-1.5 rounded hover:bg-rule/40 cursor-pointer ${themeStyles.btn}`}
            title="Return to Story Overview"
            aria-label="Back to story overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm truncate max-w-xs md:max-w-md">
              {book.title}
            </h1>
            <span className={`text-[11px] block ${themeStyles.subtitle}`}>
              {book.genre || 'Story'} • Page {Math.min(currentPage, pageCount)} of {pageCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowInsights(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold border cursor-pointer ${themeStyles.btn}`}
            title="Story Insights"
            aria-label="Story Insights"
          >
            <span className="text-xs">Insights</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-2 rounded border cursor-pointer ${
              isBookmarked
                ? 'border-accent text-accent font-bold'
                : themeStyles.btn
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Mark Page'}
            aria-label={isBookmarked ? 'Remove Bookmark' : 'Mark Page'}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowBookmarks(true)}
            className={`p-2 rounded border cursor-pointer ${themeStyles.btn}`}
            title="View All Bookmarks"
            aria-label="Saved Bookmarks"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {isWideScreen && (
            <button
              type="button"
              onClick={() => setTwoPageSpread(!twoPageSpread)}
              className={`p-2 rounded border cursor-pointer ${
                twoPageSpread
                  ? 'border-accent text-accent font-bold'
                  : themeStyles.btn
              }`}
              title={twoPageSpread ? 'Switch to Single Page' : 'Switch to Two-Page Spread'}
              aria-label="Toggle two page spread"
            >
              {twoPageSpread ? <Columns2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded border cursor-pointer ${themeStyles.btn}`}
            title="Reader Typography & Theme Settings"
            aria-label="Reader Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center py-6 pb-24 relative overflow-hidden">
        <button
          type="button"
          onClick={prevPage}
          disabled={currentPage <= 1}
          className={`fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded border border-rule disabled:opacity-0 disabled:pointer-events-none cursor-pointer ${themeStyles.navArrow}`}
          title="Previous Page (Left Arrow)"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={nextPage}
          disabled={isAtFinishCard}
          className={`fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded border border-rule disabled:opacity-0 disabled:pointer-events-none cursor-pointer ${themeStyles.navArrow}`}
          title="Next Page (Right Arrow or Space)"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {isAtFinishCard ? (
          <FinishCard
            book={book}
            theme={settings.theme}
            onReplayFromStart={() => goToPage(1)}
          />
        ) : (
          <PageView
            key={`pv-${currentPage}-${twoPageSpread ? 'spread' : 'single'}`}
            pageText={currentText}
            nextPageText={nextSpreadText}
            pageNumber={currentPage}
            pageCount={pageCount}
            twoPageSpread={twoPageSpread}
            language={book.language || 'en'}
            settings={settings}
            direction={turnDirection}
          />
        )}
      </main>

      <Scrubber
        currentPage={Math.min(currentPage, pageCount)}
        pageCount={pageCount}
        sceneMarkers={sceneMarkers}
        theme={settings.theme}
        onPageChange={goToPage}
      />

      {showSettings && (
        <ReaderSettingsPopover
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <BookmarksDrawer
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        bookmarks={libraryEntry?.bookmarks || []}
        pageOffsets={book.pageOffsets || []}
        theme={settings.theme}
        onJumpToPage={goToPage}
        onRemoveBookmark={async (offset) => {
          try {
            const updated = await api.me.updateLibraryBook(bookId, {
              removeBookmark: { offset },
            });
            if (updated) setLibraryEntry(updated);
          } catch (bmErr) {
            console.warn('Remove bookmark failed:', bmErr);
          }
        }}
      />

      <InsightsDrawer
        isOpen={showInsights}
        onClose={() => setShowInsights(false)}
        book={book}
        currentPage={currentPage}
        furthestPage={libraryEntry?.furthestPage || currentPage}
        theme={settings.theme}
      />

      <MatureGateModal
        isOpen={showMatureGate}
        onAcknowledge={() => {
          setShowMatureGate(false);
          updateUser({ matureAckAt: new Date().toISOString() });
          fetchPageWindow(currentPage);
        }}
      />
    </div>
  );
}
