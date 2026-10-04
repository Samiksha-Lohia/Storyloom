import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StarWishlistButton from '../../components/common/StarWishlistButton';
import { Star, BookOpen, Sparkles, Trash2, ArrowRight } from 'lucide-react';

export function PublisherWishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadWishlist();
  }, [page]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const res = await api.wishlist.list({ page, limit: 12 });
      setItems(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load publisher wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId) => {
    try {
      await api.wishlist.remove(bookId);
      setItems((prev) => prev.filter((item) => (item.bookId?._id || item.bookId) !== bookId));
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            Confidential Wishlist
          </span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
          Acquisitions Wishlist
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Your private book pipeline. Writers and competitors never see your identity; authors only see aggregate interest counts.
        </p>
      </div>

      {/* Grid of Wishlisted Books */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-2xl h-80"></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-serif font-bold text-slate-800 text-lg">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Browse our curated manuscript discovery catalogue and star prospective books to track them here.
          </p>
          <Link
            to="/p/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF500A] text-white rounded-xl text-xs font-bold hover:bg-[#e04505] transition-all"
          >
            Discover Manuscripts
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const book = item.bookId || {};
            const author = book.writerId;
            const bookId = book.id || book._id || (typeof item.bookId === 'string' ? item.bookId : item.bookId?._id || item.bookId?.id);

            return (
              <div
                key={item._id}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cover */}
                  <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-200 text-slate-400 font-serif">
                        <BookOpen className="w-8 h-8 mb-2" />
                        <span className="text-xs font-semibold">{book.title}</span>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(bookId)}
                      title="Remove from wishlist"
                      className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Genre */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs">
                        {book.genre || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-serif font-bold text-slate-900 text-base line-clamp-1 group-hover:text-[#FF500A] transition-colors">
                      {book.title}
                    </h3>

                    {author && (
                      <div className="text-xs text-slate-500">
                        by{' '}
                        <Link
                          to={`/writer/${author.username || author._id}`}
                          className="font-semibold text-slate-700 hover:text-[#FF500A] transition-colors"
                        >
                          {author.name || author.username}
                        </Link>
                      </div>
                    )}

                    {/* Traction quick chips */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}</span>
                      <span>{book.stats?.reads || 0} reads</span>
                      <span>{book.stats?.completionRate || 0}% comp</span>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 pt-0 space-y-2">
                  <Link
                    to={`/p/book/${bookId}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-[#FF500A] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Open Pitch Deck
                  </Link>
                  <Link
                    to={`/read/${bookId}`}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Read Manuscript
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default PublisherWishlistPage;
