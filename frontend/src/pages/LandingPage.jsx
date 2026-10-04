import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { BookCard } from '../components/common/BookCard';
import { Carousel } from '../components/common/Carousel';
import { BookCardSkeleton } from '../components/common/Skeleton';
import { CoverImage } from '../components/common/CoverImage';
import { GENRES, GENRE_COLORS } from '../constants/app';
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
        // Fetch trending (sorted by reads)
        const trendingRes = await api.books.list({ sort: 'trending', limit: 10 });
        if (isMounted && trendingRes?.data) {
          setTrendingBooks(trendingRes.data);
        }

        // Fetch Sci-Fi
        const scifiRes = await api.books.list({ genre: 'Science Fiction', limit: 8 });
        if (isMounted && scifiRes?.data) {
          setScifiBooks(scifiRes.data);
        }

        // Fetch Fantasy
        const fantasyRes = await api.books.list({ genre: 'Fantasy', limit: 8 });
        if (isMounted && fantasyRes?.data) {
          setFantasyBooks(fantasyRes.data);
        }

        // Fetch user reading list if logged in
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
    <div className="space-y-12 pb-16">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#FF500A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-white/90 backdrop-blur-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-[#FF500A]" />
            SceneCraft Reader Feed
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-stone-300 text-sm sm:text-base mt-2 leading-relaxed">
            Pick up where you left off, explore curated weekly trends, and dive into new chapters from your favorite indie authors.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/browse">
              <Button variant="primary" size="md">
                Browse Full Catalogue
              </Button>
            </Link>
            {user.role === 'writer' && (
              <Link to="/w/dashboard">
                <Button variant="secondary" size="md">
                  Go to Writer Studio
                </Button>
              </Link>
            )}
            {user.role === 'publisher' && (
              <Link to="/p/discover">
                <Button variant="secondary" size="md">
                  Scout Catalogue
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Continue Reading Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
              Continue Reading
            </h2>
            <p className="text-xs text-stone-500">Pick up your active bookmarks and recent progress</p>
          </div>
          <Link to="/library" className="text-xs font-bold text-[#FF500A] hover:underline">
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
                  className="bg-white border border-stone-200/90 rounded-2xl p-4 flex gap-4 items-center shadow-xs hover:shadow-md transition-shadow group"
                >
                  <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden shadow-xs">
                    <CoverImage
                      publicId={book.coverPublicId}
                      url={book.coverUrl}
                      title={book.title}
                      preset="thumb"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF500A] bg-[#FFF0E8] px-2 py-0.5 rounded-full inline-block mb-1">
                      {book.genre || 'Story'}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm truncate group-hover:text-[#FF500A] transition-colors">
                      {book.title || 'Untitled'}
                    </h3>
                    <p className="text-stone-500 text-xs truncate mb-2">
                      by {book.writer?.name || 'Author'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>Page {currentPage} of {totalPages}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#FF500A] h-1.5 rounded-full transition-all duration-300"
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
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xs text-stone-400 mb-3">
              <BookOpen className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="font-bold text-stone-800 text-sm">Your reading shelf is ready</h3>
            <p className="text-stone-500 text-xs mt-1 max-w-sm">
              You don't have any in-progress books yet. Pick any story below or browse the catalogue to start reading!
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
              Trending Right Now
            </h2>
            <p className="text-xs text-stone-500">The most read stories across SceneCraft this week</p>
          </div>
          <Link to="/browse" className="text-xs font-bold text-[#FF500A] hover:underline">
            See all
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="w-40 sm:w-48 shrink-0">
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                Science Fiction & Cyberpunk
              </h2>
              <p className="text-xs text-stone-500">Futuristic sagas, space exploration, and AI thrillers</p>
            </div>
            <Link to="/browse/Sci-Fi" className="text-xs font-bold text-[#FF500A] hover:underline">
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                Epic Fantasy & Magic
              </h2>
              <p className="text-xs text-stone-500">High magic, ancient realms, and legendary quests</p>
            </div>
            <Link to="/browse/Fantasy" className="text-xs font-bold text-[#FF500A] hover:underline">
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
// GUEST LANDING PAGE (Spec 12.4)
// -------------------------------------------------------------
function GuestLandingPage({ trending, loading }) {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 pb-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E8] border border-[#FF500A]/20 text-[#FF500A] text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#FF500A] animate-pulse" />
              The Next Era of Storytelling
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-black text-stone-900 tracking-tight leading-[1.1]">
              Read stories. <br />
              <span className="text-[#FF500A]">Write yours.</span> <br />
              Get discovered.
            </h1>

            <p className="text-stone-600 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-body">
              A next-generation reading and publishing platform powered by narrative intelligence. Discover original serialized works, craft stories with deep structural insights, or scout breakout literary talent.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start pt-2">
              <Link to="/browse">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg">
                  Start Reading
                </Button>
              </Link>
              <Link to="/signup?role=writer">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Start Writing
                </Button>
              </Link>
            </div>

            {/* Quick metrics badge row */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-8 text-xs text-stone-500 border-t border-stone-200/80">
              <div>
                <span className="block font-heading text-lg font-bold text-stone-900">100% Free</span>
                <span>To read and publish</span>
              </div>
              <div className="w-px h-8 bg-stone-200" />
              <div>
                <span className="block font-heading text-lg font-bold text-stone-900">Deep Insights</span>
                <span>Character & plot graphs</span>
              </div>
              <div className="w-px h-8 bg-stone-200" />
              <div>
                <span className="block font-heading text-lg font-bold text-stone-900">Publisher Scout</span>
                <span>Direct industry scouting</span>
              </div>
            </div>
          </div>

          {/* Right Hero Collage with floating cards */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-72 sm:w-80 h-96 sm:h-[420px]">
              {/* Back Card */}
              <div className="absolute top-4 -left-6 w-52 sm:w-56 h-72 sm:h-80 bg-gradient-to-br from-indigo-900 via-stone-900 to-purple-900 rounded-2xl shadow-xl transform -rotate-6 border border-white/20 p-4 flex flex-col justify-end text-white">
                <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Sci-Fi Epic</div>
                <div className="font-heading font-bold text-base leading-snug">The Quantum Sovereign</div>
              </div>

              {/* Main Center Card */}
              <div className="absolute top-0 right-2 w-56 sm:w-60 h-80 sm:h-88 bg-gradient-to-br from-[#FF500A] via-stone-900 to-stone-950 rounded-2xl shadow-2xl transform rotate-3 border-2 border-white/30 p-5 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 bg-black/40 rounded-full text-[10px] font-bold tracking-wider backdrop-blur-xs">
                    FEATURED
                  </span>
                  <span className="text-amber-300 text-xs font-bold">★ 4.9</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-orange-200 font-bold">Fantasy & Romance</span>
                  <h3 className="font-heading font-extrabold text-xl leading-tight mt-1">
                    Chronicles of the Sunken Spire
                  </h3>
                  <p className="text-[11px] text-stone-300 mt-2 line-clamp-2">
                    In the drowned ruins of Aethelgard, two rivals seek the drowned crest before nightfall.
                  </p>
                </div>
              </div>

              {/* Floating Badge 1: Stats */}
              <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md border border-stone-200/80 p-3 rounded-2xl shadow-xl flex items-center gap-3 z-20">
                <div className="w-10 h-10 rounded-full bg-[#FFF0E8] flex items-center justify-center text-[#FF500A] font-bold text-sm">
                  ★
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">4.9 / 5.0 Rating</div>
                  <div className="text-[11px] text-stone-500">Over 38,000 Reads</div>
                </div>
              </div>

              {/* Floating Badge 2: Graph insight */}
              <div className="absolute top-12 -right-6 bg-white/95 backdrop-blur-md border border-stone-200/80 px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 z-20">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-stone-800">Character Arc Tracked</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRENDING NOW CAROUSEL */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FF500A] mb-1">Weekly Spotlight</div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Trending Stories
            </h2>
          </div>
          <Link to="/browse">
            <Button variant="ghost" size="sm" className="text-[#FF500A]">
              View All Catalogue &rarr;
            </Button>
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

      {/* 3. ORIGINAL GENRE TILES (CSS/SVG, No copied art) */}
      <section>
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF500A] mb-1">Explore Worlds</div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Browse by Genre
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Pick your favorite genre and immerse yourself in thousands of serialized chapters.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {GENRES.map((genre) => {
            const colors = GENRE_COLORS[genre] || { bg: 'bg-stone-800', text: 'text-stone-100', border: 'border-stone-700' };
            return (
              <Link
                key={genre}
                to={`/browse/${encodeURIComponent(genre)}`}
                className={`group relative p-5 rounded-2xl ${colors.bg} ${colors.text} border ${colors.border} transition-all duration-200 hover:-translate-y-1 hover:shadow-lg overflow-hidden flex flex-col justify-between h-32`}
              >
                {/* Subtle geometric SVG accent */}
                <div className="absolute right-0 bottom-0 opacity-15 transform translate-x-2 translate-y-2 group-hover:scale-110 transition-transform">
                  <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="50" r="40" />
                  </svg>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Genre</span>
                  <span className="text-xs transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>

                <div className="relative z-10">
                  <h3 className="font-heading font-extrabold text-lg leading-tight">
                    {genre}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. "READ DEEPER" DIFFERENTIATOR BLOCK */}
      <section className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-[#FF500A]">
              Narrative Intelligence
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              Read deeper with dynamic story insights.
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              SceneCraft isn't just an e-reader. For the first time, readers and publishers can explore interactive character relationship graphs, emotional pacing arcs, and structural narrative beats generated straight from the manuscript.
            </p>
            <ul className="space-y-3 text-xs sm:text-sm text-stone-300">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF500A] text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>Character Co-occurrence Networks:</strong> See who talks to whom across every scene.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF500A] text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>Structural Pacing Arcs:</strong> Track conflict and tension across all story acts.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF500A] text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>Spoiler-Safe Insight Controls:</strong> Unlock insights as you finish chapters.</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link to="/browse">
                <Button variant="primary" size="md">
                  Experience a Story
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Graphic Visualization preview */}
          <div className="lg:col-span-6">
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-stone-400">entity_graph: Act II Scene 4</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-bold">
                  LIVE ANALYSIS
                </span>
              </div>

              {/* Graphic Nodes */}
              <div className="relative h-64 sm:h-72 my-4 flex items-center justify-center">
                {/* SVG connection lines */}
                <svg className="absolute inset-0 w-full h-full text-stone-700 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="25%" y1="35%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                  <line x1="75%" y1="35%" x2="50%" y2="50%" stroke="#FF500A" strokeWidth="2.5" />
                  <line x1="35%" y1="75%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="65%" y1="75%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="25%" y1="35%" x2="75%" y2="35%" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                </svg>

                {/* Central Node */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-[#FF500A] shadow-lg shadow-[#FF500A]/40 flex items-center justify-center font-bold text-white text-sm ring-4 ring-white/10">
                    Protagonist
                  </div>
                  <span className="text-[11px] font-semibold text-white mt-1">Evelyn Cross</span>
                </div>

                {/* Node 1 */}
                <div className="absolute top-[20%] left-[15%] flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    Ally
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1">Caelen Vance</span>
                </div>

                {/* Node 2 */}
                <div className="absolute top-[20%] right-[15%] flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center font-bold text-white text-xs ring-2 ring-rose-400/40">
                    Rival
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1">Lord Morven</span>
                </div>

                {/* Node 3 */}
                <div className="absolute bottom-[15%] left-[25%] flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px]">
                    Mentor
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1">Archivist Rhea</span>
                </div>

                {/* Node 4 */}
                <div className="absolute bottom-[15%] right-[25%] flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center font-bold text-white text-[10px]">
                    Shadow
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1">The Envoy</span>
                </div>
              </div>

              {/* Bottom metric bar */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-[11px] text-stone-400">
                <span>Centrality: <strong>0.84 (Dominant)</strong></span>
                <span>Scene Tension: <strong className="text-amber-400">High</strong></span>
                <span className="text-[#FF500A] font-bold">14 Interlocking Events</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THREE ROLE CARDS (Reader, Writer, Publisher) */}
      <section>
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF500A] mb-1">Built For You</div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            One platform, three thriving communities.
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Choose your role and join thousands of story lovers, creators, and scouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reader Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-7 shadow-xs hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#FF500A] flex items-center justify-center font-bold text-xl mb-5">
                📖
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">
                For Readers
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Immerse yourself in bold new worlds. Read original serials, bookmark your favorite storylines, and support rising creators directly.
              </p>
              <ul className="text-xs text-stone-500 space-y-2 mb-6">
                <li>• Free mobile and desktop web reading</li>
                <li>• Interactive chapter discussions</li>
                <li>• Genre filters & personalized shelves</li>
              </ul>
            </div>
            <Link to="/browse">
              <Button variant="secondary" size="md" className="w-full">
                Explore Stories
              </Button>
            </Link>
          </div>

          {/* Writer Card */}
          <div className="bg-white rounded-2xl border-2 border-[#FF500A] p-7 shadow-md hover:shadow-lg transition flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 bg-[#FF500A] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Creator Hub
            </span>
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FFF0E8] text-[#FF500A] flex items-center justify-center font-bold text-xl mb-5">
                ✍️
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">
                For Writers
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Write with structural clarity. Upload manuscripts, analyze character presence and scene pacing, and build an audience of dedicated readers.
              </p>
              <ul className="text-xs text-stone-500 space-y-2 mb-6">
                <li>• Real-time manuscript pipeline</li>
                <li>• Structural arc & entity analysis</li>
                <li>• Retain 100% of your story copyright</li>
              </ul>
            </div>
            <Link to="/signup?role=writer">
              <Button variant="primary" size="md" className="w-full">
                Start Writing Today
              </Button>
            </Link>
          </div>

          {/* Publisher Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-7 shadow-xs hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl mb-5">
                🔍
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">
                For Publishers
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Scout validated talent. Access story metrics, reader retention signals, and discover fresh breakout manuscripts before the rest of the market.
              </p>
              <ul className="text-xs text-stone-500 space-y-2 mb-6">
                <li>• Vetted editorial discovery dashboard</li>
                <li>• Narrative pacing and reader engagement data</li>
                <li>• Direct author scout contact channels</li>
              </ul>
            </div>
            <Link to="/signup?role=publisher">
              <Button variant="secondary" size="md" className="w-full">
                Apply for Scout Access
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
