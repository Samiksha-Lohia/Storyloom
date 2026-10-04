import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  CheckCircle,
  Clock,
  MoreVertical,
  Trash2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BookMarked,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CoverImage } from '../../components/common/CoverImage';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';

const TABS = [
  { id: 'reading', label: 'Currently Reading', status: 'reading', icon: BookOpen },
  { id: 'want_to_read', label: 'Want to Read', status: 'want_to_read', icon: Bookmark },
  { id: 'finished', label: 'Finished', status: 'finished', icon: CheckCircle },
];

export function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reading');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Redirect to login if guest
  useEffect(() => {
    if (!user && !localStorage.getItem('scenecraft_access_token')) {
      navigate('/login?redirect=/library');
    }
  }, [user, navigate]);

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.me.getLibrary({ status: activeTab, limit: 50 });
      setItems(data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load your library.');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Handle status update
  const handleStatusChange = async (bookId, nextStatus) => {
    try {
      setActionLoadingId(bookId);
      await api.me.updateLibraryBook(bookId, { status: nextStatus });
      setMenuOpenId(null);
      await loadLibrary();
    } catch (err) {
      alert(`Could not update reading status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle remove from library
  const handleRemove = async (bookId, title) => {
    if (!window.confirm(`Remove "${title || 'this book'}" from your library?`)) {
      return;
    }
    try {
      setActionLoadingId(bookId);
      await api.me.removeLibraryBook(bookId);
      setMenuOpenId(null);
      setItems((prev) => prev.filter((item) => (item.book?.id || item.bookId) !== bookId));
    } catch (err) {
      alert(`Failed to remove book: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Page Title & Heading */}
      <div className="border-b border-stone-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF500A] mb-1">
              <BookMarked className="w-4 h-4" />
              <span>Personal Shelf</span>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl text-stone-900 tracking-tight">
              My Library
            </h1>
            <p className="text-sm text-stone-500 mt-1">
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
                className={`flex items-center gap-2 pb-3 font-heading font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#FF500A] text-[#FF500A]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Library Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-4 animate-pulse"
            >
              <div className="w-24 h-36 bg-stone-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-4 bg-stone-200 rounded-md w-3/4" />
                <div className="h-3 bg-stone-100 rounded-md w-1/2" />
                <div className="h-2 bg-stone-100 rounded-md w-full mt-4" />
                <div className="h-8 bg-stone-200 rounded-xl w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12">
          {activeTab === 'reading' && (
            <EmptyState
              title="No stories currently in progress"
              description="Pick up where you left off or dive into a brand new narrative from our curated catalogue."
              icon={<BookOpen className="w-10 h-10 text-stone-400" />}
              actionLabel="Browse Stories"
              onAction={() => navigate('/browse')}
            />
          )}
          {activeTab === 'want_to_read' && (
            <EmptyState
              title="Your reading wishlist is empty"
              description="Save compelling stories to your personal library so you never forget what to read next."
              icon={<Bookmark className="w-10 h-10 text-stone-400" />}
              actionLabel="Discover Next Read"
              onAction={() => navigate('/browse')}
            />
          )}
          {activeTab === 'finished' && (
            <EmptyState
              title="No finished stories yet"
              description="When you complete the final chapter of a story, it will appear here as a reading accomplishment."
              icon={<CheckCircle className="w-10 h-10 text-stone-400" />}
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
            const furthestPage = Math.max(1, item.furthestPage || currentPage);
            const progressPercent = Math.min(100, Math.round((currentPage / pageCount) * 100));

            return (
              <div
                key={item.id || bookId}
                className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex gap-4">
                    {/* Cover image (2:3 Aspect ratio) */}
                    <div className="w-24 sm:w-28 shrink-0">
                      <Link to={`/book/${bookId}`}>
                        <div className="rounded-xl overflow-hidden shadow-xs border border-stone-200 aspect-2/3">
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
                          <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-2 hover:text-[#FF500A] transition leading-snug">
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
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                            aria-label="Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {menuOpenId === bookId && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-20 text-xs font-semibold animate-fade-in">
                              <span className="block px-3 py-1 text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                                Move status:
                              </span>
                              {activeTab !== 'reading' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'reading')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-stone-50 text-stone-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-[#FF500A]" />
                                  <span>Currently Reading</span>
                                </button>
                              )}
                              {activeTab !== 'want_to_read' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'want_to_read')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-stone-50 text-stone-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Want to Read</span>
                                </button>
                              )}
                              {activeTab !== 'finished' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(bookId, 'finished')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-stone-50 text-stone-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Mark Finished</span>
                                </button>
                              )}
                              <div className="border-t border-stone-100 my-1" />
                              <button
                                type="button"
                                onClick={() => handleRemove(bookId, book.title)}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove from Shelf</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-stone-500 block truncate mt-0.5">
                        {book.writer?.name || 'SceneCraft Author'}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {book.genre || 'General'}
                        </span>
                        {book.mature && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
                            18+
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Reading Stats */}
                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-stone-700">
                        {activeTab === 'finished'
                          ? 'Story Completed'
                          : `Page ${currentPage} of ${pageCount}`}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#FF500A]">
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF500A] to-amber-500 rounded-full transition-all duration-300"
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
