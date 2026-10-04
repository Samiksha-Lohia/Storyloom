import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

import {
  BookOpen,
  LayoutDashboard,
  Upload,
  MessageSquare,
  Star,
  Users,
  Shield,
  AlertTriangle,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

export default function SidebarLayout({ roleTitle = 'Dashboard' }) {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (role === 'writer') {
      return [
        { label: 'Overview', to: '/w/dashboard', icon: LayoutDashboard },
        { label: 'My Books', to: '/w/books', icon: BookOpen },
        { label: 'Publish New', to: '/w/books/new', icon: Upload },
        { label: 'Reviews', to: '/w/reviews', icon: Star },
        { label: 'Publisher Requests', to: '/w/requests', icon: MessageSquare },
        { label: 'Messages & Chat', to: '/w/chat', icon: MessageSquare },
        { label: 'Profile', to: '/w/profile', icon: Users },
      ];
    }
    if (role === 'publisher') {
      return [
        { label: 'Discover', to: '/p/discover', icon: BookOpen },
        { label: 'Wishlist', to: '/p/wishlist', icon: Star },
        { label: 'Proposals & Offers', to: '/p/requests', icon: MessageSquare },
        { label: 'Messages & Chat', to: '/p/chat', icon: MessageSquare },
      ];
    }
    if (role === 'admin') {
      return [
        { label: 'Overview', to: '/a/overview', icon: LayoutDashboard },
        { label: 'Users', to: '/a/users', icon: Users },
        { label: 'Publishers', to: '/a/publishers', icon: Shield },
        { label: 'Reports', to: '/a/reports', icon: AlertTriangle },
        { label: 'Books', to: '/a/books', icon: BookOpen },
      ];
    }
    return [{ label: 'Catalogue', to: '/browse', icon: BookOpen }];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-[#F7F7F7] text-[#121212]">
      {/* ─── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-[#E5E5E5] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Logo */}
          <div className="h-16 px-6 border-b border-[#E5E5E5] flex items-center">
            <Logo />
          </div>

          {/* User role badge */}
          <div className="px-6 py-4 border-b border-[#E5E5E5]/60">
            <p className="text-xs text-[#6B6B6B]">Logged in as</p>
            <p className="font-bold text-sm text-[#121212] truncate">{user?.name || 'User'}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#FFF0E8] text-[#FF500A]">
              {role || 'reader'}
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#FF500A] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-[#FFF0E8] hover:text-[#FF500A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#E5E5E5]">
          <Link
            to="/browse"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-[#FF500A] transition-colors rounded-lg hover:bg-slate-50 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Reader Catalogue
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#D63B2F] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E5E5] px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link to="/browse" className="md:hidden text-xs text-[#FF500A] font-bold">
              ← Reader View
            </Link>
            <h1 className="font-serif font-bold text-lg md:text-xl text-[#121212] capitalize">
              {roleTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-xs text-[#6B6B6B]">
              Welcome, <span className="font-semibold text-[#121212]">{user?.name}</span>
            </div>
          </div>
        </header>


        <main className="p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { SidebarLayout };

