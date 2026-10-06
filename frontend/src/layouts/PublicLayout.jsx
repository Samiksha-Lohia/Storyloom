import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import NotificationBell from '../components/common/NotificationBell';
import HoverDropdown from '../components/common/HoverDropdown';
import { useAuth } from '../context/AuthContext';
import { Search, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { GENRES, APP_NAME } from '../constants/app';
import { getNavItemsForRole } from '../constants/navigation';

export default function PublicLayout() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = getNavItemsForRole(isAuthenticated ? role : null);

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-body">
      {/* ─── Sticky Top Bar with 1px Rule Border ─────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper border-b border-rule">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Primary Nav */}
          <div className="flex items-center gap-6 md:gap-8">
            <Logo />

            <nav className="hidden md:flex items-center gap-5 text-sm font-bold text-ink">
              {navItems.map((item) => {
                if (item.hasDropdown) {
                  return (
                    <HoverDropdown
                      key={item.label}
                      trigger={
                        <Link
                          to={item.to}
                          className="flex items-center gap-1 hover:text-accent hover:underline py-2"
                        >
                          {item.label}
                          <ChevronDown className="w-3.5 h-3.5 text-ink" />
                        </Link>
                      }
                      align="left"
                      dropdownClassName="w-64 p-3 grid grid-cols-2 gap-1 z-50"
                    >
                      {({ close }) => (
                        <>
                          <Link
                            to="/browse"
                            onClick={close}
                            className="col-span-2 px-3 py-1.5 text-xs font-bold text-accent hover:underline border-b border-rule mb-1"
                          >
                            All Stories →
                          </Link>
                          {GENRES.map((genre) => (
                            <Link
                              key={genre}
                              to={`/browse/${encodeURIComponent(genre.toLowerCase())}`}
                              onClick={close}
                              className="px-3 py-1.5 text-xs text-ink hover:text-accent hover:underline"
                            >
                              {genre}
                            </Link>
                          ))}
                        </>
                      )}
                    </HoverDropdown>
                  );
                }

                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`py-2 hover:text-accent hover:underline ${
                      isActive ? 'text-accent underline' : 'text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
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
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user && <NotificationBell />}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <HoverDropdown
                  trigger={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-rule hover:border-ink bg-paper cursor-pointer text-xs font-bold text-ink"
                    >
                      <span className="truncate max-w-[120px]">{user.name}</span>
                      <span className="text-muted uppercase text-[10px]">({role})</span>
                      <ChevronDown className="w-3 h-3 text-muted" />
                    </button>
                  }
                  align="right"
                  dropdownClassName="w-48 py-1 z-50"
                >
                  {({ close }) => (
                    <div>
                      <div className="px-3 py-1.5 border-b border-rule">
                        <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                        <p className="text-[11px] text-muted capitalize">{role}</p>
                      </div>

                      {/* Reader role has NO dashboard! */}
                      {role !== 'reader' && (
                        <Link
                          to={getDashboardLink()}
                          onClick={close}
                          className="block px-3 py-1.5 text-xs text-ink hover:bg-rule/40 hover:text-accent"
                        >
                          Dashboard
                        </Link>
                      )}

                      <Link
                        to="/library"
                        onClick={close}
                        className="block px-3 py-1.5 text-xs text-ink hover:bg-rule/40 hover:text-accent"
                      >
                        My Library
                      </Link>

                      <Link
                        to="/settings"
                        onClick={close}
                        className="block px-3 py-1.5 text-xs text-ink hover:bg-rule/40 hover:text-accent"
                      >
                        Settings
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          close();
                          handleSignOut();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-rule/40 flex items-center gap-1.5 cursor-pointer border-t border-rule mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  )}
                </HoverDropdown>
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

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-ink hover:text-accent rounded border border-rule cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-rule bg-paper px-4 py-3 space-y-2">
            <div className="flex flex-col gap-1 pb-2 border-b border-rule">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-1.5 text-xs font-bold text-ink hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {isAuthenticated && (
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-muted">
                  <span className="font-bold text-ink">{user?.name}</span> ({role})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
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
              <p className="text-xs text-muted max-w-sm font-body">
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
