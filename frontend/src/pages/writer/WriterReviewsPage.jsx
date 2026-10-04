import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  BookOpen,
  Filter,
  CheckCircle,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#121212]">
              Reader Reviews
            </h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF500A]/10 text-[#FF500A] border border-[#FF500A]/20">
                <span className="w-2 h-2 rounded-full bg-[#FF500A] animate-pulse" />
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                All caught up
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Ratings, feedback, and reader impressions across all your published books.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/w/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-[#FF500A]">
              View Dashboard Analytics →
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5E5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Story Selector */}
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Filter by Story
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#F7F7F7] border border-[#E5E5E5] text-sm text-[#121212] rounded-xl px-3.5 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] transition-all"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#121212] text-white shadow-xs'
                        : 'bg-[#F7F7F7] text-slate-700 hover:bg-slate-200/80 border border-[#E5E5E5]'
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Status
            </label>
            <div className="inline-flex rounded-xl bg-[#F7F7F7] p-1 border border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly(false);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  !unreadOnly ? 'bg-white shadow-xs text-[#121212]' : 'text-slate-500 hover:text-slate-800'
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
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  unreadOnly ? 'bg-[#FF500A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unread Only
                {unreadCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      unreadOnly ? 'bg-white/20 text-white' : 'bg-[#FF500A]/10 text-[#FF500A]'
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
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]/60 text-xs">
            <span className="text-slate-500">
              Showing filtered results ({pagination.total} matching)
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[#FF500A] font-semibold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p className="text-sm flex-1">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchReviews}>
            Retry
          </Button>
        </div>
      )}

      {/* ─── Reviews List ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="w-32 h-4 rounded-md" />
                  <Skeleton className="w-20 h-3 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-full h-14 rounded-lg" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E5E5] text-center">
          {hasActiveFilters ? (
            <div>
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#121212]">No matching reviews</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No reviews match your selected filters. Try broadening your story or rating criteria.
              </p>
              <Button
                variant="outline"
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
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 ${
                  isRead
                    ? 'border-[#E5E5E5]'
                    : 'border-[#FF500A]/40 ring-1 ring-[#FF500A]/10 bg-linear-to-r from-white via-white to-[#FFF0E8]/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Reader & Meta */}
                  <div className="flex items-start gap-3.5">
                    {reader.avatarUrl ? (
                      <img
                        src={reader.avatarUrl}
                        alt={reader.name || 'Reader'}
                        className="w-10 h-10 rounded-full object-cover border border-[#E5E5E5]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#121212] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {(reader.name || reader.username || 'R').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#121212]">
                          {reader.name || reader.username || 'Anonymous Reader'}
                        </span>
                        {reader.username && (
                          <span className="text-xs text-slate-400">@{reader.username}</span>
                        )}
                        {!isRead && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF500A] text-white uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        {book.title && (
                          <Link
                            to={`/book/${book.id || book._id}`}
                            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#FF500A] transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#FF500A]" />
                            {book.title}
                          </Link>
                        )}
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-400">
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
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium py-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Read
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(reviewId)}
                          disabled={isMarking}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#FFF0E8] text-[#FF500A] hover:bg-[#FF500A] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isMarking ? 'Marking...' : 'Mark as read'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Body */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-serif">
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
        <div className="flex items-center justify-between pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-[#121212]">{pagination.page}</span> of{' '}
            <span className="font-semibold text-[#121212]">{pagination.totalPages}</span> (
            {pagination.total} total reviews)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
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
