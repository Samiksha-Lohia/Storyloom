import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReportButton from '../../components/common/ReportButton';
import { DEFAULT_ACCENT } from '../../constants/templates';
import {
  BookOpen,
  Users,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Feather
} from 'lucide-react';

export function PublicWriterProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadWriterProfile();
  }, [username]);

  const loadWriterProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.writers.getProfile(username);
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load writer profile:', err);
      setError(err.message || 'Writer profile not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profileData?.writer) return;
    if (!user) {
      alert('Please log in to follow writers.');
      return;
    }

    setFollowLoading(true);
    const currentlyFollowing = profileData.writer.isFollowing;
    try {
      if (currentlyFollowing) {
        await api.writers.unfollow(username);
        setProfileData((prev) => ({
          ...prev,
          writer: {
            ...prev.writer,
            isFollowing: false,
            followersCount: Math.max(0, (prev.writer.followersCount || 1) - 1),
          },
        }));
      } else {
        await api.writers.follow(username);
        setProfileData((prev) => ({
          ...prev,
          writer: {
            ...prev.writer,
            isFollowing: true,
            followersCount: (prev.writer.followersCount || 0) + 1,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-48 bg-slate-100 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !profileData?.writer) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-slate-800 text-lg">Writer Not Found</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'This author profile does not exist or may have been deactivated.'}
        </p>
        <Link
          to="/browse"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
        >
          Explore Catalogue
        </Link>
      </div>
    );
  }

  const { writer, books = [] } = profileData;
  const template = (writer.defaultTemplate || 'classic').toLowerCase();
  const accent = writer.defaultAccent || DEFAULT_ACCENT;
  const isSelf = user && (user._id || user.id)?.toString() === writer.id?.toString();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SHOWCASE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (template === 'showcase') {
    return (
      <div
        className="book-template-showcase min-h-screen text-slate-100 pb-20 transition-colors"
        style={{ '--accent': accent }}
      >
        {/* Full-width dark hero */}
        <section className="relative overflow-hidden bg-[#121212] pt-16 pb-20 px-6 sm:px-12 border-b border-stone-800">
          {writer.avatarUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${writer.avatarUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            {writer.avatarUrl ? (
              <img
                src={writer.avatarUrl}
                alt={writer.name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 shadow-2xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-stone-800 text-white font-serif font-bold text-3xl flex items-center justify-center ring-4 ring-white/10 shadow-2xl">
                {writer.name?.[0] || 'W'}
              </div>
            )}

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-stone-300 border border-white/15">
                Verified Author
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                {writer.name}
              </h1>
              <p className="text-sm text-stone-400 font-mono">@{writer.username}</p>
            </div>

            {/* Bio */}
            {writer.bio && (
              <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed italic font-serif">
                "{writer.bio}"
              </p>
            )}

            {/* Stats Pills */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold pt-2">
              <div className="px-4 py-2 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span>{writer.publishedBooksCount || books.length} Published Books</span>
              </div>
              <div className="px-4 py-2 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{writer.followersCount || 0} Followers</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              {!isSelf && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                    writer.isFollowing
                      ? 'bg-stone-800 hover:bg-rose-900/40 text-stone-200 hover:text-rose-300 border border-stone-700'
                      : 'bg-[#FF500A] hover:bg-[#e04505] text-white'
                  }`}
                >
                  {writer.isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow Author
                    </>
                  )}
                </button>
              )}

              <ReportButton
                targetType="user"
                targetId={writer.id}
                targetTitle={writer.name || writer.username}
                variant="icon"
                className="p-2.5 bg-stone-800/80 hover:bg-stone-700 border border-stone-700 rounded-xl text-stone-400 hover:text-stone-200 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Books Shelf */}
        <section className="max-w-6xl mx-auto px-6 pt-12 space-y-6 text-left">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Feather className="w-5 h-5 text-orange-400" />
            Published Works ({books.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((b) => (
              <BookShelfCard key={b._id} book={b} dark={true} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. NOTEBOOK TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (template === 'notebook') {
    return (
      <div
        className="book-template-notebook min-h-screen bg-[#FFFDF8] text-stone-800 pb-20 transition-colors"
        style={{
          '--accent': accent,
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-8 text-left">
          {/* Paper Note Card */}
          <div className="bg-[#FFFDF5] border border-amber-200/80 rounded-3xl p-6 sm:p-10 shadow-md relative overflow-hidden">
            {/* Ruled lines pattern */}
            <div className="absolute top-0 right-0 left-0 h-3 bg-amber-200/50" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 pt-2">
              {/* Pinned Avatar */}
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-red-400 absolute -top-3 -right-2 shadow-xs border-2 border-white z-10" />
                {writer.avatarUrl ? (
                  <img
                    src={writer.avatarUrl}
                    alt={writer.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md transform -rotate-2"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-100 text-amber-800 font-serif font-bold text-3xl flex items-center justify-center border-4 border-white shadow-md transform -rotate-2">
                    {writer.name?.[0] || 'W'}
                  </div>
                )}
              </div>

              {/* Bio & Details */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-serif font-bold text-stone-900 font-['Caveat',cursive]">
                      {writer.name}
                    </h1>
                    <p className="text-xs text-stone-500 font-mono">@{writer.username}</p>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {!isSelf && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          writer.isFollowing
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        {writer.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </>
                        )}
                      </button>
                    )}

                    <ReportButton
                      targetType="user"
                      targetId={writer.id}
                      targetTitle={writer.name || writer.username}
                      variant="icon"
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-stone-500 rounded-lg transition-colors border border-amber-200"
                    />
                  </div>
                </div>

                {writer.bio && (
                  <p className="text-sm text-stone-700 leading-relaxed font-serif pt-1">
                    {writer.bio}
                  </p>
                )}

                {/* Sticker Chips */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-amber-100/80 text-amber-900 rounded-md text-xs font-mono font-semibold shadow-2xs">
                    📚 {writer.publishedBooksCount || books.length} Stories
                  </span>
                  <span className="px-3 py-1 bg-amber-100/80 text-amber-900 rounded-md text-xs font-mono font-semibold shadow-2xs">
                    ✨ {writer.followersCount || 0} Readers Following
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Books Shelf */}
          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-stone-900 font-['Caveat',cursive]">
              Manuscripts & Publications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((b) => (
                <BookShelfCard key={b._id} book={b} notebook={true} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CLASSIC TEMPLATE (Default)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="book-template-classic min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 transition-colors"
      style={{ '--accent': accent }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-8 text-left">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {writer.avatarUrl ? (
              <img
                src={writer.avatarUrl}
                alt={writer.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-100 text-slate-600 font-serif font-bold text-2xl flex items-center justify-center border-2 border-slate-200">
                {writer.name?.[0] || 'W'}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                  SceneCraft Writer
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-slate-900">
                {writer.name}
              </h1>
              <p className="text-xs text-slate-400 font-mono">@{writer.username}</p>

              {writer.bio && (
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed pt-1">
                  {writer.bio}
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-medium pt-2">
                <span>{writer.publishedBooksCount || books.length} Published Books</span>
                <span>•</span>
                <span>{writer.followersCount || 0} Followers</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {!isSelf && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  writer.isFollowing
                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                    : 'bg-[#FF500A] hover:bg-[#e04505] text-white'
                }`}
              >
                {writer.isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow Writer
                  </>
                )}
              </button>
            )}

            <ReportButton
              targetType="user"
              targetId={writer.id}
              targetTitle={writer.name || writer.username}
              variant="icon"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            />
          </div>
        </div>

        {/* Books Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl font-serif font-bold text-slate-900">
              Published Shelf ({books.length})
            </h2>
          </div>

          {books.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              This writer has not published any manuscripts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((b) => (
                <BookShelfCard key={b._id} book={b} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookShelfCard({ book, dark = false, notebook = false }) {
  const bgClass = dark
    ? 'bg-stone-900 border-stone-800 text-stone-100 hover:border-stone-700'
    : notebook
    ? 'bg-white border-amber-200/90 text-stone-800 hover:shadow-md'
    : 'bg-white border-slate-200 text-slate-900 hover:shadow-md';

  return (
    <Link
      to={`/book/${book.id || book._id}`}
      className={`group rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-200 ${bgClass}`}
    >
      <div>
        <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-200 text-slate-400 font-serif">
              <BookOpen className="w-8 h-8 mb-2" />
              <span className="text-xs font-semibold">{book.title}</span>
            </div>
          )}

          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs">
              {book.genre || 'General'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-1.5 text-left">
          <h3 className="font-serif font-bold text-sm line-clamp-1 group-hover:text-[#FF500A] transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {book.synopsis || 'Explore this story with narrative insights and character tracking.'}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100/20 pt-2 font-mono">
        <span>★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}</span>
        <span>{book.stats?.reads || 0} reads</span>
      </div>
    </Link>
  );
}

export default PublicWriterProfilePage;
