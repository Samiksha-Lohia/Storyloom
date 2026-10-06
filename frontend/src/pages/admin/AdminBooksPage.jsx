import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Eye,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

const STATUSES = ['all', 'published', 'draft', 'suspended', 'archived'];

export function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Moderation Dialog State
  const [activeModal, setActiveModal] = useState(null); // { action: 'suspend' | 'restore', book }
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getBooks({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      const bookList = Array.isArray(res?.data)
        ? res.data
        : (res?.books || res?.data?.books || []);
      setBooks(bookList);
      setPagination(
        res?.pagination ||
          res?.data?.pagination || { total: bookList.length, totalPages: 1 }
      );
    } catch (err) {
      console.error('Failed to load admin books:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!activeModal || !actionReason.trim()) return;

    setSubmitting(true);
    try {
      if (activeModal.action === 'suspend') {
        await api.admin.suspendBook(activeModal.book._id, actionReason.trim());
      } else if (activeModal.action === 'restore') {
        await api.admin.restoreBook(activeModal.book._id, actionReason.trim());
      }
      setActiveModal(null);
      setActionReason('');
      fetchBooks();
    } catch (err) {
      alert(`Action failed: ${err.message || 'Please try again'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      published: 'border-success text-success',
      draft: 'border-rule text-muted',
      suspended: 'border-danger text-danger',
      archived: 'border-rule text-muted',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
          map[status] || map.draft
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-rule text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Content Governance
            </span>
          </div>
          <h1 className="font-calligraphy text-3xl font-normal text-ink mt-2">
            Manuscript Moderation &amp; Directory
          </h1>
          <p className="text-xs text-muted mt-1">
            Oversee all published, drafted, and flagged manuscripts across the platform catalogue.
          </p>
        </div>

        <span className="text-xs text-muted font-mono">
          Total titles: <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search manuscript title"
            placeholder="Search manuscript title..."
            className="w-full bg-paper border border-rule rounded pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ink"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter manuscripts by status"
            className="bg-paper border border-rule rounded px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-ink"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                Status: {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-paper border border-rule rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-paper border-b border-rule text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="p-3">Book</th>
                <th className="p-3">Author</th>
                <th className="p-3">Genre</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reads</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Reports</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted">
                    Loading…
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    No manuscripts found matching the filters.
                  </td>
                </tr>
              ) : (
                books.map((b) => {
                  const author = b.writerId || {};
                  const isPublished = b.status === 'published';
                  const isSuspended = b.status === 'suspended';

                  return (
                    <tr key={b._id} className="hover:bg-rule/10">
                      {/* Cover & Title */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-12 bg-paper rounded overflow-hidden shrink-0 border border-rule aspect-2/3">
                            {b.coverUrl ? (
                              <img
                                src={b.coverUrl}
                                alt={b.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted">
                                <BookOpen className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <span className="font-bold text-ink block truncate">
                              {b.title}
                            </span>
                            <span className="text-[10px] text-muted font-mono">
                              ID: {b._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="p-3">
                        <div className="font-semibold text-ink">{author.name || 'Author'}</div>
                        <div className="text-[11px] text-muted font-mono">
                          @{author.username || 'writer'}
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="p-3 font-medium text-muted">{b.genre || 'General'}</td>

                      {/* Status */}
                      <td className="p-3">{getStatusBadge(b.status)}</td>

                      {/* Reads */}
                      <td className="p-3 font-mono font-semibold text-ink">
                        {b.stats?.reads?.toLocaleString() || 0}
                      </td>

                      {/* Rating */}
                      <td className="p-3">
                        <span className="text-ink font-semibold flex items-center gap-1">
                          ★ {Number(b.stats?.ratingAvg || 0).toFixed(1)}
                        </span>
                      </td>

                      {/* Reports */}
                      <td className="p-3">
                        {b.reportsCount > 0 ? (
                          <span className="px-1.5 py-0.5 border border-danger text-danger font-bold rounded text-[10px]">
                            {b.reportsCount} report(s)
                          </span>
                        ) : (
                          <span className="text-muted font-mono">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/read/${b.id || b._id}`}
                            className="p-1 text-muted hover:text-ink border border-transparent hover:border-rule rounded"
                            title="Preview manuscript"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {isPublished && (
                            <button
                              onClick={() => {
                                setActiveModal({ action: 'suspend', book: b });
                                setActionReason('');
                              }}
                              className="px-2.5 py-1 bg-paper hover:bg-rule/10 text-danger border border-danger rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Takedown
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              onClick={() => {
                                setActiveModal({ action: 'restore', book: b });
                                setActionReason('');
                              }}
                              className="px-2.5 py-1 bg-ink text-paper hover:bg-accent rounded text-[11px] font-bold cursor-pointer"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-rule flex justify-between items-center text-xs">
            <span className="text-muted">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-paper border border-rule text-ink rounded font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 bg-paper border border-rule text-ink rounded font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-mod-dialog-title"
            className="bg-paper rounded max-w-md w-full p-6 space-y-4 border border-rule"
          >
            <div className="flex items-center justify-between">
              <h3 id="book-mod-dialog-title" className="font-bold text-base text-ink capitalize">
                {activeModal.action === 'restore'
                  ? 'Restore Manuscript to Catalogue'
                  : 'Manuscript Takedown / Suspension'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="p-1 text-muted hover:text-ink rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Target: <strong className="text-ink">{activeModal.book?.title}</strong> by{' '}
              {activeModal.book?.writerId?.name || 'author'}
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Reason for Action (sent to author &amp; recorded in audit log):
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain why this moderation action is being applied..."
                  className="w-full bg-paper border border-rule rounded p-2.5 text-xs text-ink placeholder:text-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={submitting}
                  className="px-3.5 py-1.5 border border-rule text-muted hover:text-ink rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-3.5 py-1.5 rounded text-xs font-bold cursor-pointer ${
                    activeModal.action === 'restore'
                      ? 'bg-ink text-paper hover:bg-accent'
                      : 'bg-paper text-danger border border-danger hover:bg-rule/10'
                  }`}
                >
                  {submitting ? 'Applying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBooksPage;
