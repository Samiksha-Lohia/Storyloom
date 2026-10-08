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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper text-success border border-success">
            <span className="w-2 h-2 rounded bg-success" />
            Published
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper text-muted border border-rule">
            <RefreshCw className="w-3 h-3 text-muted" />
            Processing
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper text-muted border border-rule">
            <Clock className="w-3 h-3 text-muted" />
            Draft
          </span>
        );
      case 'unpublished':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper text-danger border border-danger">
            <span className="w-2 h-2 rounded bg-danger" />
            Unpublished
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper border border-rule text-muted">
            {book.status}
          </span>
        );
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-rule text-muted">
            Writer Studio
          </span>
          <h1 className="text-3xl sm:text-4xl font-normal text-ink mt-1">
            My Stories & Manuscripts
          </h1>
          <p className="text-muted text-xs mt-1">
            Manage your serialized books, monitor AI pipeline breakdown, and publish new chapters.
          </p>
        </div>

        <Link to="/w/books/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Publish New Story
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded bg-paper border border-rule text-danger text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchBooks}
            className="ml-auto text-xs font-bold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
          Loading…
        </div>
      ) : books.length === 0 ? (
        <div className="bg-paper rounded border border-rule p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded border border-rule text-accent flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-ink">No Stories Published Yet</h2>
          <p className="text-muted text-xs max-w-md mx-auto">
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
                className="bg-paper rounded border border-rule p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-5 w-full md:w-auto">
                  <div className="w-20 sm:w-24 aspect-[2/3] shrink-0 rounded overflow-hidden border border-rule">
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
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        {book.genre || 'General'}
                      </span>
                      {book.mature && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-rule text-muted">
                          18+
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-ink leading-snug">
                      {book.title}
                    </h2>

                    <p className="text-xs text-muted line-clamp-2 max-w-xl">
                      {book.blurb || 'No synopsis provided.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                      <span>📄 {book.pageCount || 0} Pages</span>
                      <span>👁 {(book.stats?.reads || 0).toLocaleString()} Reads</span>
                      <span>★ {(book.stats?.ratingAvg || 0).toFixed(1)} Rating</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-rule">
                  <Link to={`/read/${bookId}`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5" title="Read in Reader">
                      <Eye className="w-3.5 h-3.5" />
                      Read
                    </Button>
                  </Link>

                  <Link to={`/w/books/${bookId}/edit`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5" title="Edit presentation and details">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </Link>

                  {isPublished ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUnpublish(bookId)}
                      disabled={currentAction === 'unpublishing'}
                      className="text-ink"
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
                      >
                        {currentAction === 'publishing' ? 'Publishing...' : 'Publish'}
                      </Button>
                      {!canPublish && (
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-paper border border-rule text-ink text-[11px] font-bold py-1.5 px-3 rounded whitespace-nowrap z-20">
                          {isProcessing
                            ? 'Manuscript parsing must complete first'
                            : 'Story must have at least 1 page to publish'}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(book)}
                    className="p-2 rounded text-muted hover:text-danger hover:border-danger border border-transparent hover:border-rule cursor-pointer"
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-paper rounded max-w-md w-full p-6 sm:p-8 space-y-4 border border-rule">
            <div className="w-10 h-10 rounded border border-rule text-danger flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                Delete "{deleteTarget.title}"?
              </h3>
              <p className="text-muted text-xs mt-1.5 leading-relaxed">
                This action cannot be undone. All parsed manuscript pages, scene markers, and reader records for this story will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading[deleteTarget._id] === 'deleting'}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading[deleteTarget._id] === 'deleting'}
                className="bg-danger hover:opacity-90 text-paper rounded text-xs font-bold px-4 py-2 cursor-pointer"
              >
                {actionLoading[deleteTarget._id] === 'deleting' ? 'Deleting...' : 'Delete Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBooksPage;
