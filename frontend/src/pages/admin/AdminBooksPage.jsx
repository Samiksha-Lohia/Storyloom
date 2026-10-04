import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  BookOpen,
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  RefreshCw,
  Archive,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

const STATUSES = ['all', 'published', 'draft', 'suspended', 'unpublished'];

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Action Modal State
  const [activeModal, setActiveModal] = useState(null); // { action: 'unpublish'|'suspend'|'restore'|'takedown', book }
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.admin.getBooks({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setBooks(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load books:', err);
      setError(err.message || 'Failed to load books directory.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!activeModal?.book) return;
    setSubmitting(true);
    try {
      const bookId = activeModal.book.id || activeModal.book._id;
      await api.admin.updateBook(bookId, {
        action: activeModal.action,
        reason: actionReason,
      });
      setActiveModal(null);
      setActionReason('');
      await fetchBooks();
    } catch (err) {
      alert(err.message || 'Failed to apply book moderation action.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      draft: 'bg-slate-100 text-slate-700 border-slate-200',
      suspended: 'bg-rose-50 text-rose-800 border-rose-200',
      unpublished: 'bg-amber-50 text-amber-800 border-amber-200',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
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
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF500A] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Content Governance
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            Manuscript Moderation & Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Oversee all published, drafted, and flagged manuscripts across the platform catalogue.
          </p>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Total titles: <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search manuscript title"
            placeholder="Search manuscript title..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
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
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
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
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Book</th>
                <th className="p-4">Author</th>
                <th className="p-4">Genre</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reads</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Reports</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="p-4">
                      <div className="h-8 bg-slate-100 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No manuscripts found matching the filters.
                  </td>
                </tr>
              ) : (
                books.map((b) => {
                  const author = b.writerId || {};
                  const isPublished = b.status === 'published';
                  const isSuspended = b.status === 'suspended';

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cover & Title */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                            {b.coverUrl ? (
                              <img
                                src={b.coverUrl}
                                alt={b.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <BookOpen className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <span className="font-serif font-bold text-slate-900 block truncate">
                              {b.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {b._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{author.name || 'Author'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          @{author.username || 'writer'}
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="p-4 font-medium text-slate-600">{b.genre || 'General'}</td>

                      {/* Status */}
                      <td className="p-4">{getStatusBadge(b.status)}</td>

                      {/* Reads */}
                      <td className="p-4 font-mono font-semibold text-slate-700">
                        {b.stats?.reads?.toLocaleString() || 0}
                      </td>

                      {/* Rating */}
                      <td className="p-4">
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          ★ {Number(b.stats?.ratingAvg || 0).toFixed(1)}
                        </span>
                      </td>

                      {/* Reports */}
                      <td className="p-4">
                        {b.reportsCount > 0 ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px]">
                            {b.reportsCount} report(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/read/${b.id || b._id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
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
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
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
          <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-500">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-mod-dialog-title"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 id="book-mod-dialog-title" className="font-serif font-bold text-lg text-slate-900 capitalize">
                {activeModal.action === 'restore'
                  ? 'Restore Manuscript to Catalogue'
                  : 'Manuscript Takedown / Suspension'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Target: <strong className="text-slate-900">{activeModal.book?.title}</strong> by{' '}
              {activeModal.book?.writerId?.name || 'author'}
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Action (sent to author & recorded in audit log):
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain why this moderation action is being applied..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    activeModal.action === 'restore'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
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
