import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  BookOpen,
  CheckCircle,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { StarRating } from '../../components/common/StarRating';

export function WriterReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [books, setBooks] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [markingReadId, setMarkingReadId] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.writer.getReviews({
        bookId: selectedBookId || undefined,
        rating: selectedRating || undefined,
        unreadOnly: unreadOnly ? true : undefined,
        page,
        limit: 15,
      });

      setReviews(data.reviews || []);
      setBooks(data.books || []);
      setUnreadCount(data.unreadCount || 0);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedBookId, selectedRating, unreadOnly, page]);

  const handleMarkAsRead = async (reviewId) => {
    try {
      setMarkingReadId(reviewId);
      await api.reviews.markRead(reviewId);
      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => ((r._id || r.id) === reviewId ? { ...r, readByWriter: true } : r))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert(`Could not mark review as read: ${err.message}`);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleResetFilters = () => {
    setSelectedBookId('');
    setSelectedRating('');
    setUnreadOnly(false);
    setPage(1);
  };

  const hasActiveFilters = selectedBookId || selectedRating || unreadOnly;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-left">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-normal text-ink">
              Reader Reviews
            </h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-paper text-accent border border-accent">
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-paper text-success border border-success">
                <CheckCircle className="w-3.5 h-3.5" />
                All caught up
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Ratings, feedback, and reader impressions across all your published books.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-ink"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Link to="/w/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-ink hover:text-accent">
              View Dashboard Analytics →
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-paper rounded p-4 sm:p-5 border border-rule space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Story Selector */}
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Filter by Story
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-paper border border-rule text-xs font-bold text-ink rounded px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-ink cursor-pointer"
            >
              <option value="">All Stories ({books.length})</option>
              {books.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {/* Rating filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Star Rating
            </label>
            <div className="flex items-center gap-1">
              {[
                { label: 'All', value: '' },
                { label: '5★', value: '5' },
                { label: '4★', value: '4' },
                { label: '3★', value: '3' },
                { label: '2★', value: '2' },
                { label: '1★', value: '1' },
              ].map((btn) => {
                const isActive = selectedRating === btn.value;
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => {
                      setSelectedRating(btn.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
                      isActive
                        ? 'bg-ink text-paper border border-ink'
                        : 'bg-paper text-muted hover:text-ink border border-rule'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unread Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Status
            </label>
            <div className="inline-flex rounded bg-paper p-1 border border-rule">
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly(false);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                  !unreadOnly ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                All Reviews
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly(true);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                  unreadOnly ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                Unread Only
                {unreadCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border border-rule ${
                      unreadOnly ? 'bg-paper text-ink' : 'bg-paper text-accent'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-rule text-xs">
            <span className="text-muted">
              Showing filtered results ({pagination.total} matching)
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-muted hover:text-ink underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="bg-paper border border-danger rounded p-4 flex items-center gap-3 text-danger text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-bold flex-1">{error}</p>
          <Button size="sm" variant="secondary" onClick={fetchReviews}>
            Retry
          </Button>
        </div>
      )}

      {/* ─── Reviews List ───────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
          Loading…
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-paper rounded p-12 border border-rule text-center">
          {hasActiveFilters ? (
            <div>
              <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3" />
              <h3 className="text-base font-bold text-ink">No matching reviews</h3>
              <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                No reviews match your selected filters. Try broadening your story or rating criteria.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No reader reviews yet"
              description="As readers complete your chapters and leave ratings, their thoughtful reviews and constructive feedback will be collected here."
              actionLabel="Explore Writing Studio"
              actionTo="/w/books"
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isRead = review.readByWriter;
            const reader = review.readerId || {};
            const book = review.bookId || {};
            const reviewId = review._id || review.id;
            const isMarking = markingReadId === reviewId;

            return (
              <div
                key={reviewId}
                className="bg-paper rounded border border-rule p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Reader & Meta */}
                  <div className="flex items-start gap-3.5">
                    {reader.avatarUrl ? (
                      <img
                        src={reader.avatarUrl}
                        alt={reader.name || 'Reader'}
                        className="w-10 h-10 rounded object-cover border border-rule"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-paper border border-rule text-ink flex items-center justify-center font-bold text-sm shrink-0">
                        {(reader.name || reader.username || 'R').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-ink">
                          {reader.name || reader.username || 'Anonymous Reader'}
                        </span>
                        {reader.username && (
                          <span className="text-xs text-muted">@{reader.username}</span>
                        )}
                        {!isRead && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-accent text-accent bg-paper uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                        {book.title && (
                          <Link
                            to={`/book/${book.id || book._id}`}
                            className="inline-flex items-center gap-1 font-bold text-ink hover:text-accent"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-accent" />
                            {book.title}
                          </Link>
                        )}
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(review.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Mark Read Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <StarRating rating={review.rating} size="default" />

                    <div>
                      {isRead ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted font-bold py-1">
                          <Check className="w-3.5 h-3.5 text-success" />
                          Read
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(reviewId)}
                          disabled={isMarking}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-paper border border-rule text-ink hover:border-ink cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isMarking ? 'Marking...' : 'Mark as read'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Body */}
                <div className="mt-4 pt-3 border-t border-rule">
                  <p className="text-ink text-xs md:text-sm leading-relaxed whitespace-pre-line font-body">
                    {review.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pagination ─────────────────────────────────────────────── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-rule">
          <p className="text-xs text-muted">
            Page <span className="font-bold text-ink">{pagination.page}</span> of{' '}
            <span className="font-bold text-ink">{pagination.totalPages}</span> (
            {pagination.total} total reviews)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="flex items-center gap-1 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WriterReviewsPage;
