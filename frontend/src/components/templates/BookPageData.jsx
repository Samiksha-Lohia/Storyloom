import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, BookOpen, Star, Eye, Clock, AlertTriangle, User as UserIcon } from 'lucide-react';
import { api } from '../../services/api';
import { CoverImage } from '../common/CoverImage';
import { StarRating } from '../common/StarRating';
import { Button } from '../common/Button';
import { Carousel } from '../common/Carousel';
import { BookCard } from '../common/BookCard';
import { InsightsDrawer } from '../common/InsightsDrawer';
import BookReviews from '../common/BookReviews';
import ReportButton from '../common/ReportButton';
import { DEFAULT_ACCENT } from '../../constants/templates';

import ClassicTemplate from './ClassicTemplate';
import ShowcaseTemplate from './ShowcaseTemplate';
import NotebookTemplate from './NotebookTemplate';

/**
 * Shared data and state container for book pages and live previews.
 * Wraps around the 3 layout wrappers (Classic, Showcase, Notebook) with --accent token.
 */
export function BookPageData({
  book,
  relatedBooks = [],
  user = null,
  isPreview = false,
  forcedTemplate = null,
  forcedAccent = null,
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [descExpanded, setDescExpanded] = useState(false);
  const [libraryEntry, setLibraryEntry] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const bookId = book?.id || book?._id;

  // Effective template and accent
  const templateName = (forcedTemplate || book?.template || 'classic').toLowerCase();
  const accent = forcedAccent || book?.accent || DEFAULT_ACCENT;

  // Load library progress if not in preview mode
  useEffect(() => {
    let isMounted = true;
    async function loadLibraryProgress() {
      if (isPreview || !user || !bookId) return;
      try {
        const entry = await api.me.getLibraryBook(bookId);
        if (isMounted && entry) {
          setLibraryEntry(entry);
        }
      } catch (err) {
        // Not in library yet
      }
    }
    loadLibraryProgress();
    return () => {
      isMounted = false;
    };
  }, [bookId, user, isPreview]);

  const handleToggleWantToRead = async () => {
    if (isPreview) return;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!bookId) return;

    try {
      setLibraryLoading(true);
      if (libraryEntry) {
        const nextStatus = libraryEntry.status === 'want_to_read' ? 'reading' : 'want_to_read';
        const updated = await api.me.updateLibraryBook(bookId, { status: nextStatus });
        setLibraryEntry(updated);
      } else {
        const created = await api.me.updateLibraryBook(bookId, { status: 'want_to_read' });
        setLibraryEntry(created);
      }
    } catch (err) {
      console.warn('Library update warning:', err);
    } finally {
      setLibraryLoading(false);
    }
  };

  // Helper formatting
  const formatNumber = (num = 0) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  const totalWords = book?.stats?.wordCount || (book?.pageCount ? book.pageCount * 250 : 1800);
  const readingMinutes = Math.max(1, Math.round(totalWords / 200));
  const readingTimeText =
    readingMinutes >= 60
      ? `${Math.floor(readingMinutes / 60)}h ${readingMinutes % 60}m read`
      : `${readingMinutes} min read`;

  const updatedDate = book?.updatedAt
    ? new Date(book.updatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  const fullDesc = book?.blurb || book?.description || 'No description provided for this story.';
  const isLongDesc = fullDesc.length > 320;
  const displayDesc =
    isLongDesc && !descExpanded ? `${fullDesc.slice(0, 320)}...` : fullDesc;

  // Cover URL resolution (handles preview blob/url, Cloudinary id, or direct url)
  const coverUrl =
    book?.coverPreviewUrl ||
    book?.coverUrl ||
    (book?.coverPublicId ? `https://res.cloudinary.com/demo/image/upload/${book.coverPublicId}` : null);

  // Author details
  const authorName = book?.writerId?.name || book?.authorId?.name || 'SceneCraft Author';
  const authorUsername = book?.writerId?.username || book?.authorId?.username || null;
  const authorAvatar = book?.writerId?.avatarUrl || null;
  const authorBio = book?.writerId?.bio || 'Storyteller sharing worlds on SceneCraft.';

  // Render Subcomponents to pass to wrappers
  const renderActionButtons = (className = '') => (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {isPreview ? (
        <button
          type="button"
          disabled
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          className="px-6 py-3 rounded-full font-bold text-sm shadow-md opacity-90 cursor-default"
        >
          Start Reading (Preview)
        </button>
      ) : (
        <Link to={`/read/${bookId}`}>
          <button
            type="button"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            className="px-6 py-3 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {libraryEntry?.currentPage && libraryEntry.currentPage > 1
              ? `Continue Reading (Page ${libraryEntry.currentPage})`
              : 'Start Reading'}
          </button>
        </Link>
      )}

      {/* Library Bookmark Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleToggleWantToRead}
          disabled={libraryLoading || isPreview}
          aria-label={libraryEntry ? 'In Library' : 'Add to Library'}
          className={`w-11 h-11 rounded-full border transition flex items-center justify-center cursor-pointer shadow-xs ${
            libraryEntry
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'border-[#E5E5E5] bg-white text-slate-700 hover:border-[var(--accent)] hover:text-[var(--accent)]'
          }`}
        >
          {libraryEntry ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4" />}
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-[#121212] text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none z-30">
          {libraryEntry ? `In Library (${libraryEntry.status || 'reading'})` : 'Add to Reading List'}
        </div>
      </div>

      {!isPreview && bookId && (
        <ReportButton
          targetType="book"
          targetId={bookId}
          targetTitle={book.title}
          variant="button"
        />
      )}
    </div>
  );

  const renderTabsSection = () => (
    <section className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs">
      <div className="flex border-b border-[#E5E5E5] gap-8 overflow-x-auto" role="tablist">
        {[
          { id: 'summary', label: 'Summary & Chapters' },
          { id: 'insights', label: 'Narrative Insights' },
          { id: 'reviews', label: 'Community Reviews' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              style={
                active
                  ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : undefined
              }
              className={`pb-3 font-serif font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active ? '' : 'border-transparent text-[#64748B] hover:text-[#121212]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-lg text-[#121212]">Table of Contents</h2>
            <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-2xl overflow-hidden">
              {book?.pageOffsets && book.pageOffsets.length > 0 ? (
                book.pageOffsets.map((_, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex items-center justify-between hover:bg-[#F7F7F7] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium text-[#121212] text-sm">
                        Chapter {idx + 1}
                      </span>
                    </div>
                    {isPreview ? (
                      <span className="text-xs font-semibold text-slate-400">Page {idx + 1}</span>
                    ) : (
                      <Link to={`/read/${bookId}?page=${idx + 1}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Read
                        </Button>
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 flex items-center justify-between">
                  <span className="font-medium text-[#121212] text-sm">Chapter 1</span>
                  {isPreview ? (
                    <span className="text-xs text-slate-400">Page 1</span>
                  ) : (
                    <Link to={`/read/${bookId}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Read
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="pt-2">
            {isPreview ? (
              <div className="p-8 text-center bg-[#F7F7F7] rounded-2xl border border-dashed border-[#E5E5E5]">
                <p className="font-serif font-bold text-slate-700">Narrative Insights Preview</p>
                <p className="text-xs text-slate-500 mt-1">
                  Full character network, emotional arc, and scene intelligence will render here once published.
                </p>
              </div>
            ) : (
              <InsightsDrawer
                inline={true}
                book={book}
                currentPage={libraryEntry?.currentPage || 1}
                furthestPage={libraryEntry?.furthestPage || 1}
              />
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {isPreview ? (
              <div className="p-8 text-center bg-[#F7F7F7] rounded-2xl border border-dashed border-[#E5E5E5]">
                <p className="font-serif font-bold text-slate-700">Reader Reviews</p>
                <p className="text-xs text-slate-500 mt-1">
                  Reader ratings, sentiment breakdown, and comments will appear here.
                </p>
              </div>
            ) : (
              <BookReviews
                bookId={book?._id}
                bookTitle={book?.title}
                writerId={book?.writerId?._id || book?.writerId}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );

  const renderRelatedBooks = () => {
    if (isPreview || !relatedBooks || relatedBooks.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#121212]">
              You May Also Like
            </h2>
            <p className="text-xs text-[#64748B]">More stories in {book?.genre || 'Fiction'}</p>
          </div>
          <Link
            to={`/browse/${book?.genre}`}
            style={{ color: 'var(--accent)' }}
            className="text-xs font-bold hover:underline"
          >
            See more
          </Link>
        </div>

        <Carousel ariaLabel="Related stories carousel">
          {relatedBooks.map((relBook) => (
            <div key={relBook._id} className="w-36 sm:w-44 md:w-48 shrink-0">
              <BookCard book={relBook} />
            </div>
          ))}
        </Carousel>
      </section>
    );
  };

  const renderMatureWarning = () => {
    if (!book?.mature) return null;
    return (
      <div
        role="alert"
        className="bg-amber-500/10 border-l-4 border-amber-600 p-4 rounded-r-xl flex items-start gap-3"
      >
        <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
          18+
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Mature Content Warning
          </h2>
          <p className="text-xs text-amber-800 mt-0.5">
            This story contains mature themes, violence, or sensitive content intended strictly for adult readers.
          </p>
        </div>
      </div>
    );
  };

  const dataProps = {
    book,
    accent,
    coverUrl,
    authorName,
    authorUsername,
    authorAvatar,
    authorBio,
    formatNumber,
    readingTimeText,
    updatedDate,
    displayDesc,
    isLongDesc,
    descExpanded,
    setDescExpanded,
    renderActionButtons,
    renderTabsSection,
    renderRelatedBooks,
    renderMatureWarning,
    isPreview,
    user,
  };

  // Render selected layout wrapper
  if (templateName === 'showcase') {
    return <ShowcaseTemplate {...dataProps} />;
  }
  if (templateName === 'notebook') {
    return <NotebookTemplate {...dataProps} />;
  }
  return <ClassicTemplate {...dataProps} />;
}

export default BookPageData;
