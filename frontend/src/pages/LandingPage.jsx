import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { BookCard } from '../components/common/BookCard';
import { BookRow } from '../components/common/BookRow';
import { Carousel } from '../components/common/Carousel';
import { BookCardSkeleton } from '../components/common/Skeleton';
import { CoverImage } from '../components/common/CoverImage';
import { GENRES, APP_NAME } from '../constants/app';
import { BookOpen, Search, RefreshCw } from 'lucide-react';

export function LandingPage() {
  const { user } = useAuth();

  const [trendingBooks, setTrendingBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [catalogueBooks, setCatalogueBooks] = useState([]);
  const [catalogueTotalPages, setCatalogueTotalPages] = useState(1);
  const [cataloguePage, setCataloguePage] = useState(1);
  const [catalogueGenre, setCatalogueGenre] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      try {
        setLoading(true);
        const trendingRes = await api.books.list({ sort: 'trending', limit: 10 });
        if (isMounted && trendingRes?.data) {
          setTrendingBooks(trendingRes.data);
        }

        if (user) {
          try {
            const libraryRes = await api.me.getLibrary({ status: 'unfinished', limit: 10 });
            if (isMounted && libraryRes?.items) {
              setContinueReading(libraryRes.items);
            }
          } catch (libErr) {
            console.warn('Continue reading shelf fetch skipped:', libErr);
          }
        }
      } catch (err) {
        console.error('Failed to load books for home:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const fetchCatalogue = useCallback(async (page = 1, append = false, genre = '', search = '') => {
    try {
      setLoadingCatalogue(true);
      const params = { page, limit: 12, sort: 'trending' };
      if (genre) params.genre = genre;
      if (search) params.search = search;

      const res = await api.books.list(params);
      if (res?.data) {
        if (append) {
          setCatalogueBooks((prev) => [...prev, ...res.data]);
        } else {
          setCatalogueBooks(res.data);
        }
        setCatalogueTotalPages(res.pagination?.totalPages || 1);
        setCataloguePage(page);
      }
    } catch (err) {
      console.error('Failed to load catalogue:', err);
    } finally {
      setLoadingCatalogue(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCatalogue(1, false, catalogueGenre, catalogueSearch);
    }
  }, [user, catalogueGenre, catalogueSearch, fetchCatalogue]);

  const handleLoadMore = () => {
    if (cataloguePage < catalogueTotalPages && !loadingCatalogue) {
      fetchCatalogue(cataloguePage + 1, true, catalogueGenre, catalogueSearch);
    }
  };

  if (user) {
    return (
      <LoggedInHomeFeed
        user={user}
        trending={trendingBooks}
        continueReading={continueReading}
        catalogue={catalogueBooks}
        cataloguePage={cataloguePage}
        catalogueTotalPages={catalogueTotalPages}
        catalogueGenre={catalogueGenre}
        setCatalogueGenre={setCatalogueGenre}
        catalogueSearch={catalogueSearch}
        setCatalogueSearch={setCatalogueSearch}
        onLoadMore={handleLoadMore}
        loading={loading}
        loadingCatalogue={loadingCatalogue}
      />
    );
  }

  return (
    <GuestLandingPage
      trending={trendingBooks}
      loading={loading}
    />
  );
}

function LoggedInHomeFeed({
  user,
  trending,
  continueReading,
  catalogue,
  cataloguePage,
  catalogueTotalPages,
  catalogueGenre,
  setCatalogueGenre,
  catalogueSearch,
  setCatalogueSearch,
  onLoadMore,
  loading,
  loadingCatalogue,
}) {
  return (
    <div className="space-y-10 pb-16">
      <section className="bg-paper border border-rule rounded p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            {APP_NAME} Feed
          </span>
          <h1 className="font-calligraphy text-3xl sm:text-4xl font-normal text-ink">
            Welcome back, {user.name}
          </h1>
          <p className="text-muted text-sm leading-relaxed font-body">
            Pick up where you left off, explore trending stories, or browse the entire catalogue.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            <h2 className="font-bold text-lg text-ink">
              Continue Reading
            </h2>
            <p className="text-xs text-muted">Unfinished stories from your reading shelf</p>
          </div>
          <Link to="/library" className="text-xs font-bold text-accent hover:underline">
            View My Library
          </Link>
        </div>

        {continueReading && continueReading.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueReading.map((item) => {
              const book = item.book || {};
              const bookId = book.id || book._id || item.bookId;
              const currentPage = item.currentPage || 1;
              const totalPages = item.totalPages || book.pageCount || 1;
              const progressPercent = item.progressPercent !== undefined
                ? item.progressPercent
                : Math.min(100, Math.round((currentPage / totalPages) * 100));

              return (
                <div
                  key={item.id || bookId}
                  className="bg-paper border border-rule rounded p-4 flex gap-4 items-center"
                >
                  <div className="w-16 h-24 shrink-0 rounded border border-rule overflow-hidden bg-paper">
                    <CoverImage
                      publicId={book.coverPublicId}
                      url={book.coverUrl}
                      title={book.title}
                      preset="thumb"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-rule px-2 py-0.5 rounded inline-block mb-1">
                      {book.genre || 'Story'}
                    </span>
                    <h3 className="font-bold text-ink text-sm truncate">
                      {book.title || 'Untitled'}
                    </h3>
                    <p className="text-muted text-xs truncate mb-2">
                      by {book.writer?.name || 'Author'}
                    </p>

                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>Page {currentPage} of {totalPages}</span>
                        <span className="font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-rule rounded h-1 overflow-hidden">
                        <div
                          className="bg-accent h-1 rounded"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <Link to={`/read/${bookId}?page=${currentPage}`}>
                      <Button variant="primary" size="sm" className="w-full text-xs py-1.5 h-auto">
                        Continue
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-paper border border-rule rounded p-8 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-5 h-5 text-muted mb-2" />
            <h3 className="font-bold text-ink text-sm">No items yet</h3>
            <p className="text-muted text-xs mt-1 max-w-sm font-body">
              Select any story below to begin reading, and your unfinished progress will appear here.
            </p>
          </div>
        )}
      </section>

      <BookRow
        title="Trending Right Now"
        subtitle="Stories with active reader engagement"
        books={trending}
        loading={loading}
        mode="row"
        showRank
        actions={
          <Link to="/browse" className="text-xs font-bold text-accent hover:underline">
            See all
          </Link>
        }
      />

      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
          <div>
            <h2 className="font-bold text-lg text-ink">
              Catalogue
            </h2>
            <p className="text-xs text-muted">Browse all published stories</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                placeholder="Search catalogue…"
                className="h-8 pl-8 pr-2.5 text-xs bg-paper rounded border border-rule text-ink placeholder:text-muted focus:border-ink focus:outline-none w-40 sm:w-48"
              />
            </div>

            <select
              value={catalogueGenre}
              onChange={(e) => setCatalogueGenre(e.target.value)}
              className="h-8 px-2 text-xs bg-paper rounded border border-rule text-ink focus:border-ink focus:outline-none"
              aria-label="Filter by genre"
            >
              <option value="">All Genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <BookRow
          books={catalogue}
          loading={loadingCatalogue && catalogue.length === 0}
          mode="grid"
          emptyMessage="No stories found matching your filter criteria."
        />

        {cataloguePage < catalogueTotalPages && (
          <div className="pt-4 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingCatalogue}
              className="flex items-center gap-1.5"
            >
              {loadingCatalogue ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Stories ({cataloguePage} of {catalogueTotalPages})</span>
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function GuestLandingPage({ trending, loading }) {
  return (
    <div className="space-y-12 pb-16">
      <section className="pt-6 sm:pt-10 pb-8 border-b border-rule">
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            {APP_NAME}
          </span>

          <h1 className="font-calligraphy text-4xl sm:text-5xl lg:text-6xl font-normal text-ink leading-tight">
            Read stories. Write yours. Get discovered.
          </h1>

          <p className="text-muted text-base sm:text-lg leading-relaxed font-body">
            A platform for serialized reading and publishing with structural manuscript analysis. Read original stories or publish your own work.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/browse">
              <Button variant="primary" size="lg">
                Start Reading
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <BookRow
        title="Trending Stories"
        subtitle="Weekly active stories"
        books={trending}
        loading={loading}
        mode="row"
        showRank
        actions={
          <Link to="/browse" className="text-xs font-bold text-accent hover:underline">
            View Catalogue &rarr;
          </Link>
        }
      />

      <section>
        <div className="mb-4 border-b border-rule pb-2">
          <h2 className="font-bold text-xl text-ink">
            Explore by Genre
          </h2>
          <p className="text-xs text-muted">Discover across our full range of categories</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {GENRES.map((genre) => (
            <Link
              key={genre}
              to={`/browse/${encodeURIComponent(genre.toLowerCase())}`}
              className="p-4 rounded border border-rule hover:border-ink hover:text-accent bg-paper text-ink transition-colors flex items-center justify-between group focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="font-bold text-sm">{genre}</span>
              <span className="text-muted text-xs group-hover:translate-x-0.5 transition-transform">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
