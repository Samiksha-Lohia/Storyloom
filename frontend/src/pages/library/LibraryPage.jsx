import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  CheckCircle,
  MoreVertical,
  Trash2,
  ArrowRight,
  BookMarked,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { CoverImage } from '../../components/common/CoverImage';
import { EmptyState } from '../../components/common/EmptyState';
import { APP_NAME } from '../../constants/app';

const TABS = [
  { id: 'reading', label: 'Currently Reading', icon: BookOpen },
  { id: 'want_to_read', label: 'Want to Read', icon: Bookmark },
  { id: 'finished', label: 'Completed', icon: CheckCircle },
];

export function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reading');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    fetchShelf();
  }, [activeTab]);

  const fetchShelf = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.library.getShelf(activeTab);
      setItems(res?.data?.items || res?.items || []);
    } catch (err) {
      console.error('Failed to load library items:', err);
      setError('Could not load your library. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookId, newStatus) => {
    setActionLoadingId(bookId);
    setMenuOpenId(null);
    try {
      await api.library.updateStatus(bookId, newStatus);
      setItems((prev) => prev.filter((item) => (item.book?._id || item.bookId) !== bookId));
    } catch (err) {
      alert(err.message || 'Failed to update reading status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (bookId, bookTitle) => {
    if (!window.confirm(`Remove "${bookTitle}" from your shelf?`)) return;
    setActionLoadingId(bookId);
    setMenuOpenId(null);
    try {
      await api.library.remove(bookId);
      setItems((prev) => prev.filter((item) => (item.book?._id || item.bookId) !== bookId));
    } catch (err) {
      alert(err.message || 'Failed to remove from library.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Page Title & Heading */}
      <div className="border-b border-rule pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-calligraphy text-3xl sm:text-4xl font-normal text-ink">
              My Library
            </h1>
            <p className="text-xs text-muted mt-1">
              Track your serialized reading progression, bookmarked chapters, and saved manuscripts.
            </p>
          </div>

          <Link to="/browse">
            <Button variant="outline" size="sm" className="gap-2">
              <span>Explore Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-3 sm:gap-6 mt-8 overflow-x-auto no-scrollbar" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMenuOpenId(null);
                }}
                className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-paper border border-danger rounded text-xs text-danger">
          {error}
        </div>
      )}

      {/* Library Grid / List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="py-12">
          {activeTab === 'reading' && (
            <EmptyState
              title="No stories currently in progress"
              description="Pick up where you left off or dive into a brand new narrative from our curated catalogue."
              icon={<BookOpen className="w-8 h-8 text-muted" />}
              actionLabel="Browse Stories"
              onAction={() => navigate('/browse')}
            />
          )}
          {activeTab === 'want_to_read' && (
            <EmptyState
              title="Your reading wishlist is empty"
              description="Save compelling stories to your personal library so you never forget what to read next."
              icon={<Bookmark className="w-8 h-8 text-muted" />}
              actionLabel="Discover Next Read"
              onAction={() => navigate('/browse')}
            />
          )}
          {activeTab === 'finished' && (
            <EmptyState
              title="No finished stories yet"
              description="When you complete the final chapter of a story, it will appear here as a reading accomplishment."
              icon={<CheckCircle className="w-8 h-8 text-muted" />}
              actionLabel="Explore Popular Books"
              onAction={() => navigate('/browse')}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const book = item.book;
            if (!book) return null;
            const bookId = book.id || book._id || item.bookId;
            const pageCount = book.pageCount || 1;
            const currentPage = Math.max(1, item.currentPage || 1);
            const progressPercent = Math.min(100, Math.round((currentPage / pageCount) * 100));

            return (
              <div
                key={item.id || bookId}
                className="bg-paper border border-rule rounded p-4 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex gap-4">
                    {/* Cover image (2:3 Aspect ratio) */}
                    <div className="w-24 sm:w-28 shrink-0">
                      <Link to={`/book/${bookId}`}>
                        <div className="rounded overflow-hidden border border-rule aspect-2/3">
                          <CoverImage
                            publicId={book.coverPublicId}
                            title={book.title}
                            genre={book.genre}
                            preset="small"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                    </div>

                    {/* Book Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <Link to={`/book/${bookId}`}>
                          <h3 className="font-bold text-sm text-ink line-clamp-2 hover:text-accent leading-snug">
                            {book.title}
                          </h3>
                        </Link>

                        {/* Dropdown Menu Toggle */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenId(menuOpenId === bookId ? null : bookId)
                            }
                            className="p-1 text-muted hover:text-ink border border-transparent hover:border-rule rounded cursor-pointer"
                            aria-label="Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {menuOpenId === bookId && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-paper border border-rule rounded py-1.5 z-20 text-xs font-semibold">
                              <span className="block px-3 py-1 text-[10px] text-muted uppercase tracking-wider font-bold">
                                Move status:
                              </span>
                              {activeTab !== 'reading' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'reading')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rule/10 text-ink flex items-center gap-2 cursor-pointer"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-ink" />
                                  <span>Currently Reading</span>
                                </button>
                              )}
                              {activeTab !== 'want_to_read' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'want_to_read')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rule/10 text-ink flex items-center gap-2 cursor-pointer"
                                >
                                  <Bookmark className="w-3.5 h-3.5 text-ink" />
                                  <span>Want to Read</span>
                                </button>
                              )}
                              {activeTab !== 'finished' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'finished')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rule/10 text-ink flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                                  <span>Mark Finished</span>
                                </button>
                              )}
                              <div className="border-t border-rule my-1" />
                              <button
                                type="button"
                                onClick={() => handleRemove(bookId, book.title)}
                                className="w-full text-left px-3 py-1.5 hover:bg-rule/10 text-danger flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove from Shelf</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-muted block truncate mt-0.5">
                        {book.writer?.name || `${APP_NAME} Author`}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-rule text-muted">
                          {book.genre || 'General'}
                        </span>
                        {book.mature && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-rule text-ink">
                            18+
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Reading Stats */}
                  <div className="mt-4 pt-3 border-t border-rule space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="font-semibold text-ink">
                        {activeTab === 'finished'
                          ? 'Story Completed'
                          : `Page ${currentPage} of ${pageCount}`}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-ink">
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-1.5 bg-rule/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-ink rounded"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="mt-4 pt-2">
                  <Link to={`/read/${bookId}?page=${currentPage}`}>
                    <Button
                      variant={activeTab === 'finished' ? 'outline' : 'primary'}
                      size="sm"
                      className="w-full justify-center"
                      disabled={actionLoadingId === bookId}
                    >
                      {activeTab === 'finished' ? (
                        'Read Again'
                      ) : activeTab === 'want_to_read' ? (
                        'Start Reading'
                      ) : (
                        `Continue (Page ${currentPage})`
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LibraryPage;
