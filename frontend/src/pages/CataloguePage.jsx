import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { BookCard } from '../components/common/BookCard';
import { BookCardSkeleton } from '../components/common/Skeleton';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { GENRES } from '../constants/app';

const SORT_OPTIONS = [
  { value: '-stats.readCount', label: 'Most Popular' },
  { value: '-stats.rating', label: 'Highest Rated' },
  { value: '-createdAt', label: 'Newest Arrivals' },
  { value: 'title', label: 'Title (A-Z)' },
];

export function CataloguePage() {
  const { genre: routeGenre } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [selectedGenre, setSelectedGenre] = useState(routeGenre || 'All');
  const [sortBy, setSortBy] = useState('-stats.readCount');
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 18, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync route param with genre state
  useEffect(() => {
    if (routeGenre) {
      setSelectedGenre(routeGenre);
    } else {
      setSelectedGenre('All');
    }
  }, [routeGenre]);

  // Sync search param
  useEffect(() => {
    setSearchTerm(queryParam);
  }, [queryParam]);

  // Fetch books
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      try {
        setLoading(true);
        const params = {
          page: 1,
          limit: 18,
          sort: sortBy,
        };
        if (selectedGenre && selectedGenre !== 'All') {
          params.genre = selectedGenre;
        }
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        const res = await api.books.list(params);
        if (isMounted && res?.data) {
          setBooks(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        console.error('Failed to fetch books in catalogue:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBooks();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre, sortBy, searchTerm]);

  // Load more pagination
  const handleLoadMore = async () => {
    if (pagination.page >= pagination.pages || loadingMore) return;
    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      const params = {
        page: nextPage,
        limit: 18,
        sort: sortBy,
      };
      if (selectedGenre && selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await api.books.list(params);
      if (res?.data) {
        setBooks((prev) => [...prev, ...res.data]);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load more books:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <nav className="text-xs text-stone-500 mb-2 flex items-center gap-1.5" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-stone-900">Home</Link>
              <span>/</span>
              <span className="font-semibold text-stone-800">
                {searchTerm ? 'Search Results' : selectedGenre === 'All' ? 'Catalogue' : selectedGenre}
              </span>
            </nav>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              {searchTerm
                ? `Results for "${searchTerm}"`
                : selectedGenre === 'All'
                ? 'Explore All Stories'
                : `${selectedGenre} Stories`}
            </h1>
            <p className="text-stone-600 text-sm mt-1">
              {pagination.total > 0
                ? `Showing ${books.length} of ${pagination.total} published works`
                : 'Discover serialized fiction across all genres'}
            </p>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="catalogue-sort" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Sort by:
            </label>
            <select
              id="catalogue-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF500A] focus:border-transparent transition"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Genre Pill Filter row */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedGenre('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedGenre === 'All'
                ? 'bg-[#FF500A] text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Genres
          </button>
          {GENRES.map((g) => {
            const active = selectedGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FF500A] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Book Grid: 6 columns desktop, 4 tablet, 3 mobile */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="No stories found"
          description={
            searchTerm
              ? `No stories matched your search "${searchTerm}". Try another title, author, or keyword.`
              : `There are currently no published stories in the ${selectedGenre} category.`
          }
          actionLabel="View All Stories"
          onAction={() => {
            setSelectedGenre('All');
            setSearchTerm('');
            setSearchParams({});
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {books.map((book) => (
              <BookCard key={book.id || book._id} book={book} />
            ))}
          </div>

          {/* Load More Button */}
          {pagination.page < pagination.pages && (
            <div className="pt-8 text-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="min-w-44"
              >
                {loadingMore ? 'Loading stories...' : 'Load More Stories'}
              </Button>
              <p className="text-xs text-stone-400 mt-2">
                Showing {books.length} of {pagination.total} stories
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
