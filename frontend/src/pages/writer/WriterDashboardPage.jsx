import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  Star,
  MessageSquare,
  Bookmark,
  Sparkles,
  Mail,
  TrendingUp,
  BarChart2,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ReadsOverTimeChart,
  DropOffBarChart,
  RatingHistogram,
} from '../../components/writer/WriterCharts';

export function WriterDashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingReadId, setMarkingReadId] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.writer.getAnalytics({
        range,
        bookId: selectedBookId || undefined,
      });
      setAnalytics(data);
    } catch (err) {
      setError(err.message || 'Failed to load writer analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range, selectedBookId]);

  const handleMarkReviewRead = async (reviewId, bookId) => {
    try {
      setMarkingReadId(reviewId);
      await api.reviews.markRead(reviewId, bookId);
      setAnalytics((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latestReviews: prev.latestReviews.map((r) =>
            (r._id || r.id) === reviewId ? { ...r, readByWriter: true } : r
          ),
        };
      });
    } catch (err) {
      alert(`Could not mark review as read: ${err.message}`);
    } finally {
      setMarkingReadId(null);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
        Loading…
      </div>
    );
  }

  const {
    kpis = {},
    readsOverTime = [],
    dropOff = [],
    perBookComparison = [],
    ratingDistribution = {},
    latestReviews = [],
  } = analytics || {};

  const hasBooks = perBookComparison.length > 0;

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* ─── Top Bar: Welcome & Filters ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper p-6 rounded border border-rule">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-rule text-muted">
            Author Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-normal text-ink mt-1.5">
            Story Performance
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitor real reader engagement, retention drop-off, and feedback across your catalogue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Per-book filter */}
          {hasBooks && (
            <div className="flex items-center gap-1.5 bg-paper px-3 py-1.5 rounded border border-rule">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="bg-transparent text-xs font-bold text-ink focus:outline-hidden cursor-pointer"
                aria-label="Filter by book"
              >
                <option value="">All Stories</option>
                {perBookComparison.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Range toggle */}
          <div className="flex items-center bg-paper p-1 rounded border border-rule">
            <button
              onClick={() => setRange(30)}
              className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                range === 30
                  ? 'bg-ink text-paper border border-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange(90)}
              className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                range === 90
                  ? 'bg-ink text-paper border border-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty state if writer has no books yet ────────────────────────── */}
      {!hasBooks ? (
        <EmptyState
          icon={BookOpen}
          title="No published stories yet"
          description="Publish your first manuscript to view reading trajectory, drop-off milestones, and real-time reviews."
          actionLabel="Publish a Story"
          actionTo="/w/books/new"
        />
      ) : (
        <>
          {/* ─── KPI Cards Row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* Total Reads */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Reads</span>
                <span className="p-1 rounded border border-rule bg-paper text-accent">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {Number(kpis.totalReads || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-muted mt-0.5">First-chapter entries</p>
              </div>
            </div>

            {/* Profile Views */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Profile Views</span>
                <span className="p-1 rounded border border-rule bg-paper text-muted">
                  <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {Number(kpis.profileViews || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-muted mt-0.5">Unique readers</p>
              </div>
            </div>

            {/* Average Rating */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Avg Rating</span>
                <span className="p-1 rounded border border-rule bg-paper text-accent">
                  <Star className="w-3.5 h-3.5 fill-accent" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : '—'}
                </span>
                <p className="text-[10px] text-muted mt-0.5">Across all ratings</p>
              </div>
            </div>

            {/* New Reviews */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">New Reviews</span>
                <span className="p-1 rounded border border-rule bg-paper text-muted">
                  <MessageSquare className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {Number(kpis.newReviews || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-muted mt-0.5">In last {range} days</p>
              </div>
            </div>

            {/* Reading List Adds */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Library Adds</span>
                <span className="p-1 rounded border border-rule bg-paper text-muted">
                  <Bookmark className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {Number(kpis.readingListAdds || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-muted mt-0.5">Saved by readers</p>
              </div>
            </div>

            {/* Publisher Wishlists */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Wishlisted</span>
                <span className="p-1 rounded border border-rule bg-paper text-accent">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {kpis.publisherWishlists || 0}
                </span>
                <p className="text-[10px] text-muted mt-0.5">By publishers</p>
              </div>
            </div>

            {/* Open Requests */}
            <div className="bg-paper p-5 rounded border border-rule flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Requests</span>
                <span className="p-1 rounded border border-rule bg-paper text-muted">
                  <Mail className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-ink">
                  {kpis.openRequests || 0}
                </span>
                <p className="text-[10px] text-muted mt-0.5">Publisher offers</p>
              </div>
            </div>
          </div>

          {/* ─── Charts Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reads & Views Over Time Line Chart */}
            <div className="bg-paper p-6 rounded border border-rule space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-ink flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span>Reads & Views Over Time</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Daily reader trajectories for the past {range} days
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-accent" />
                    Reads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-ink" />
                    Views
                  </span>
                </div>
              </div>

              <ReadsOverTimeChart data={readsOverTime} />
            </div>

            {/* "Where Readers Stop" Drop-off Bar Chart */}
            <div className="bg-paper p-6 rounded border border-rule space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-ink flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-accent" />
                    <span>Where Readers Stop</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Retention drop-off milestones by percentage of manuscript
                  </p>
                </div>
                <div className="text-[11px] font-bold text-muted bg-paper border border-rule px-2 py-0.5 rounded">
                  90-100% = Completed
                </div>
              </div>

              <DropOffBarChart data={dropOff} />
            </div>
          </div>

          {/* ─── Per-Book Comparison & Rating Distribution Row ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Per-Book Comparison Table (2 cols) */}
            <div className="lg:col-span-2 bg-paper p-6 rounded border border-rule space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-ink">
                    Story Catalogue Comparison
                  </h2>
                  <p className="text-xs text-muted">
                    Side-by-side reads, completion ratios, and ratings
                  </p>
                </div>
                <Link to="/w/books">
                  <Button variant="ghost" size="xs" className="gap-1">
                    <span>Manage Books</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rule text-muted font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold">Story</th>
                      <th className="pb-3 font-bold">Reads</th>
                      <th className="pb-3 font-bold">Completion Rate</th>
                      <th className="pb-3 font-bold">Rating</th>
                      <th className="pb-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {perBookComparison.map((book) => (
                      <tr key={book.id} className="hover:bg-paper">
                        <td className="py-3 font-bold text-ink max-w-[200px] truncate">
                          {book.title}
                        </td>
                        <td className="py-3 text-ink">
                          {book.reads.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 max-w-[120px]">
                            <div className="flex-1 h-2 bg-paper border border-rule rounded overflow-hidden">
                              <div
                                className="h-full bg-ink"
                                style={{ width: `${book.completionRate || 0}%` }}
                              />
                            </div>
                            <span className="text-muted text-[11px]">
                              {book.completionRate || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 font-bold text-ink">
                            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                            <span>{book.ratingAvg ? book.ratingAvg.toFixed(1) : '—'}</span>
                            <span className="text-muted font-normal">({book.ratingCount})</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/w/books/${book.id}/insights`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                          >
                            <span>Analysis</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rating Distribution Histogram (1 col) */}
            <div className="bg-paper p-6 rounded border border-rule space-y-4">
              <div>
                <h2 className="font-bold text-base text-ink flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-accent fill-accent" />
                  <span>Rating Breakdown</span>
                </h2>
                <p className="text-xs text-muted">
                  Distribution across all reader reviews
                </p>
              </div>

              <RatingHistogram distribution={ratingDistribution} />
            </div>
          </div>

          {/* ─── Recent Reviews Section ─────────────────────────────────────── */}
          <div className="bg-paper p-6 sm:p-8 rounded border border-rule space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-ink flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-accent" />
                  <span>Recent Reader Reviews</span>
                </h2>
                <p className="text-xs text-muted">
                  Latest thoughts and ratings left on your published stories
                </p>
              </div>
              <Link to="/w/reviews">
                <Button variant="secondary" size="xs" className="gap-1">
                  <span>View All Reviews</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {latestReviews.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No reviews posted on your stories yet.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {latestReviews.map((rev) => {
                  const revId = rev._id || rev.id;
                  const isUnread = !rev.readByWriter;
                  return (
                    <div key={revId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-ink">
                            {rev.readerId?.name || rev.readerId?.username || 'Reader'}
                          </span>
                          <span className="text-[11px] text-muted">on</span>
                          <span className="text-xs font-bold text-ink">
                            {rev.bookId?.title || 'Story'}
                          </span>
                          <div className="flex items-center gap-0.5 ml-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < rev.rating
                                    ? 'fill-accent text-accent'
                                    : 'text-rule'
                                }`}
                              />
                            ))}
                          </div>
                          {isUnread && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-accent text-accent bg-paper">
                              New
                            </span>
                          )}
                        </div>

                        {rev.text && (
                          <p className="text-xs text-muted italic">
                            "{rev.text}"
                          </p>
                        )}
                        <p className="text-[10px] text-muted">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleMarkReviewRead(revId, rev.bookId?._id || rev.bookId)}
                          disabled={markingReadId === revId}
                          className="gap-1 shrink-0 text-muted hover:text-ink"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default WriterDashboardPage;
