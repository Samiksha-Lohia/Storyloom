import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StarWishlistButton from '../../components/common/StarWishlistButton';
import { BookRow } from '../../components/common/BookRow';
import { CoverImage } from '../../components/common/CoverImage';
import { 
  Search, 
  Star, 
  BookOpen, 
  CheckCircle, 
  Sparkles,
  Layers
} from 'lucide-react';

const GENRES = [
  'All',
  'Fantasy',
  'Sci-Fi',
  'Romance',
  'Mystery',
  'Thriller',
  'Horror',
  'Literary',
  'Historical',
  'Non-Fiction',
];

const RATING_FILTERS = [
  { label: 'Any Rating', value: '' },
  { label: '★ 3.5+', value: '3.5' },
  { label: '★ 4.0+', value: '4.0' },
  { label: '★ 4.5+', value: '4.5' },
];

const COMPLETION_FILTERS = [
  { label: 'Any Completion', value: '' },
  { label: '50%+ Read', value: '50' },
  { label: '70%+ Read', value: '70' },
  { label: '80%+ Read', value: '80' },
];

const LENGTH_FILTERS = [
  { label: 'Any Length', value: '' },
  { label: 'Short (<150p)', value: 'short' },
  { label: 'Medium (150-350p)', value: 'medium' },
  { label: 'Long (350p+)', value: 'long' },
];

