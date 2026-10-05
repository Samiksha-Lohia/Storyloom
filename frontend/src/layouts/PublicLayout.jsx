import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { Search, LogOut, ChevronDown } from 'lucide-react';
import { GENRES, APP_NAME } from '../constants/app';

export default function PublicLayout() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getDashboardLink = () => {
    if (role === 'writer') return '/w/dashboard';
    if (role === 'publisher') return '/p/discover';
    if (role === 'admin') return '/a/overview';
    return '/';
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-body">
      {/* ─── Sticky Top Bar with 1px Rule Border ─────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper border-b border-rule">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Primary Nav */}
          <div className="flex items-center gap-6 md:gap-8">
            <Logo />

            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-ink">
              {/* Browse with Genre Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsBrowseOpen(true)}
                onMouseLeave={() => setIsBrowseOpen(false)}
              >
                <Link
                  to="/browse"
                  className="flex items-center gap-1 hover:text-accent hover:underline py-2"
                >
                  Browse
                  <ChevronDown className="w-4 h-4 text-ink" />
                </Link>

                {isBrowseOpen && (
                  <div className="absolute top-full left-0 w-64 bg-paper rounded border border-rule p-3 grid grid-cols-2 gap-1 z-50">
                    <Link
                      to="/browse"
                      onClick={() => setIsBrowseOpen(false)}
                      className="col-span-2 px-3 py-1.5 text-xs font-bold text-accent hover:underline border-b border-rule mb-1"
                    >
                      All Books →
                    </Link>
                    {GENRES.map((genre) => (
                      <Link
                        key={genre}
                        to={`/browse/${encodeURIComponent(genre.toLowerCase())}`}
                        onClick={() => setIsBrowseOpen(false)}
                        className="px-3 py-1.5 text-xs text-ink hover:text-accent hover:underline"
                      >
                        {genre}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to={role === 'writer' ? '/w/books/new' : '/signup?role=writer'}
                className="hover:text-accent hover:underline"
              >
                Write
              </Link>

              <Link
                to={role === 'publisher' ? '/p/discover' : '/signup?role=publisher'}
                className="hover:text-accent hover:underline"
              >
                For publishers
              </Link>
            </nav>
          </div>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-xs sm:max-w-sm hidden sm:flex items-center relative"
          >
            <Search className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, writers, tags"
              className="w-full h-9 pl-9 pr-3 text-xs md:text-sm bg-paper rounded border border-rule text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </form>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user && <NotificationBell />}

            {isAuthenticated && user ? (
              <div
                className="relative"
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-rule hover:border-ink bg-paper cursor-pointer text-xs font-bold text-ink"
                >
                  <span className="truncate max-w-[120px]">{user.name}</span>
                  <span className="text-muted uppercase text-[10px]">({role})</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-paper rounded border border-rule py-1 z-50">
                    <div className="px-3 py-1.5 border-b border-rule">
                      <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                      <p className="text-[11px] text-muted capitalize">{role}</p>
                    </div>

                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-3 py-1.5 text-xs text-ink hover:bg-rule/40 hover:text-accent"
                    >
                      Dashboard
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-rule/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  to="/login"
                  className="text-xs md:text-sm font-bold text-ink hover:text-accent hover:underline px-2 py-1.5"
                >
                  Log in
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Page Content ───────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 md:py-8">
        <Outlet />
      </main>

      {/* ─── Footer with Spec Links ───────────────────────────────────────── */}
      <footer className="mt-auto bg-paper text-ink border-t border-rule">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-rule">
            <div>
              <div className="mb-2">
                <Logo />
              </div>
              <p className="text-xs text-muted max-w-sm">
                A reading, publishing, and deep story-analysis platform built on the {APP_NAME} AI pipeline.
              </p>
            </div>

            {/* Link Rows */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              <Link to="/terms" className="hover:text-ink hover:underline">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-ink hover:underline">
                Privacy Policy
              </Link>
              <Link to="/copyright" className="hover:text-ink hover:underline">
                Copyright and takedown
              </Link>
              <Link to="/terms#report" className="hover:text-ink hover:underline">
                Report content
              </Link>
              <span>|</span>
              <Link to="/help" className="hover:text-ink hover:underline">
                Help
              </Link>
              <Link to="/contact" className="hover:text-ink hover:underline">
                Contact
              </Link>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted">
            <p>© 2026 {APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { PublicLayout };


