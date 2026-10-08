import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Trash2, Edit3 } from 'lucide-react';
import { api } from '../../services/api.js';
import ReportButton from './ReportButton.jsx';
import Button from './Button.jsx';

export default function BookReviews({ bookId, bookTitle, writerId }) {
  const effectiveBookId = (bookId?._id || bookId?.id || bookId)?.toString();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ ratingAvg: 0, ratingCount: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [userReview, setUserReview] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const currentUser = api.auth.getCurrentUser();
  const authorIdStr = (writerId?._id || writerId?.id || writerId)?.toString();
  const currentUserIdStr = (currentUser?.id || currentUser?._id)?.toString();
  const isBookAuthor = Boolean(currentUserIdStr && authorIdStr && currentUserIdStr === authorIdStr);

  const loadReviews = useCallback(async (page = 1, sortOption = sort) => {
    if (!effectiveBookId) return;
    try {
      setLoading(true);
      const res = await api.reviews.getReviews(effectiveBookId, { page, limit: 10, sort: sortOption });
      setReviews(res.reviews || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) setPagination(res.pagination);
      setUserReview(res.userReview !== undefined ? res.userReview : null);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveBookId, sort]);

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

    if (!effectiveBookId) {
      setFormError('Unable to identify book. Please reload the page and try again.');
      return;
    }

    setSubmitting(true);

    try {
      if (userReview) {
        await api.reviews.updateReview(effectiveBookId, userReview._id, {
          rating: ratingInput,
          text: textInput,
        });
        setFormSuccess('Review updated successfully.');
      } else {
        await api.reviews.createReview(effectiveBookId, {
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
    if (!userReview || !effectiveBookId) return;
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      await api.reviews.deleteReview(effectiveBookId, userReview._id);
      setUserReview(null);
      setIsEditing(false);
      await loadReviews(1, sort);
    } catch (err) {
      alert(err.message || 'Failed to delete review.');
    }
  };

  const totalVotes = stats.ratingCount || 0;

  return (
    <div className="space-y-6">
      <div className="bg-paper border border-rule rounded p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 text-center md:border-r md:border-rule md:pr-6">
            <div className="text-4xl font-bold text-ink">
              {stats.ratingAvg ? stats.ratingAvg.toFixed(1) : '0.0'}
            </div>
            <div className="flex items-center justify-center gap-1 my-2 text-ink">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(stats.ratingAvg || 0)
                      ? 'fill-current text-ink'
                      : 'text-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted">
              Based on {totalVotes.toLocaleString()} {totalVotes === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          <div className="md:col-span-8 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.histogram?.[stars] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 w-10 shrink-0 justify-end font-semibold text-ink">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-current text-ink" />
                  </div>
                  <div className="flex-1 h-2 bg-rule rounded overflow-hidden">
                    <div
                      className="h-full bg-ink rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-10 text-right shrink-0 text-muted font-mono">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border border-rule rounded p-6 bg-paper">
        {currentUser ? (
          isBookAuthor ? (
            <div className="text-center py-2 text-xs text-muted">
              As the author of this book, you cannot write reviews for it.
            </div>
          ) : isEditing ? (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <h3 className="text-base font-bold text-ink">
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>

              {formError && (
                <div className="p-3 bg-paper border border-danger text-danger text-xs rounded">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
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
                        className="p-1 text-muted hover:text-ink cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= activeStar
                              ? 'fill-current text-ink'
                              : 'text-muted'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-ink ml-2">
                    {ratingInput} out of 5 stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  maxLength={5000}
                  placeholder="Share your thoughts on this story..."
                  className="w-full bg-paper border border-rule rounded p-3 text-xs text-ink placeholder-muted focus:outline-none focus:border-ink font-body"
                />
                <div className="text-right text-[11px] text-muted mt-1">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider border border-rule text-ink px-2 py-0.5 rounded">
                    Your Review
                  </span>
                  <div className="flex items-center gap-0.5 text-ink">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= userReview.rating
                            ? 'fill-current text-ink'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-1 text-muted hover:text-ink rounded cursor-pointer"
                    title="Edit review"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    className="p-1 text-muted hover:text-danger rounded cursor-pointer"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {userReview.text ? (
                <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line font-body">
                  {userReview.text}
                </p>
              ) : (
                <p className="text-xs text-muted italic">No written review provided.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-ink text-sm">
                  Have you read {bookTitle}?
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Leave a rating and review to share your thoughts.
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div>
              <h4 className="font-bold text-ink text-sm">
                Enjoyed this book?
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Sign in to rate and review stories.
              </p>
            </div>
            <a href="/login">
              <Button variant="secondary" size="sm">
                Sign In to Review
              </Button>
            </a>
          </div>
        )}
      </div>

      {formSuccess && (
        <div className="p-3 bg-paper border border-success text-success text-xs rounded">
          {formSuccess}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <span>Community Reviews</span>
            <span className="text-xs font-mono text-muted">
              ({totalVotes})
            </span>
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-paper border border-rule rounded px-2.5 py-1 text-xs text-ink font-body focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted font-bold">
            Loading…
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <MessageSquare className="w-4 h-4 text-muted mx-auto" />
            <p className="text-xs font-bold text-ink">No reviews yet</p>
            <p className="text-xs text-muted">Be the first to share your thoughts on this story.</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {reviews.map((rev) => {
              const reader = rev.readerId || {};
              const isCurrentUser = currentUser && (currentUser.id === reader._id || currentUser._id === reader._id);

              return (
                <div key={rev._id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-rule bg-paper text-ink flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
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
                          <span className="text-xs font-bold text-ink">
                            {reader.name || 'Reader'}
                          </span>
                          {reader.username && (
                            <span className="text-[11px] text-muted">
                              @{reader.username}
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold uppercase border border-rule text-muted px-1 rounded">
                              You
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5 text-ink">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating
                                    ? 'fill-current text-ink'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrentUser && (
                      <ReportButton
                        targetType="review"
                        targetId={rev._id}
                        variant="icon"
                      />
                    )}
                  </div>

                  {rev.text && (
                    <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line pl-11 font-body">
                      {rev.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pt-4 flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => loadReviews(pagination.page - 1, sort)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
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
