import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

import { Search, LogOut, ChevronDown, User, PenTool, Briefcase, Shield, BookOpen } from 'lucide-react';
import { GENRES } from '../constants/app';

export default function PublicLayout() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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

  const getRoleBadgeIcon = () => {
    if (role === 'writer') return <PenTool className="w-3 h-3 text-[#FF500A]" />;
    if (role === 'publisher') return <Briefcase className="w-3 h-3 text-purple-600" />;
    if (role === 'admin') return <Shield className="w-3 h-3 text-emerald-600" />;
    return <BookOpen className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#121212]">
      {/* ─── Sticky White Top Bar with Bottom Border ─────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Primary Nav */}
          <div className="flex items-center gap-6 md:gap-8">
            <Logo />

            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#121212]">
              {/* Browse with Genre Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsBrowseOpen(true)}
                onMouseLeave={() => setIsBrowseOpen(false)}
              >
                <Link
                  to="/browse"
                  className="flex items-center gap-1 hover:text-[#FF500A] transition-colors py-2"
                >
                  Browse
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                {isBrowseOpen && (
                  <div className="absolute top-full left-0 w-64 bg-white rounded-2xl shadow-xl border border-[#E5E5E5] p-3 grid grid-cols-2 gap-1 z-50">
                    <Link
                      to="/browse"
                      onClick={() => setIsBrowseOpen(false)}
                      className="col-span-2 px-3 py-1.5 text-xs font-bold text-[#FF500A] hover:bg-[#FFF0E8] rounded-lg transition-colors"
                    >
                      All Books →
                    </Link>
                    {GENRES.map((genre) => (
                      <Link
                        key={genre}
                        to={`/browse/${encodeURIComponent(genre.toLowerCase())}`}
                        onClick={() => setIsBrowseOpen(false)}
                        className="px-3 py-1.5 text-xs text-slate-700 hover:text-[#FF500A] hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        {genre}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to={role === 'writer' ? '/w/books/new' : '/signup?role=writer'}
                className="hover:text-[#FF500A] transition-colors"
              >
                Write
              </Link>

              <Link
                to={role === 'publisher' ? '/p/discover' : '/signup?role=publisher'}
                className="hover:text-[#FF500A] transition-colors"
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, writers, tags"
              className="w-full h-10 pl-10 pr-3 text-xs md:text-sm bg-[#F7F7F7] rounded-full border border-transparent focus:border-[#E5E5E5] focus:bg-white focus:ring-2 focus:ring-[#FF500A]/30 focus:outline-none transition-all placeholder:text-slate-400"
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
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-[#E5E5E5] hover:border-slate-300 transition-colors bg-white cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#FFF0E8] text-[#FF500A] font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-[#121212] max-w-[100px] truncate hidden md:inline">
                    {user.name}
                  </span>
                  {getRoleBadgeIcon()}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-[#E5E5E5] py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#E5E5E5]/60">
                      <p className="text-xs font-bold text-[#121212] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#6B6B6B] truncate">@{user.username || 'user'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700">
                        {role}
                      </span>
                    </div>

                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-[#121212] hover:bg-[#FFF0E8] hover:text-[#FF500A] transition-colors"
                    >
                      Dashboard
                    </Link>

                    <Link
                      to="/browse"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-[#121212] hover:bg-slate-50 transition-colors"
                    >
                      Catalogue
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-[#D63B2F] hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  to="/login"
                  className="text-xs md:text-sm font-semibold text-[#121212] hover:text-[#FF500A] px-2 py-1.5 transition-colors"
                >
                  Log in
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm" className="font-semibold">
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
      <footer className="mt-auto bg-[#121212] text-white border-t border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#FF500A] flex items-center justify-center text-white">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="font-serif font-bold text-lg text-white">SceneCraft</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm">
                A Wattpad-inspired reading, publishing, and deep story-analysis platform built on the SceneCraft AI pipeline.
              </p>
            </div>

            {/* Link Rows */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-zinc-400">
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/copyright" className="hover:text-white transition-colors">
                Copyright and takedown
              </Link>
              <Link to="/terms#report" className="hover:text-white transition-colors">
                Report content
              </Link>
              <span className="text-zinc-600">|</span>
              <Link to="/help" className="hover:text-white transition-colors">
                Help
              </Link>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
            <p>© 2026 SceneCraft Platform. All rights reserved.</p>
            <p className="italic">Original branding and assets. Not affiliated with Wattpad.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { PublicLayout };

