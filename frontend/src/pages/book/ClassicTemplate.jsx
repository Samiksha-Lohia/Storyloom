import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CoverImage } from '../../components/common/CoverImage';
import { StarRating } from '../../components/common/StarRating';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Carousel } from '../../components/common/Carousel';
import { BookCard } from '../../components/common/BookCard';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { Check, Plus } from 'lucide-react';
import { InsightsDrawer } from '../../components/common/InsightsDrawer';
import BookReviews from '../../components/common/BookReviews.jsx';
import ReportButton from '../../components/common/ReportButton.jsx';



export function ClassicTemplate({ book, relatedBooks = [], user }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [descExpanded, setDescExpanded] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [libraryEntry, setLibraryEntry] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const bookId = book?.id || book?._id;

  // Load user's library progress for this book
  React.useEffect(() => {
    let isMounted = true;
    async function loadLibraryProgress() {
      if (!user || !bookId) return;
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
  }, [bookId, user]);

  const handleToggleWantToRead = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!bookId) return;

    try {
      setLibraryLoading(true);
      if (libraryEntry) {
        // Already in library
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

  // Format stats
  const formatNumber = (num = 0) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  // Reading time estimation (~200 words per minute; fallback 250 words per page)
  const totalWords = book.stats?.wordCount || (book.pageCount ? book.pageCount * 250 : 1500);
  const readingMinutes = Math.max(1, Math.round(totalWords / 200));
  const readingTimeText =
    readingMinutes >= 60
      ? `${Math.floor(readingMinutes / 60)}h ${readingMinutes % 60}m read`
      : `${readingMinutes} min read`;

  const updatedDate = book.updatedAt
    ? new Date(book.updatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  const isLongDesc = (book.description || '').length > 280;
  const displayDesc =
    isLongDesc && !descExpanded
      ? `${(book.description || '').slice(0, 280)}...`
      : book.description || 'No description available for this story.';

  const handleReport = (e) => {
    e.preventDefault();
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 4000);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Mature 18+ Warning Banner */}
      {book.mature && (
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
      )}

      {/* Main Classic Header (Cover Left, Details Right) */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
            <div className="w-52 sm:w-56 md:w-full max-w-[240px] rounded-2xl overflow-hidden shadow-lg border border-stone-200">
              <CoverImage
                publicId={book.coverImageId}
                title={book.title}
                genre={book.genre}
                preset="large"
                className="w-full"
              />
            </div>

            {/* Author Credit */}
            <div className="mt-4 text-center">
              <span className="text-xs text-stone-500 block">Written by</span>
              <span className="font-heading font-bold text-stone-800 text-sm">
                {book.authorId?.name || 'SceneCraft Author'}
              </span>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Category & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={book.genre || 'General Fiction'} />
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    book.isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {book.isComplete ? 'Complete' : 'Ongoing'}
                </span>
                {book.mature && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 text-stone-800">
                    18+
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-tight">
                {book.title}
              </h1>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-6 py-3 border-y border-stone-100 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">👁</span>
                  <div>
                    <span className="font-bold text-stone-900 block leading-tight">
                      {formatNumber(book.stats?.readCount || 0)}
                    </span>
                    <span className="text-[11px] text-stone-500">Reads</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating rating={book.stats?.rating || 0} size="sm" showValue={false} />
                  <div>
                    <span className="font-bold text-stone-900 block leading-tight">
                      {(book.stats?.rating || 0).toFixed(1)}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {formatNumber(book.stats?.ratingCount || 0)} ratings
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-stone-400">📄</span>
                  <div>
                    <span className="font-bold text-stone-900 block leading-tight">
                      {book.pageCount || 1}
                    </span>
                    <span className="text-[11px] text-stone-500">Pages / Chapters</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-stone-400">⏱</span>
                  <div>
                    <span className="font-bold text-stone-900 block leading-tight">
                      {readingTimeText}
                    </span>
                    <span className="text-[11px] text-stone-500">Est. Time</span>
                  </div>
                </div>
              </div>

              {/* Meta details line */}
              <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Updated on {updatedDate}</span>
                <span>•</span>
                <span>Language: {book.language || 'English'}</span>
                {book.copyright && (
                  <>
                    <span>•</span>
                    <span>Rights: {book.copyright}</span>
                  </>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 pt-2">
                <Link to={`/read/${bookId}`}>
                  <Button variant="primary" size="lg" className="shadow-md hover:shadow-lg">
                    {libraryEntry?.currentPage && libraryEntry.currentPage > 1
                      ? `Continue Reading (Page ${libraryEntry.currentPage})`
                      : 'Start Reading'}
                  </Button>
                </Link>

                {/* Round + Button */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleToggleWantToRead}
                    disabled={libraryLoading}
                    aria-label={libraryEntry ? 'In Library' : 'Add to Library'}
                    className={`w-12 h-12 rounded-full border transition flex items-center justify-center cursor-pointer shadow-xs ${
                      libraryEntry
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-[#FF500A] hover:text-[#FF500A]'
                    }`}
                  >
                    {libraryEntry ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5" />}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-stone-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none z-30">
                    {libraryEntry ? `In Your Library (${libraryEntry.status || 'reading'})` : 'Add to Library (Want to read)'}
                  </div>
                </div>

                {/* Report Story Button */}
                <ReportButton
                  targetType="book"
                  targetId={bookId}
                  targetTitle={book.title}
                  variant="button"
                />
              </div>


              {/* Tags */}
              {book.tags && book.tags.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description with Read more toggle */}
              <div className="pt-2">
                <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Synopsis
                </h2>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line font-serif">
                  {displayDesc}
                </p>
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 text-xs font-bold text-[#FF500A] hover:underline cursor-pointer"
                  >
                    {descExpanded ? 'Show less' : 'Read more...'}
                  </button>
                )}
              </div>
            </div>

            {/* Report Content Link */}
            <div className="pt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 mt-6">
              <button
                type="button"
                onClick={handleReport}
                className="hover:text-red-600 transition flex items-center gap-1 cursor-pointer"
              >
                <span>🚩</span> Report this story
              </button>
              {showReportSuccess && (
                <span className="text-emerald-600 font-semibold animate-fade-in">
                  Report submitted to SceneCraft moderation. Thank you!
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section: Summary / Insights / Reviews */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        {/* Tabs Bar */}
        <div className="flex border-b border-stone-200 gap-8" role="tablist">
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
                className={`pb-3 font-heading font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer ${
                  active
                    ? 'border-[#FF500A] text-[#FF500A]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="pt-6">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <h2 className="font-heading font-bold text-lg text-stone-900">Table of Contents</h2>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                {book.pageOffsets && book.pageOffsets.length > 0 ? (
                  book.pageOffsets.map((offset, idx) => (
                    <div
                      key={idx}
                      className="p-4 flex items-center justify-between hover:bg-stone-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-stone-400 w-6">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-medium text-stone-800 text-sm">
                          Chapter {idx + 1}
                        </span>
                      </div>
                      <Link to={`/read/${bookId}?page=${idx + 1}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Read
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <span className="font-medium text-stone-800 text-sm">Chapter 1</span>
                    <Link to={`/read/${bookId}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Read
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="pt-2">
              <InsightsDrawer
                inline={true}
                book={book}
                currentPage={libraryEntry?.currentPage || 1}
                furthestPage={libraryEntry?.furthestPage || 1}
              />
            </div>
          )}

          {activeTab === 'reviews' && (
            <BookReviews
              bookId={bookId}
              bookTitle={book.title}
              writerId={book.writerId?._id || book.writerId}
            />
          )}

        </div>
      </section>

      {/* Guest Sign-up Prompt */}
      {!user && (
        <section className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A]">
              Free Reader Account
            </span>
            <h2 className="font-heading text-2xl font-bold mt-1">
              Never lose your place in {book.title}
            </h2>
            <p className="text-stone-300 text-sm mt-1 leading-relaxed">
              Create a free SceneCraft account to save your reading progress, bookmark chapters, and follow your favorite authors.
            </p>
          </div>
          <div className="shrink-0 flex gap-3">
            <Link to="/signup">
              <Button variant="primary" size="lg">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* "You May Also Like" Row */}
      {relatedBooks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                You May Also Like
              </h2>
              <p className="text-xs text-stone-500">More stories from the {book.genre} genre</p>
            </div>
            <Link to={`/browse/${book.genre}`} className="text-xs font-bold text-[#FF500A] hover:underline">
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
      )}
    </div>
  );
}
