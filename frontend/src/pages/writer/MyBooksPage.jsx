import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Eye,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import CoverImage from '../../components/common/CoverImage';
import { Skeleton } from '../../components/common/Skeleton';

export function MyBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.books.getMine();
      setBooks(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handlePublish = async (bookId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [bookId]: 'publishing' }));
      await api.books.update(bookId, { status: 'published' });
      await fetchBooks();
    } catch (err) {
      alert(err.message || 'Failed to publish story.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookId]: null }));
    }
  };

  const handleUnpublish = async (bookId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [bookId]: 'unpublishing' }));
      await api.books.update(bookId, { status: 'unpublished' });
      await fetchBooks();
    } catch (err) {
      alert(err.message || 'Failed to unpublish story.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookId]: null }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id || deleteTarget._id;
    try {
      setActionLoading((prev) => ({ ...prev, [targetId]: 'deleting' }));
      await api.books.delete(targetId);
      setDeleteTarget(null);
      await fetchBooks();
    } catch (err) {
      alert(err.message || 'Failed to delete story.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetId]: null }));
    }
  };

  const getStatusBadge = (book) => {
    switch (book.status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Published
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
            Processing
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
            <Clock className="w-3 h-3 text-stone-500" />
            Draft
          </span>
        );
      case 'unpublished':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Unpublished
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-600">
            {book.status}
          </span>
        );
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A]">
            Writer Studio
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-stone-900 mt-1">
            My Stories & Manuscripts
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Manage your serialized books, monitor AI pipeline breakdown, and publish new chapters.
          </p>
        </div>

        <Link to="/w/books/new">
          <Button variant="primary" size="md" className="flex items-center gap-2 shadow-xs hover:shadow-md">
            <Plus className="w-4 h-4" />
            Publish New Story
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchBooks}
            className="ml-auto text-xs font-bold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-stone-200 p-6 flex gap-6 animate-pulse">
              <Skeleton className="w-24 h-36 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="w-32 h-6 rounded-full" />
                <Skeleton className="w-3/4 h-8 rounded-lg" />
                <Skeleton className="w-full h-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-stone-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF0E8] text-[#FF500A] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-xl font-bold text-stone-900">No Stories Published Yet</h2>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            Upload your first manuscript to begin automatic scene breakdown, character intelligence, and reader pagination.
          </p>
          <div className="pt-2">
            <Link to="/w/books/new">
              <Button variant="primary" size="md">
                Publish Your First Story
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Books List */
        <div className="space-y-4">
          {books.map((book) => {
            const bookId = book.id || book._id;
            const isProcessing = book.status === 'processing';
            const isPublished = book.status === 'published';
            const canPublish = book.pageCount > 0 && !isProcessing;
            const currentAction = actionLoading[bookId];

            return (
              <div
                key={bookId}
                className="bg-white rounded-3xl border border-stone-200 hover:border-stone-300 p-6 transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                {/* Book Info */}
                <div className="flex items-start gap-5 w-full md:w-auto">
                  <div className="w-20 sm:w-24 h-30 sm:h-36 shrink-0 rounded-xl overflow-hidden shadow-xs border border-stone-100">
                    <CoverImage
                      url={book.coverUrl}
                      title={book.title}
                      accent={book.accent}
                      size="sm"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {getStatusBadge(book)}
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {book.genre || 'General'}
                      </span>
                      {book.mature && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                          18+
                        </span>
                      )}
                    </div>

                    <h2 className="font-heading text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                      {book.title}
                    </h2>

                    <p className="text-xs text-stone-500 line-clamp-2 max-w-xl">
                      {book.blurb || 'No synopsis provided.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                      <span>📄 {book.pageCount || 0} Pages</span>
                      <span>👁 {(book.stats?.reads || 0).toLocaleString()} Reads</span>
                      <span>★ {(book.stats?.ratingAvg || 0).toFixed(1)} Rating</span>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-stone-100">
                  {/* Reader Preview */}
                  <Link to={`/read/${bookId}`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5" title="Read in Reader">
                      <Eye className="w-3.5 h-3.5" />
                      Read
                    </Button>
                  </Link>

                  {/* Edit Presentation & Metadata */}
                  <Link to={`/w/books/${bookId}/edit`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5" title="Edit presentation and details">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </Link>

                  {/* Insights */}
                  <Link to={`/w/books/${bookId}/insights`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-[#FF500A]" title="Narrative Insights">
                      <Sparkles className="w-3.5 h-3.5" />
                      Insights
                    </Button>
                  </Link>

                  {/* Publish / Unpublish */}
                  {isPublished ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUnpublish(bookId)}
                      disabled={currentAction === 'unpublishing'}
                      className="text-stone-700"
                    >
                      {currentAction === 'unpublishing' ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                  ) : (
                    <div className="relative group">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublish(bookId)}
                        disabled={!canPublish || currentAction === 'publishing'}
                        className="shadow-xs"
                      >
                        {currentAction === 'publishing' ? 'Publishing...' : 'Publish'}
                      </Button>
                      {!canPublish && (
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-stone-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-xl whitespace-nowrap shadow-lg z-20">
                          {isProcessing
                            ? 'Manuscript parsing must complete first'
                            : 'Story must have at least 1 page to publish'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(book)}
                    className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    aria-label="Delete Story"
                    title="Delete Story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-xl border border-stone-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-stone-900">
                Delete "{deleteTarget.title}"?
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                This action cannot be undone. All parsed manuscript pages, scene markers, and reader records for this story will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading[deleteTarget._id] === 'deleting'}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDelete}
                disabled={actionLoading[deleteTarget._id] === 'deleting'}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading[deleteTarget._id] === 'deleting' ? 'Deleting...' : 'Delete Story'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
