import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME } from '../../constants/app';
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
  AlertCircle,
  Trash2
} from 'lucide-react';

export function PublisherBookPitchPage() {
  const { id: bookId } = useParams();
  const { user } = useAuth();
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const relationshipsData = useMemo(() => ({
    characters: pitch?.mainCast || [],
    relationships: pitch?.relationships || [],
  }), [pitch?.mainCast, pitch?.relationships]);

  useEffect(() => {
    loadPitch();
  }, [bookId]);

  const loadPitch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.pitch.get(bookId);
      setPitch(data);

      if (data?.writerSnapshot?.username) {
        try {
          const profile = await api.writers.getProfile(data.writerSnapshot.username);
          setIsFollowing(profile.isFollowing);
        } catch {
        }
      }

      if (user?.role === 'publisher') {
        try {
          const reqRes = await api.publishRequests.list({ limit: 50 });
          const reqList = reqRes?.data || [];
          const found = reqList.find(
            (r) => (r.bookId?._id || r.bookId)?.toString() === bookId.toString()
          );
          setActiveRequest(found || null);
        } catch {
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
      alert(err.message || 'Failed to generate pitch card.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleClearPitch = async () => {
    if (!window.confirm('Are you sure you want to clear this pitch deck?')) {
      return;
    }
    setClearing(true);
    try {
      await api.pitch.clear(bookId);
      setPitch((prev) => ({
        ...prev,
        pitchCard: null,
      }));
    } catch (err) {
      alert(err.message || 'Failed to clear pitch card.');
    } finally {
      setClearing(false);
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
      <div className="max-w-6xl mx-auto p-6 text-center text-xs text-muted border border-rule rounded bg-paper">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-paper border border-rule rounded text-center space-y-4">
        <div className="w-12 h-12 border border-rule text-danger rounded flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-ink text-base">Pitch Access Restricted</h3>
        <p className="text-xs text-muted leading-relaxed">{error}</p>
        <Link
          to="/p/discover"
          className="inline-block px-4 py-2 bg-ink text-paper rounded text-xs font-bold hover:opacity-90"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/p/discover"
            className="p-2 bg-paper border border-rule rounded hover:border-ink text-ink"
            aria-label="Back to discover"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Executive Pitch Panel
            </span>
            <h1 className="text-2xl md:text-3xl font-normal text-ink">
              {pitch.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StarWishlistButton
            bookId={pitch.bookId}
            size="lg"
            showLabel={true}
            inTalks={pitch.inTalks || activeRequest?.status === 'accepted'}
          />

          {user?.role === 'publisher' && (
            <>
              {activeRequest?.status === 'pending' ? (
                <span className="flex items-center gap-1.5 px-3.5 py-2.5 bg-paper text-ink border border-rule rounded text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Offer Pending
                </span>
              ) : activeRequest?.status === 'accepted' ? (
                <Link
                  to="/p/requests"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-paper text-success border border-rule hover:border-success rounded text-xs font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-success" />
                  In Talks (Open Chat)
                </Link>
              ) : activeRequest?.status === 'declined' &&
                activeRequest.cooldownUntil &&
                new Date(activeRequest.cooldownUntil) > new Date() ? (
                <span
                  className="flex items-center gap-1.5 px-3 py-2 bg-paper text-muted border border-rule rounded text-xs font-medium cursor-not-allowed"
                  title={`Declined. Cooldown until ${new Date(activeRequest.cooldownUntil).toLocaleDateString()}`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-muted" />
                  Declined (Cooldown)
                </span>
              ) : (
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-ink hover:opacity-90 text-paper rounded text-xs font-bold cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-accent" />
                  I want to publish
                </button>
              )}
            </>
          )}

          <Link
            to={`/read/${pitch.bookId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold"
          >
            <BookOpen className="w-4 h-4" />
            Read Full Manuscript
          </Link>
        </div>
      </div>

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

      <div className="bg-paper border border-rule rounded p-6 md:p-8 space-y-5 text-ink">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-paper border border-rule text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                AI Story Pitch
              </span>
              {pitchCard?.generatedAt && (
                <span className="text-xs text-muted">
                  Generated {new Date(pitchCard.generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {isOwnerOrAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || clearing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-paper hover:border-ink text-ink border border-rule cursor-pointer disabled:opacity-50"
                  title={pitchCard ? 'Regenerate pitch card (max 3 times/day)' : 'Generate AI pitch card'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Generating...' : pitchCard ? 'Regenerate Pitch' : 'Generate Pitch Deck'}
                </button>
                {pitchCard && (
                  <button
                    onClick={handleClearPitch}
                    disabled={clearing || regenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-danger border border-rule hover:border-danger bg-paper cursor-pointer disabled:opacity-50"
                    title="Clear AI pitch deck"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {clearing ? 'Clearing...' : 'Clear Pitch Deck'}
                  </button>
                )}
              </div>
            )}
          </div>

          {pitchCard ? (
            <>
              <blockquote className="text-base md:text-lg italic text-ink leading-relaxed max-w-4xl border-l-2 border-accent pl-4 font-body">
                "{pitchCard?.logline || 'A captivating journey of suspense, identity, and dramatic tension.'}"
              </blockquote>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-rule text-xs">
                <div className="bg-paper rounded p-3 border border-rule">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-1">
                    Primary Genre
                  </span>
                  <span className="font-bold text-ink text-xs">
                    {pitchCard?.genre || pitch.genre || 'General Fiction'}
                  </span>
                </div>

                <div className="bg-paper rounded p-3 border border-rule">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-1">
                    Narrative Tone
                  </span>
                  <span className="font-bold text-ink text-xs">
                    {pitchCard?.tone || 'Engaging & Expressive'}
                  </span>
                </div>

                <div className="bg-paper rounded p-3 border border-rule">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-1">
                    Target Audience
                  </span>
                  <span className="font-bold text-ink text-xs">
                    {pitchCard?.targetAudience || 'Enthusiasts of character-driven drama'}
                  </span>
                </div>

                <div className="bg-paper rounded p-3 border border-rule">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-1">
                    Comparative Titles
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(pitchCard?.forFansOf || ['Modern Drama', 'Literary Fiction']).map((comp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-paper border border-rule text-ink text-[11px]"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center border border-dashed border-rule rounded p-6">
              <Sparkles className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-ink">No AI Story Pitch generated yet</p>
              <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                {isOwnerOrAdmin
                  ? 'Click "Generate Pitch Deck" to create an executive pitch card.'
                  : 'The author has not yet generated an AI pitch card for this manuscript.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Audience Traction & Market Signals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-muted" /> Reads
            </span>
            <span className="text-lg font-bold text-ink">
              {traction?.reads || 0}
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-accent fill-accent" /> Rating
            </span>
            <span className="text-lg font-bold text-ink">
              ★ {Number(traction?.ratingAvg || 0).toFixed(1)}
              <span className="text-xs text-muted font-normal ml-1">
                ({traction?.ratingCount || 0})
              </span>
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Completion
            </span>
            <span className="text-lg font-bold text-ink">
              {traction?.completionRate || 0}%
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-muted" /> List Adds
            </span>
            <span className="text-lg font-bold text-ink">
              {traction?.readingListAdds || 0}
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-accent" /> Wishlisted
            </span>
            <span className="text-lg font-bold text-ink">
              {traction?.wishlistCount || 0}
              <span className="text-[10px] text-muted block mt-0.5 font-normal">
                publishers
              </span>
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-muted" /> Length
            </span>
            <span className="text-lg font-bold text-ink">
              {pitch.pageCount || 1}
              <span className="text-xs text-muted font-normal ml-1">pages</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-paper border border-rule rounded p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-sm">
                Dramatic Tension & Pacing Arc
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {arcData?.pacingSummary || 'Narrative pacing mapped across dramatic beats.'}
              </p>
            </div>
            {arcData?.climaxSceneId && (
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-paper text-accent border border-rule">
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

        <div className="lg:col-span-1">
          <MoodSummaryCard moodSummary={moodSummary} className="h-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-paper border border-rule rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              Core Ensemble Cast
            </h3>
            <span className="text-xs text-muted">
              {mainCast?.length || 0} characters
            </span>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {mainCast && mainCast.length > 0 ? (
              mainCast.map((char) => (
                <div
                  key={char.id}
                  className="p-3 rounded border border-rule bg-paper space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-xs">{char.name}</span>
                    <span className="px-2 py-0.5 bg-paper text-muted border border-rule text-[10px] font-bold uppercase tracking-wider rounded capitalize">
                      {char.role}
                    </span>
                  </div>
                  {char.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {char.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted italic">No character entries available.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-paper border border-rule rounded p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-sm">
                Character Relationship Graph
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Connection web and emotional polarity between prominent story figures.
              </p>
            </div>
            <span className="text-xs text-muted">
              {relationships?.length || 0} ties
            </span>
          </div>

          <RelationshipsTab
            summary={true}
            initialData={{ relationships, characters: mainCast }}
          />
        </div>
      </div>

      {writerSnapshot && (
        <div className="bg-paper border border-rule rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {writerSnapshot.avatarUrl ? (
              <img
                src={writerSnapshot.avatarUrl}
                alt={writerSnapshot.name}
                className="w-14 h-14 rounded object-cover border border-rule"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-paper text-ink font-bold text-lg flex items-center justify-center border border-rule">
                {writerSnapshot.name?.[0] || 'W'}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/writer/${writerSnapshot.username}`}
                  className="text-base font-bold text-ink hover:text-accent"
                >
                  {writerSnapshot.name}
                </Link>
                <span className="text-xs text-muted">@{writerSnapshot.username}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted">
                  {writerSnapshot.publishingCadence}
                </span>
              </div>
              <p className="text-xs text-muted max-w-xl line-clamp-2">
                {writerSnapshot.bio || `Author on ${APP_NAME} with verified story analytics.`}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted font-normal pt-1">
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
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold border cursor-pointer ${
                isFollowing
                  ? 'bg-paper hover:border-danger text-ink hover:text-danger border-rule'
                  : 'bg-accent hover:bg-accent-hover text-paper border-accent'
              }`}
            >
              {isFollowing ? (
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
            <Link
              to={`/writer/${writerSnapshot.username}`}
              className="px-4 py-2 bg-paper hover:border-ink text-ink rounded text-xs font-bold border border-rule"
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
