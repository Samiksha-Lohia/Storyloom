import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Library,
  PenLine,
  Star,
  Inbox,
  MessageSquare,
  User,
  Compass,
  Bookmark,
  Briefcase,
  Users,
  Flag,
  BookOpen,
  LogOut,
} from 'lucide-react';

export default function SidebarLayout({ roleTitle = 'Dashboard' }) {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (role === 'writer') {
      return [
        { label: 'Overview', to: '/w/dashboard', icon: LayoutDashboard },
        { label: 'My Books', to: '/w/books', icon: Library },
        { label: 'Publish New', to: '/w/books/new', icon: PenLine },
        { label: 'Reviews', to: '/w/reviews', icon: Star },
        { label: 'Publisher Requests', to: '/w/requests', icon: Inbox },
        { label: 'Messages', to: '/w/chat', icon: MessageSquare },
        { label: 'Profile', to: '/w/profile', icon: User },
        { label: 'Catalogue', to: '/browse', icon: BookOpen },
      ];
    }
    if (role === 'publisher') {
      return [
        { label: 'Discover', to: '/p/discover', icon: Compass },
        { label: 'Wishlist', to: '/p/wishlist', icon: Bookmark },
        { label: 'Proposals', to: '/p/requests', icon: Briefcase },
        { label: 'Messages', to: '/p/chat', icon: MessageSquare },
        { label: 'Catalogue', to: '/browse', icon: BookOpen },
      ];
    }
    if (role === 'admin') {
      return [
        { label: 'Overview', to: '/a/overview', icon: LayoutDashboard },
        { label: 'Admin Users', to: '/a/users', icon: Users },
        { label: 'Publishers', to: '/a/publishers', icon: Briefcase },
        { label: 'Reports', to: '/a/reports', icon: Flag },
        { label: 'Admin Books', to: '/a/books', icon: Library },
        { label: 'Catalogue', to: '/browse', icon: BookOpen },
      ];
    }
    return [{ label: 'Catalogue', to: '/browse', icon: BookOpen }];
  };

  const navItems = getNavItems();

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      {/* ─── Fixed Left Sidebar (Desktop) ─────────────────────────────────── */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-paper border-r border-rule flex flex-col justify-between z-40 hidden md:flex">
        <div className="flex flex-col min-h-0">
          {/* Logo */}
          <div className="h-16 px-6 border-b border-rule flex items-center shrink-0">
            <Logo />
          </div>

          {/* Nav Items */}
          <nav className="p-3 flex flex-col gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-bold border ${
                    isActive
                      ? 'bg-ink text-paper border-ink'
                      : 'border-transparent text-ink hover:border-rule hover:bg-[#F2ECE0]'
                  }`}
                  style={{ borderRadius: 4 }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info + Sign out (at the bottom, once) */}
        <div className="p-4 border-t border-rule bg-paper shrink-0">
          <div className="mb-2">
            <p className="font-bold text-xs text-ink truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted capitalize">{role || 'reader'}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-danger hover:underline cursor-pointer border border-transparent hover:border-rule"
            style={{ borderRadius: 4 }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area (Offset by 256px on Desktop) ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 bg-paper text-ink min-h-screen">
        <header className="h-16 bg-paper border-b border-rule px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-calligraphy text-2xl md:text-3xl text-ink leading-none">
              {roleTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Navigation Row (Under top bar, no animation) */}
        <div className="md:hidden border-b border-rule bg-paper px-3 py-2 flex flex-wrap gap-1.5 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border ${
                  isActive
                    ? 'bg-ink text-paper border-ink'
                    : 'border-rule text-ink hover:bg-[#F2ECE0]'
                }`}
                style={{ borderRadius: 4 }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-danger border border-rule hover:bg-red-50 cursor-pointer"
            style={{ borderRadius: 4 }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>

        <main className="p-4 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { SidebarLayout };
