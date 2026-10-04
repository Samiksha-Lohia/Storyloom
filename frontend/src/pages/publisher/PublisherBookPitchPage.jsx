import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StoryArcTab from '../../components/StoryArcTab';
import RelationshipsTab from '../../components/RelationshipsTab';
import MoodSummaryCard from '../../components/common/MoodSummaryCard';
import StarWishlistButton from '../../components/common/StarWishlistButton';
import PublishRequestModal from '../../components/publisher/PublishRequestModal';
import {
  Sparkles,
  ArrowLeft,
  BookOpen,
  Star,
  Users,
  Eye,
  CheckCircle2,
  Bookmark,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserPlus,
  MessageSquare,
  Shield,
  Layers,
  Briefcase,
  Clock,
  AlertCircle
} from 'lucide-react';

export function PublisherBookPitchPage() {
  const { id: bookId } = useParams();
  const { user } = useAuth();
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    loadPitch();
  }, [bookId]);

  const loadPitch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.pitch.get(bookId);
      setPitch(data);

      // Check writer follow status if writer exists
      if (data?.writerSnapshot?.username) {
        try {
          const profile = await api.writers.getProfile(data.writerSnapshot.username);
          setIsFollowing(profile.isFollowing);
        } catch {
          // Non-blocking
        }
      }

      // Check active publish request for this book
      if (user?.role === 'publisher') {
        try {
          const reqRes = await api.publishRequests.list({ limit: 50 });
          const reqList = reqRes?.data || [];
          const found = reqList.find(
            (r) => (r.bookId?._id || r.bookId)?.toString() === bookId.toString()
          );
          setActiveRequest(found || null);
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.error('Failed to load pitch deck:', err);
      if (err.message && err.message.includes('PUBLISHER_PENDING')) {
        setError('Your publisher application is currently pending admin approval.');
      } else {
        setError(err.message || 'Failed to load pitch panel.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const updatedCard = await api.pitch.regenerate(bookId);
      setPitch((prev) => ({
        ...prev,
        pitchCard: updatedCard,
      }));
    } catch (err) {
      alert(err.message || 'Failed to regenerate pitch card.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!pitch?.writerSnapshot?.username) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.writers.unfollow(pitch.writerSnapshot.username);
        setIsFollowing(false);
        setPitch((prev) => ({
          ...prev,
          writerSnapshot: {
            ...prev.writerSnapshot,
            followersCount: Math.max(0, (prev.writerSnapshot.followersCount || 1) - 1),
          },
        }));
      } else {
        await api.writers.follow(pitch.writerSnapshot.username);
        setIsFollowing(true);
        setPitch((prev) => ({
          ...prev,
          writerSnapshot: {
            ...prev.writerSnapshot,
            followersCount: (prev.writerSnapshot.followersCount || 0) + 1,
          },
        }));
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse text-left">
        <div className="h-6 bg-slate-200 rounded-md w-32"></div>
        <div className="h-44 bg-slate-100 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-rose-200 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-slate-900 text-lg">Pitch Access Restricted</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <Link
          to="/p/discover"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
        >
          Back to Catalogue
        </Link>
      </div>
    );
  }

  if (!pitch) return null;

  const { pitchCard, traction, moodSummary, mainCast, relationships, arcData, writerSnapshot } = pitch;
  const isOwnerOrAdmin = user?.role === 'admin' || (user?._id || user?.id)?.toString() === writerSnapshot?.id?.toString();

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/p/discover"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
              Executive Pitch Panel
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">
              {pitch.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Wishlist Star Button with inTalks indicator */}
          <StarWishlistButton
            bookId={pitch.bookId}
            size="lg"
            showLabel={true}
            inTalks={pitch.inTalks || activeRequest?.status === 'accepted'}
          />

          {/* Publisher Acquisition Offer Button */}
          {user?.role === 'publisher' && (
            <>
              {activeRequest?.status === 'pending' ? (
                <span className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Offer Pending
                </span>
              ) : activeRequest?.status === 'accepted' ? (
                <Link
                  to="/p/requests"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  In Talks (Open Chat)
                </Link>
              ) : activeRequest?.status === 'declined' &&
                activeRequest.cooldownUntil &&
                new Date(activeRequest.cooldownUntil) > new Date() ? (
                <span
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-medium cursor-not-allowed"
                  title={`Declined. Cooldown until ${new Date(activeRequest.cooldownUntil).toLocaleDateString()}`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  Declined (Cooldown)
                </span>
              ) : (
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-sm cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#FF500A]" />
                  I want to publish
                </button>
              )}
            </>
          )}

          {/* Full Reader CTA */}
          <Link
            to={`/read/${pitch.bookId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF500A] hover:bg-[#e04505] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <BookOpen className="w-4 h-4" />
            Read Full Manuscript
          </Link>
        </div>
      </div>

      {/* Publish Request Modal */}
      <PublishRequestModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        bookId={pitch.bookId}
        bookTitle={pitch.title}
        onSuccess={(newReq) => {
          setActiveRequest(newReq);
          setShowPublishModal(false);
        }}
      />

      {/* ─── 1. AI Pitch Card ──────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-md overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                AI Story Pitch
              </span>
              <span className="text-xs text-slate-400">
                Generated {pitchCard?.generatedAt ? new Date(pitchCard.generatedAt).toLocaleDateString() : 'Recently'}
              </span>
            </div>

            {/* Regenerate Button (limited 3/day) */}
            {isOwnerOrAdmin && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer"
                title="Regenerate pitch card (max 3 times/day)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? 'Regenerating...' : 'Regenerate Pitch'}
              </button>
            )}
          </div>

          {/* Hook / Logline */}
          <blockquote className="text-lg md:text-2xl font-serif italic text-slate-100 leading-relaxed max-w-4xl border-l-3 border-[#FF500A] pl-4">
            "{pitchCard?.logline || 'A captivating journey of suspense, identity, and dramatic tension.'}"
          </blockquote>

          {/* Metadata Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Primary Genre
              </span>
              <span className="font-semibold text-white text-sm">
                {pitchCard?.genre || pitch.genre || 'General Fiction'}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Narrative Tone
              </span>
              <span className="font-semibold text-amber-300 text-sm">
                {pitchCard?.tone || 'Engaging & Expressive'}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Target Audience
              </span>
              <span className="font-semibold text-purple-300 text-sm">
                {pitchCard?.targetAudience || 'Enthusiasts of character-driven drama'}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Comparative Titles
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(pitchCard?.forFansOf || ['Modern Drama', 'Literary Fiction']).map((comp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[11px]"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Traction Cards (Audience Metrics) ───────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF500A]" />
          Audience Traction & Market Signals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" /> Reads
            </span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {traction?.reads || 0}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Rating
            </span>
            <span className="text-xl font-bold font-mono text-amber-600">
              ★ {Number(traction?.ratingAvg || 0).toFixed(1)}
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({traction?.ratingCount || 0})
              </span>
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completion
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600">
              {traction?.completionRate || 0}%
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-indigo-500" /> List Adds
            </span>
            <span className="text-xl font-bold font-mono text-indigo-600">
              {traction?.readingListAdds || 0}
            </span>
          </div>

          {/* Wishlists - strictly count only, preserving privacy */}
          <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-600" /> Wishlisted
            </span>
            <span className="text-xl font-bold font-mono text-amber-700">
              {traction?.wishlistCount || 0}
              <span className="text-[10px] text-amber-600 font-sans block mt-0.5">
                publishers
              </span>
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Length
            </span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {pitch.pageCount || 1}
              <span className="text-xs text-slate-400 font-sans ml-1">pages</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Narrative Arc & Mood Summary Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Story Arc Chart (Reused component with summary mode) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Dramatic Tension & Pacing Arc
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {arcData?.pacingSummary || 'Narrative pacing mapped across dramatic beats.'}
              </p>
            </div>
            {arcData?.climaxSceneId && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                Peak Climax Identified
              </span>
            )}
          </div>

          <StoryArcTab
            summary={true}
            initialData={arcData}
            documentId={pitch.documentId}
          />
        </div>

        {/* Mood & Emotional Landscape */}
        <div className="lg:col-span-1">
          <MoodSummaryCard moodSummary={moodSummary} className="h-full" />
        </div>
      </div>

      {/* ─── 4. Main Cast & Read-only Relationship Graph ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cast Roster */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              Core Ensemble Cast
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {mainCast?.length || 0} characters
            </span>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {mainCast && mainCast.length > 0 ? (
              mainCast.map((char) => (
                <div
                  key={char.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{char.name}</span>
                    <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[10px] font-semibold uppercase tracking-wider rounded-md capitalize">
                      {char.role}
                    </span>
                  </div>
                  {char.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {char.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No character entries available.</p>
            )}
          </div>
        </div>

        {/* Read-Only Relationships Network (Reused component with summary mode) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Character Relationship Graph
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Connection web and emotional polarity between prominent story figures.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {relationships?.length || 0} ties
            </span>
          </div>

          <RelationshipsTab
            summary={true}
            initialData={{
              characters: mainCast,
              relationships: relationships,
            }}
          />
        </div>
      </div>

      {/* ─── 5. Writer Snapshot & Public Profile Link ──────────────────────── */}
      {writerSnapshot && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {writerSnapshot.avatarUrl ? (
              <img
                src={writerSnapshot.avatarUrl}
                alt={writerSnapshot.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-serif font-bold text-xl flex items-center justify-center border-2 border-slate-200">
                {writerSnapshot.name?.[0] || 'W'}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/writer/${writerSnapshot.username}`}
                  className="text-lg font-serif font-bold text-slate-900 hover:text-[#FF500A] transition-colors"
                >
                  {writerSnapshot.name}
                </Link>
                <span className="text-xs text-slate-400 font-mono">@{writerSnapshot.username}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {writerSnapshot.publishingCadence}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl line-clamp-2">
                {writerSnapshot.bio || 'Author on SceneCraft with verified story analytics.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-1">
                <span>{writerSnapshot.otherPublishedBooksCount} other published titles</span>
                <span>•</span>
                <span>{writerSnapshot.followersCount} followers</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isFollowing
                  ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                  : 'bg-slate-900 hover:bg-[#FF500A] text-white shadow-2xs'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Follow Writer
                </>
              )}
            </button>
            <Link
              to={`/writer/${writerSnapshot.username}`}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublisherBookPitchPage;