export function PublisherDiscoverPage() {
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [minRating, setMinRating] = useState('');
  const [completionMin, setCompletionMin] = useState('');
  const [lengthBucket, setLengthBucket] = useState('');
  const [onlyWishlisted, setOnlyWishlisted] = useState(false);
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    let isMounted = true;
    async function loadShelves() {
      try {
        const trendingRes = await api.books.list({ sort: 'trending', limit: 10 });
        if (isMounted && trendingRes?.data) {
          setTrendingBooks(trendingRes.data);
        }
        try {
          const libraryRes = await api.me.getLibrary({ status: 'unfinished', limit: 10 });
          if (isMounted && libraryRes?.items) {
            setContinueReading(libraryRes.items);
          }
        } catch {
        }
      } catch (err) {
        console.error('Failed to load discovery shelves:', err);
      }
    }
    loadShelves();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadBooks();
  }, [page, selectedGenre, minRating, completionMin, lengthBucket, onlyWishlisted, sort]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        sort,
      };

      if (selectedGenre !== 'All') params.genre = selectedGenre;
      if (search.trim()) params.search = search.trim();
      if (minRating) params.minRating = minRating;
      if (completionMin) params.completionMin = completionMin;
      if (lengthBucket) params.lengthBucket = lengthBucket;
      if (onlyWishlisted) params.wishlisted = true;

      const res = await api.books.list(params);
      const results = res.data || [];
      setBooks(results);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load catalogue for publisher:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadBooks();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted">
              Publisher Talent Scouting
            </span>
          </div>
          <h1 className="text-3xl font-normal text-ink mt-2">
            Manuscript Discovery
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Evaluate high-performing stories with deep audience traction, AI story metrics, and pitch decks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setOnlyWishlisted(!onlyWishlisted);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold border cursor-pointer ${
              onlyWishlisted
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper border-rule text-ink hover:border-ink'
            }`}
          >
            <Star className={`w-4 h-4 ${onlyWishlisted ? 'fill-paper text-paper' : 'text-accent'}`} />
            <span>Wishlisted Only</span>
          </button>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-paper border border-rule rounded text-xs font-bold text-ink focus:outline-hidden"
          >
            <option value="rating">Top Rated</option>
            <option value="reads">Most Reads</option>
            <option value="newest">Newest Releases</option>
          </select>
        </div>
      </div>

      {continueReading.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold text-ink">Continue Reading</h2>
            </div>
            <span className="text-xs text-muted">
              {continueReading.length} unfinished {continueReading.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueReading.map((item) => {
              const book = item.book || item.bookId;
              if (!book) return null;
              const bookId = book._id || book.id;
              const totalPages = book.pageCount || item.totalPages || 1;
              const furthestPage = item.furthestPage || item.currentPage || 1;
              const pct = item.progressPercent !== undefined
                ? item.progressPercent
                : Math.min(100, Math.round((furthestPage / totalPages) * 100));

              return (
                <div
                  key={item._id || item.id || bookId}
                  className="p-3 bg-paper border border-rule rounded flex gap-3 items-center group hover:border-ink transition-colors"
                >
                  <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-surface border border-rule">
                    <CoverImage
                      url={book.coverUrl}
                      publicId={book.coverPublicId}
                      title={book.title}
                      aspectRatio="aspect-[2/3]"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-bold text-ink text-xs line-clamp-1 group-hover:text-accent transition-colors">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-muted line-clamp-1">
                      Page {furthestPage} of {totalPages}
                    </p>
                    <div className="w-full bg-rule/30 border border-rule rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Link
                      to={`/read/${bookId}?page=${furthestPage}`}
                      className="inline-block pt-1 text-[11px] font-bold text-accent hover:underline"
                    >
                      Continue ({pct}%) →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {trendingBooks.length > 0 && (
        <BookRow
          title="Trending Now"
          subtitle="Stories with active reader engagement and publisher traction"
          books={trendingBooks}
          mode="row"
          showRank
        />
      )}

      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <h2 className="text-xl font-bold text-ink">Catalogue</h2>
        </div>

      <div className="bg-paper border border-rule rounded p-4 md:p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by title, synopsis, author name, or key themes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-paper border border-rule rounded text-xs text-ink placeholder-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-accent text-paper rounded text-xs font-bold hover:bg-accent-hover cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="space-y-3 pt-2 border-t border-rule text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-muted font-bold shrink-0">Genre:</span>
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setSelectedGenre(g);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded shrink-0 font-bold cursor-pointer ${
                  selectedGenre === g
                    ? 'bg-ink text-paper border border-ink'
                    : 'bg-paper text-muted border border-rule hover:border-ink hover:text-ink'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-paper border border-rule rounded px-2.5 py-1">
              <Star className="w-3.5 h-3.5 text-accent" />
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-ink focus:outline-hidden cursor-pointer"
              >
                {RATING_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-paper border border-rule rounded px-2.5 py-1">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <select
                value={completionMin}
                onChange={(e) => {
                  setCompletionMin(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-ink focus:outline-hidden cursor-pointer"
              >
                {COMPLETION_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-paper border border-rule rounded px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-muted" />
              <select
                value={lengthBucket}
                onChange={(e) => {
                  setLengthBucket(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-ink focus:outline-hidden cursor-pointer"
              >
                {LENGTH_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {(minRating || completionMin || lengthBucket || onlyWishlisted || selectedGenre !== 'All') && (
              <button
                onClick={() => {
                  setMinRating('');
                  setCompletionMin('');
                  setLengthBucket('');
                  setOnlyWishlisted(false);
                  setSelectedGenre('All');
                  setPage(1);
                }}
                className="text-xs text-muted hover:text-ink underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
          Loading…
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-paper border border-rule rounded p-8">
          <BookOpen className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-bold text-ink text-base">No manuscripts found</h3>
          <p className="text-xs text-muted max-w-md mx-auto mt-1">
            Try adjusting your search criteria or resetting filters to scout other published stories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => {
            const author = book.writerId;
            const bookId = book.id || book._id;
            return (
              <div
                key={bookId}
                className="bg-paper border border-rule rounded overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[2/3] bg-paper overflow-hidden border-b border-rule">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-paper text-muted">
                        <BookOpen className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold">{book.title}</span>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 z-10">
                      <StarWishlistButton
                        bookId={bookId}
                        initialWishlisted={book.isWishlisted}
                        inTalks={book.inTalks}
                      />
                    </div>

                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-ink text-paper">
                        {book.genre || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-ink text-sm line-clamp-1">
                      {book.title}
                    </h3>

                    {author && (
                      <div className="text-xs text-muted">
                        by{' '}
                        <Link
                          to={`/writer/${author.username || author._id}`}
                          className="font-bold text-ink hover:text-accent"
                        >
                          {author.name || author.username}
                        </Link>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-rule text-center text-[11px]">
                      <div className="p-1.5 bg-paper border border-rule rounded">
                        <span className="block text-muted text-[9px] uppercase font-bold">Rating</span>
                        <span className="font-bold text-ink">
                          ★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="p-1.5 bg-paper border border-rule rounded">
                        <span className="block text-muted text-[9px] uppercase font-bold">Reads</span>
                        <span className="font-bold text-ink">
                          {book.stats?.reads || 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-paper border border-rule rounded">
                        <span className="block text-muted text-[9px] uppercase font-bold">Completion</span>
                        <span className="font-bold text-ink">
                          {book.stats?.completionRate || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    to={`/p/book/${bookId}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Review Pitch Deck
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-rule rounded text-xs font-bold bg-paper text-ink hover:border-ink disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 border border-rule rounded text-xs font-bold bg-paper text-ink hover:border-ink disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
      </section>
    </div>
  );
}

export default PublisherDiscoverPage;
