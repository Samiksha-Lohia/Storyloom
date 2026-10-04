import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Trash2, Edit3, ChevronDown } from 'lucide-react';
import { api } from '../../services/api.js';
import ReportButton from './ReportButton.jsx';
import Button from './Button.jsx';

export default function BookReviews({ bookId, bookTitle, writerId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ ratingAvg: 0, ratingCount: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [userReview, setUserReview] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const currentUser = api.auth.getCurrentUser();
  const isReader = currentUser?.role === 'reader';
  const isWriterOrPub = currentUser?.role === 'writer' || currentUser?.role === 'publisher';
  const isBookAuthor = currentUser && writerId && (currentUser.id === writerId || currentUser._id === writerId);

  const loadReviews = useCallback(async (page = 1, sortOption = sort) => {
    try {
      setLoading(true);
      const data = await api.reviews.getReviews(bookId, { page, limit: 10, sort: sortOption });
      setReviews(data.reviews || []);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setPagination(data.pagination);
      if (data.userReview) {
        setUserReview(data.userReview);
      } else {
        setUserReview(null);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [bookId, sort]);

  useEffect(() => {
    loadReviews(1, sort);
  }, [loadReviews, sort]);

  const handleStartEdit = () => {
    if (userReview) {
      setRatingInput(userReview.rating || 5);
      setTextInput(userReview.text || '');
    } else {
      setRatingInput(5);
      setTextInput('');
    }
    setFormError(null);
    setFormSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (userReview) {
        // Update existing review
        await api.reviews.updateReview(bookId, userReview._id, {
          rating: ratingInput,
          text: textInput,
        });
        setFormSuccess('Review updated successfully.');
      } else {
        // Create new review
        await api.reviews.createReview(bookId, {
          rating: ratingInput,
          text: textInput,
        });
        setFormSuccess('Thank you! Your review has been posted.');
      }

      setIsEditing(false);
      await loadReviews(1, sort);
    } catch (err) {
      setFormError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      await api.reviews.deleteReview(bookId, userReview._id);
      setUserReview(null);
      setIsEditing(false);
      await loadReviews(1, sort);
    } catch (err) {
      alert(err.message || 'Failed to delete review.');
    }
  };

  const totalVotes = stats.ratingCount || 0;

  return (
    <div className="space-y-8">
      {/* Rating & Review Header Summary */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-3xl p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Average Rating Big Display */}
          <div className="md:col-span-4 text-center md:border-r md:border-stone-200 md:pr-8">
            <div className="font-heading text-5xl sm:text-6xl font-black text-stone-900 tracking-tight">
              {stats.ratingAvg ? stats.ratingAvg.toFixed(1) : '0.0'}
            </div>
            <div className="flex items-center justify-center gap-1 my-2 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.ratingAvg || 0)
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Based on {totalVotes.toLocaleString()} {totalVotes === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Histogram Bars */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.histogram?.[stars] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-12 shrink-0 justify-end font-semibold text-stone-700">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  </div>
                  <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-12 text-right shrink-0 text-stone-500 font-mono">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Review Action Area */}
      <div className="border border-stone-200 rounded-3xl p-6 sm:p-8 bg-white shadow-xs">
        {currentUser ? (
          isBookAuthor ? (
            <div className="text-center py-4 text-xs text-stone-500">
              As the author of this book, you cannot write reviews for it.
            </div>
          ) : isWriterOrPub ? (
            <div className="text-center py-4 text-xs text-stone-500">
              Only reader accounts can post community reviews and ratings.
            </div>
          ) : isEditing ? (
            /* Write / Edit Form */
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <h3 className="font-heading text-lg font-bold text-stone-900">
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStar = hoverRating || ratingInput;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-stone-300 hover:text-amber-500 transition cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= activeStar
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-stone-700 ml-2">
                    {ratingInput} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  maxLength={5000}
                  placeholder="What did you love or dislike about this book? Share your thoughts with other readers..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                />
                <div className="text-right text-[11px] text-stone-400 mt-1">
                  {textInput.length} / 5000
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : userReview ? 'Save Changes' : 'Post Review'}
                </Button>
              </div>
            </form>
          ) : userReview ? (
            /* Current User Review Card */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF500A] px-2.5 py-0.5 rounded-full">
                    Your Review
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= userReview.rating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                    title="Edit review"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {userReview.text ? (
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {userReview.text}
                </p>
              ) : (
                <p className="text-xs text-stone-400 italic">No written review provided.</p>
              )}
            </div>
          ) : (
            /* Write button for active reader */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-heading font-bold text-stone-900 text-base">
                  Have you read {bookTitle}?
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Leave a rating and review to share your impressions with the community.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleStartEdit}
                className="shrink-0"
              >
                Write a Review
              </Button>
            </div>
          )
        ) : (
          /* Guest prompt */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div>
              <h4 className="font-heading font-bold text-stone-900 text-base">
                Enjoyed this book?
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Sign in with a free reader account to rate and review stories.
              </p>
            </div>
            <a href="/login">
              <Button variant="outline" size="sm">
                Sign In to Review
              </Button>
            </a>
          </div>
        )}
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl">
          {formSuccess}
        </div>
      )}

      {/* Community Reviews List & Filter Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <h3 className="font-heading font-bold text-lg text-stone-900 flex items-center gap-2">
            <span>Community Reviews</span>
            <span className="text-xs font-mono font-medium text-stone-400">
              ({totalVotes})
            </span>
          </h3>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 font-medium">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-2.5 py-1 text-xs text-stone-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF500A]"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700">No reviews yet</p>
            <p className="text-xs text-stone-400">Be the first to share your thoughts on this story!</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {reviews.map((rev) => {
              const reader = rev.readerId || {};
              const isCurrentUser = currentUser && (currentUser.id === reader._id || currentUser._id === reader._id);

              return (
                <div key={rev._id} className="py-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                        {reader.avatarUrl ? (
                          <img
                            src={reader.avatarUrl}
                            alt={reader.name || 'Reader'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (reader.name || 'R').charAt(0)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            {reader.name || 'Reader'}
                          </span>
                          {reader.username && (
                            <span className="text-[11px] text-stone-400">
                              @{reader.username}
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm">
                              You
                            </span>
                          )}
                        </div>

                        {/* Star Rating & Date */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Report Review Button */}
                    {!isCurrentUser && (
                      <ReportButton
                        targetType="review"
                        targetId={rev._id}
                        variant="icon"
                      />
                    )}
                  </div>

                  {rev.text && (
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line pl-12">
                      {rev.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => loadReviews(pagination.page - 1, sort)}
            >
              Previous
            </Button>
            <span className="text-xs text-stone-500 px-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadReviews(pagination.page + 1, sort)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
