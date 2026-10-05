import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReportButton from '../../components/common/ReportButton';
import { APP_NAME } from '../../constants/app';
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
      <div className="max-w-5xl mx-auto my-8 p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
        Loading…
      </div>
    );
  }

  if (error || !profileData?.writer) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-paper border border-rule rounded text-center space-y-4">
        <div className="w-12 h-12 border border-rule text-danger rounded flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-ink text-base">Writer Not Found</h3>
        <p className="text-xs text-muted leading-relaxed">
          {error || 'This author profile does not exist or may have been deactivated.'}
        </p>
        <Link
          to="/browse"
          className="inline-block px-4 py-2 bg-ink text-paper rounded text-xs font-bold hover:opacity-90"
        >
          Explore Catalogue
        </Link>
      </div>
    );
  }

  const { writer, books = [] } = profileData;
  const template = (writer.defaultTemplate || 'classic').toLowerCase();
  const isSelf = user && (user._id || user.id)?.toString() === writer.id?.toString();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SHOWCASE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (template === 'showcase') {
    return (
      <div className="book-template-showcase min-h-screen bg-paper text-ink pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-8 text-left">
          {/* Centered Hero Card */}
          <section className="bg-paper border border-rule rounded p-6 sm:p-10 flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            {writer.avatarUrl ? (
              <img
                src={writer.avatarUrl}
                alt={writer.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded object-cover border border-rule"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded bg-paper border border-rule text-ink font-bold text-3xl flex items-center justify-center">
                {writer.name?.[0] || 'W'}
              </div>
            )}

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted">
                Verified Author
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-ink">
                {writer.name}
              </h1>
              <p className="text-xs text-muted">@{writer.username}</p>
            </div>

            {/* Bio */}
            {writer.bio && (
              <p className="text-xs sm:text-sm text-ink max-w-2xl leading-relaxed italic">
                "{writer.bio}"
              </p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold pt-2">
              <div className="px-3.5 py-1.5 bg-paper rounded border border-rule flex items-center gap-2 text-ink">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>{writer.publishedBooksCount || books.length} Published Books</span>
              </div>
              <div className="px-3.5 py-1.5 bg-paper rounded border border-rule flex items-center gap-2 text-ink">
                <Users className="w-4 h-4 text-muted" />
                <span>{writer.followersCount || 0} Followers</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              {!isSelf && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold border cursor-pointer ${
                    writer.isFollowing
                      ? 'bg-paper text-ink border-rule hover:border-danger hover:text-danger'
                      : 'bg-accent text-paper border-accent hover:bg-accent-hover'
                  }`}
                >
                  {writer.isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-success" />
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
                className="p-2.5 bg-paper hover:border-ink border border-rule rounded text-muted hover:text-ink cursor-pointer"
              />
            </div>
          </section>

          {/* Books Shelf */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Feather className="w-4 h-4 text-accent" />
              Published Works ({books.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((b) => (
                <BookShelfCard key={b._id} book={b} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. NOTEBOOK TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (template === 'notebook') {
    return (
      <div className="book-template-notebook min-h-screen bg-paper text-ink pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-8 text-left">
          {/* Paper Note Card */}
          <div className="bg-paper border border-rule rounded p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
              {/* Avatar */}
              <div>
                {writer.avatarUrl ? (
                  <img
                    src={writer.avatarUrl}
                    alt={writer.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded object-cover border border-rule"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded bg-paper border border-rule text-ink font-bold text-3xl flex items-center justify-center">
                    {writer.name?.[0] || 'W'}
                  </div>
                )}
              </div>

              {/* Bio & Details */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-normal text-ink">
                      {writer.name}
                    </h1>
                    <p className="text-xs text-muted">@{writer.username}</p>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {!isSelf && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold border cursor-pointer ${
                          writer.isFollowing
                            ? 'bg-paper text-ink border-rule hover:border-danger hover:text-danger'
                            : 'bg-accent text-paper border-accent hover:bg-accent-hover'
                        }`}
                      >
                        {writer.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-success" />
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
                      className="p-1.5 bg-paper hover:border-ink text-muted hover:text-ink rounded border border-rule cursor-pointer"
                    />
                  </div>
                </div>

                {writer.bio && (
                  <p className="text-xs sm:text-sm text-ink leading-relaxed pt-1">
                    {writer.bio}
                  </p>
                )}

                {/* Sticker Chips */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-0.5 bg-paper text-ink border border-rule rounded text-xs font-bold">
                    📚 {writer.publishedBooksCount || books.length} Stories
                  </span>
                  <span className="px-2.5 py-0.5 bg-paper text-ink border border-rule rounded text-xs font-bold">
                    ✨ {writer.followersCount || 0} Readers Following
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Books Shelf */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink">
              Manuscripts & Publications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((b) => (
                <BookShelfCard key={b._id} book={b} />
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
    <div className="book-template-classic min-h-screen bg-paper text-ink pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-8 text-left">
        {/* Profile Card */}
        <div className="bg-paper border border-rule rounded p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {writer.avatarUrl ? (
              <img
                src={writer.avatarUrl}
                alt={writer.name}
                className="w-24 h-24 rounded object-cover border border-rule"
              />
            ) : (
              <div className="w-24 h-24 rounded bg-paper text-ink font-bold text-2xl flex items-center justify-center border border-rule">
                {writer.name?.[0] || 'W'}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted">
                  {APP_NAME} Writer
                </span>
              </div>
              <h1 className="text-3xl font-normal text-ink">
                {writer.name}
              </h1>
              <p className="text-xs text-muted">@{writer.username}</p>

              {writer.bio && (
                <p className="text-xs sm:text-sm text-ink max-w-xl leading-relaxed pt-1">
                  {writer.bio}
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted font-normal pt-2">
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold border cursor-pointer ${
                  writer.isFollowing
                    ? 'bg-paper text-ink border-rule hover:border-danger hover:text-danger'
                    : 'bg-accent text-paper border-accent hover:bg-accent-hover'
                }`}
              >
                {writer.isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-success" />
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
              className="p-2.5 bg-paper hover:border-ink text-muted hover:text-ink border border-rule rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Books Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <h2 className="text-base font-bold text-ink">
              Published Shelf ({books.length})
            </h2>
          </div>

          {books.length === 0 ? (
            <div className="p-12 text-center bg-paper rounded border border-rule text-muted text-xs">
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

function BookShelfCard({ book }) {
  return (
    <Link
      to={`/book/${book.id || book._id}`}
      className="bg-paper rounded border border-rule overflow-hidden flex flex-col justify-between hover:border-ink"
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

          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-ink text-paper">
              {book.genre || 'General'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-1.5 text-left">
          <h3 className="font-bold text-sm text-ink line-clamp-1 hover:text-accent">
            {book.title}
          </h3>
          <p className="text-xs text-muted line-clamp-2 leading-relaxed">
            {book.synopsis || book.blurb || 'Explore this story with narrative insights and character tracking.'}
          </p>
        </div>
      </div>

      <div className="p-4 pt-2 flex items-center justify-between text-xs text-muted border-t border-rule font-normal">
        <span>★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}</span>
        <span>{book.stats?.reads || 0} reads</span>
      </div>
    </Link>
  );
}

export default PublicWriterProfilePage;
