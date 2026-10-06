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

  // Effective template and accent (safe fallback: 'accent' -> 'classic')
  let templateName = (forcedTemplate || book?.template || 'classic').toLowerCase();
  if (templateName === 'accent') {
    templateName = 'classic';
  }
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

  const coverUrl =
    book?.coverPreviewUrl ||
    book?.coverUrl ||
    (book?.coverPublicId ? `https://res.cloudinary.com/demo/image/upload/${book.coverPublicId}` : null);

  const authorName = book?.writerId?.name || book?.authorId?.name || 'Storyloom Author';
  const authorUsername = book?.writerId?.username || book?.authorId?.username || null;
  const authorAvatar = book?.writerId?.avatarUrl || null;
  const authorBio = book?.writerId?.bio || 'Storyteller sharing worlds on Storyloom.';

  const renderActionButtons = (className = '') => (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {isPreview ? (
        <button
          type="button"
          disabled
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          className="px-5 py-2 rounded font-bold text-xs cursor-default"
        >
          Start Reading (Preview)
        </button>
      ) : (
        <Link
          to={
            libraryEntry?.currentPage && libraryEntry.currentPage > 1
              ? `/read/${bookId}?page=${libraryEntry.currentPage}`
              : `/read/${bookId}`
          }
        >
          <button
            type="button"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            className="px-5 py-2 rounded font-bold text-xs cursor-pointer flex items-center gap-2 hover:opacity-90"
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
          className={`h-9 px-3 rounded border border-rule cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
            libraryEntry
              ? 'bg-ink text-paper border-ink'
              : 'bg-paper text-ink hover:border-ink'
          }`}
        >
          {libraryEntry ? (
            <>
              <Check className="w-4 h-4" />
              <span>In Library</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add to Library</span>
            </>
          )}
        </button>
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
    <section className="bg-paper rounded border border-rule p-6 sm:p-8 font-body text-ink">
      <div className="flex border-b border-rule gap-6 overflow-x-auto" role="tablist">
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
              className={`pb-2.5 font-bold text-xs uppercase tracking-wider border-b-2 cursor-pointer whitespace-nowrap ${
                active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
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
            <h2 className="font-bold text-base text-ink">Table of Contents</h2>
            <div className="divide-y divide-rule border border-rule rounded overflow-hidden bg-paper">
              {book?.pageOffsets && book.pageOffsets.length > 0 ? (
                book.pageOffsets.map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-center justify-between hover:bg-rule/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-muted w-6">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-ink text-xs">
                        Chapter {idx + 1}
                      </span>
                    </div>
                    {isPreview ? (
                      <span className="text-xs font-bold text-muted">Page {idx + 1}</span>
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
                <div className="p-3 flex items-center justify-between">
                  <span className="font-bold text-ink text-xs">Chapter 1</span>
                  {isPreview ? (
                    <span className="text-xs text-muted">Page 1</span>
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
              <div className="p-6 text-center bg-paper rounded border border-rule">
                <p className="font-bold text-ink text-sm">Narrative Insights Preview</p>
                <p className="text-xs text-muted mt-1">
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
              <div className="p-6 text-center bg-paper rounded border border-rule">
                <p className="font-bold text-ink text-sm">Reader Reviews</p>
                <p className="text-xs text-muted mt-1">
                  Reader ratings, sentiment breakdown, and comments will appear here.
                </p>
              </div>
            ) : (
              <BookReviews
                bookId={bookId}
                bookTitle={book?.title}
                writerId={book?.writerId?._id || book?.writerId?.id || book?.writerId}
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
      <section className="space-y-4 font-body">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-ink">
              You May Also Like
            </h2>
            <p className="text-xs text-muted">More stories in {book?.genre || 'Fiction'}</p>
          </div>
          <Link
            to={`/browse/${book?.genre}`}
            className="text-xs font-bold text-accent hover:underline"
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
        className="bg-paper border border-rule p-3 rounded flex items-start gap-3 font-body text-ink"
      >
        <span className="px-1.5 py-0.5 rounded bg-ink text-paper text-xs font-bold shrink-0">
          18+
        </span>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
            Mature Content Warning
          </h2>
          <p className="text-xs text-muted mt-0.5">
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

  // Whoever reads a book (reader, writer, publisher, admin) sees the Classic template
  return <ClassicTemplate {...dataProps} />;
}

export default BookPageData;

