import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { BookCard } from '../components/common/BookCard';
import { Carousel } from '../components/common/Carousel';
import { BookCardSkeleton } from '../components/common/Skeleton';
import { CoverImage } from '../components/common/CoverImage';
import { GENRES, APP_NAME } from '../constants/app';
import { BookOpen } from 'lucide-react';

export function LandingPage() {
  const { user } = useAuth();

  const [trendingBooks, setTrendingBooks] = useState([]);
  const [scifiBooks, setScifiBooks] = useState([]);
  const [fantasyBooks, setFantasyBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      try {
        setLoading(true);
        const trendingRes = await api.books.list({ sort: 'trending', limit: 10 });
        if (isMounted && trendingRes?.data) {
          setTrendingBooks(trendingRes.data);
        }

        const scifiRes = await api.books.list({ genre: 'Science Fiction', limit: 8 });
        if (isMounted && scifiRes?.data) {
          setScifiBooks(scifiRes.data);
        }

        const fantasyRes = await api.books.list({ genre: 'Fantasy', limit: 8 });
        if (isMounted && fantasyRes?.data) {
          setFantasyBooks(fantasyRes.data);
        }

        if (user) {
          try {
            const libraryRes = await api.me.getLibrary({ status: 'reading', limit: 6 });
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

  if (user) {
    return (
      <LoggedInHomeFeed
        user={user}
        trending={trendingBooks}
        scifi={scifiBooks}
        fantasy={fantasyBooks}
        continueReading={continueReading}
        loading={loading}
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

// -------------------------------------------------------------
// LOGGED-IN HOME FEED
// -------------------------------------------------------------
function LoggedInHomeFeed({ user, trending, scifi, fantasy, continueReading, loading }) {
  return (
    <div className="space-y-10 pb-16">
      {/* Welcome Banner */}
      <section className="bg-paper border border-rule rounded p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            {APP_NAME} Reader Feed
          </span>
          <h1 className="font-calligraphy text-3xl sm:text-4xl font-normal text-ink">
            Welcome back, {user.name}
          </h1>
          <p className="text-muted text-sm leading-relaxed font-body">
            Pick up where you left off or browse trending titles.
          </p>
          <div className="pt-2">
            <Link to="/browse">
              <Button variant="primary" size="md">
                Browse Full Catalogue
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Continue Reading Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            <h2 className="font-bold text-lg text-ink">
              Continue Reading
            </h2>
            <p className="text-xs text-muted">Recent reading progress</p>
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
              const totalPages = book.pageCount || 1;
              const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));

              return (
                <div
                  key={item.id || bookId}
                  className="bg-paper border border-rule rounded p-4 flex gap-4 items-center"
                >
                  <div className="w-16 h-24 shrink-0 rounded border border-rule overflow-hidden">
                    <CoverImage
                      publicId={book.coverPublicId}
                      url={book.coverUrl}
                      title={book.title}
                      preset="thumb"
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

                    {/* Progress Bar */}
                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>Page {currentPage} of {totalPages}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-rule rounded h-1 overflow-hidden">
                        <div
                          className="bg-accent h-1 rounded"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <Link to={`/read/${bookId}`}>
                      <Button variant="primary" size="sm" className="w-full text-xs py-1.5 h-auto">
                        Resume Reading
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-paper border border-rule rounded p-8 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-4 h-4 text-muted mb-2" />
            <h3 className="font-bold text-ink text-sm">Your reading shelf is empty</h3>
            <p className="text-muted text-xs mt-1 max-w-sm font-body">
              Select any story below or browse the catalogue to start reading.
            </p>
            <Link to="/browse" className="mt-4">
              <Button variant="secondary" size="sm">
                Discover Stories
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Trending Now */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            <h2 className="font-bold text-lg text-ink">
              Trending Right Now
            </h2>
            <p className="text-xs text-muted">Stories with recent reading activity</p>
          </div>
          <Link to="/browse" className="text-xs font-bold text-accent hover:underline">
            See all
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="w-36 sm:w-44 md:w-48 shrink-0">
                <BookCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <Carousel ariaLabel="Trending books carousel">
            {trending.map((book, idx) => (
              <div key={book.id || book._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                <BookCard book={book} rank={idx + 1} />
              </div>
            ))}
          </Carousel>
        )}
      </section>

      {/* Sci-Fi Carousel */}
      {scifi.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
            <div>
              <h2 className="font-bold text-lg text-ink">
                Science Fiction
              </h2>
            </div>
            <Link to="/browse/Science Fiction" className="text-xs font-bold text-accent hover:underline">
              See more
            </Link>
          </div>
          <Carousel ariaLabel="Sci-Fi books carousel">
            {scifi.map((book) => (
              <div key={book.id || book._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                <BookCard book={book} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {/* Fantasy Carousel */}
      {fantasy.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
            <div>
              <h2 className="font-bold text-lg text-ink">
                Fantasy
              </h2>
            </div>
            <Link to="/browse/Fantasy" className="text-xs font-bold text-accent hover:underline">
              See more
            </Link>
          </div>
          <Carousel ariaLabel="Fantasy books carousel">
            {fantasy.map((book) => (
              <div key={book.id || book._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                <BookCard book={book} />
              </div>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// GUEST LANDING PAGE
// -------------------------------------------------------------
function GuestLandingPage({ trending, loading }) {
  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION */}
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

      {/* 2. TRENDING NOW CAROUSEL */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            <h2 className="font-bold text-xl text-ink">
              Trending Stories
            </h2>
            <p className="text-xs text-muted">Weekly active stories</p>
          </div>
          <Link to="/browse" className="text-xs font-bold text-accent hover:underline">
            View Catalogue &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="w-36 sm:w-48 shrink-0">
                <BookCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <Carousel ariaLabel="Trending stories carousel">
            {trending.map((book, idx) => (
              <div key={book.id || book._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                <BookCard book={book} rank={idx + 1} />
              </div>
            ))}
          </Carousel>
        )}
      </section>

      {/* 3. GENRE TILES: Outline only */}
      <section>
        <div className="mb-4 border-b border-rule pb-2">
          <h2 className="font-bold text-xl text-ink">
            Browse by Genre
          </h2>
          <p className="text-xs text-muted">
            Select a category to view titles.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {GENRES.map((genre) => (
            <Link
              key={genre}
              to={`/browse/${encodeURIComponent(genre)}`}
              className="p-4 rounded border border-rule bg-paper text-ink hover:border-ink flex flex-col justify-between h-24"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Genre</span>
              <h3 className="font-bold text-sm text-ink truncate">
                {genre}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. STORY ANALYSIS OVERVIEW */}
      <section className="bg-paper border border-rule rounded p-6 sm:p-8 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
            Manuscript Analysis
          </span>
          <h2 className="font-bold text-xl text-ink">
            Structured story insights.
          </h2>
        </div>
        <p className="text-muted text-sm leading-relaxed max-w-2xl font-body">
          Explore character relationships, narrative pacing, and scene structures generated from the manuscript.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-ink font-body">
          <div className="border border-rule rounded p-3 bg-paper">
            <span className="font-bold block mb-1">Character Networks</span>
            <span className="text-muted">Track interactions and character co-occurrence across scenes.</span>
          </div>
          <div className="border border-rule rounded p-3 bg-paper">
            <span className="font-bold block mb-1">Pacing Arcs</span>
            <span className="text-muted">Follow conflict and narrative progression across chapters.</span>
          </div>
          <div className="border border-rule rounded p-3 bg-paper">
            <span className="font-bold block mb-1">Reader Discussions</span>
            <span className="text-muted">Discuss story developments and leave feedback for authors.</span>
          </div>
        </div>
      </section>

      {/* 5. ROLE SUMMARY */}
      <section>
        <div className="mb-4 border-b border-rule pb-2">
          <h2 className="font-bold text-xl text-ink">
            Platform Roles
          </h2>
          <p className="text-xs text-muted">Storyloom supports readers, writers, and publishers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-body">
          <div className="bg-paper rounded border border-rule p-5 space-y-2">
            <h3 className="font-bold text-sm text-ink">For Readers</h3>
            <p className="text-muted leading-relaxed">
              Read serialized fiction in a clean interface with customizable typography, bookmarks, and chapter discussions.
            </p>
          </div>

          <div className="bg-paper rounded border border-rule p-5 space-y-2">
            <h3 className="font-bold text-sm text-ink">For Writers</h3>
            <p className="text-muted leading-relaxed">
              Publish serialized manuscripts, monitor reader feedback, and inspect structural story analysis tools.
            </p>
          </div>

          <div className="bg-paper rounded border border-rule p-5 space-y-2">
            <h3 className="font-bold text-sm text-ink">For Publishers</h3>
            <p className="text-muted leading-relaxed">
              Discover active manuscripts, review story engagement, and contact authors directly for acquisition proposals.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
