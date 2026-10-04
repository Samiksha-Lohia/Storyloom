import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Users,
  Share2,
  Clock,
  Smile,
  TrendingUp,
  Search,
  MessageSquare,
  ShieldAlert,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CharactersTab from '../CharactersTab';
import RelationshipsTab from '../RelationshipsTab';
import TimelineTab from '../TimelineTab';
import OverviewTab from '../OverviewTab';
import StoryArcTab from '../StoryArcTab';
import SearchTab from '../SearchTab';
import AskQuestionsTab from '../AskQuestionsTab';
import ContinuityTab from '../ContinuityTab';

export function InsightsDrawer({
  isOpen = true,
  onClose,
  book,
  currentPage = 1,
  furthestPage = 1,
  theme = 'light',
  inline = false,
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('characters');
  const [showAll, setShowAll] = useState(false);

  // Determine user role relative to this book
  const isWriterOwner = Boolean(
    user && book && (book.writerId?._id || book.writerId)?.toString() === (user.id || user._id)?.toString()
  );
  const isAdmin = user?.role === 'admin';
  const isPublisher = user?.role === 'publisher';
  const isReader = !isWriterOwner && !isAdmin && !isPublisher; // readers and guests

  const bookId = book?._id || book?.id;
  const source = { kind: 'book', id: bookId };

  // Page cutoff for spoilers: furthest read page, or currentPage
  const displayPage = Math.max(1, furthestPage || currentPage || 1);
  const options = {
    upto: displayPage,
    showAll: showAll,
  };

  const tabs = [
    { id: 'characters', label: 'Characters', icon: Users, roleAllowed: true },
    { id: 'graph', label: 'Graph', icon: Share2, roleAllowed: true },
    { id: 'timeline', label: 'Timeline', icon: Clock, roleAllowed: true },
    { id: 'mood', label: 'Mood', icon: Smile, roleAllowed: true },
    { id: 'arc', label: 'Arc', icon: TrendingUp, roleAllowed: true },
    { id: 'search', label: 'Search', icon: Search, roleAllowed: true },
    { id: 'ask', label: 'Ask AI', icon: MessageSquare, roleAllowed: true },
    {
      id: 'continuity',
      label: 'Continuity',
      icon: ShieldAlert,
      roleAllowed: isWriterOwner || isAdmin,
    },
  ];

  if (!isOpen && !inline) return null;

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: 'bg-[#1E1E22]',
          text: 'text-[#E0E0E0]',
          border: 'border-[#2E2E34]',
          cardBg: 'bg-[#2A2A32]',
          tabActive: 'bg-[#FF500A] text-white',
          tabInactive: 'text-stone-400 hover:text-white hover:bg-[#2A2A32]',
          bannerBg: 'bg-[#2A2A32]/90 border-[#3E3E48]',
        };
      case 'sepia':
        return {
          bg: 'bg-[#F4ECD8]',
          text: 'text-[#382C1E]',
          border: 'border-[#DECFA7]',
          cardBg: 'bg-[#FAF4E6]',
          tabActive: 'bg-[#FF500A] text-white',
          tabInactive: 'text-[#7D6B53] hover:text-[#382C1E] hover:bg-[#EAE0C7]',
          bannerBg: 'bg-[#EAE0C7]/90 border-[#DECFA7]',
        };
      default:
        return {
          bg: 'bg-white',
          text: 'text-stone-900',
          border: 'border-stone-200',
          cardBg: 'bg-stone-50',
          tabActive: 'bg-[#FF500A] text-white shadow-xs',
          tabInactive: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
          bannerBg: 'bg-stone-50 border-stone-200',
        };
    }
  };

  const styles = getThemeStyles();
  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
  const isCurrentTabAllowed = currentTabObj.roleAllowed;

  // Render Drawer or Inline
  const content = (
    <div
      className={`flex flex-col h-full ${styles.bg} ${styles.text} ${
        inline ? 'rounded-2xl border ' + styles.border : ''
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 ${styles.border}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] text-[#FF500A] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg leading-tight">
              Narrative Insights
            </h3>
            <p className="text-[11px] text-stone-500">
              {book?.title ? `Analysis for ${book.title}` : 'Story Breakdown & Insights'}
            </p>
          </div>
        </div>

        {/* Top Controls: Close button if drawer */}
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200/50 transition cursor-pointer text-stone-500 hover:text-stone-900"
            aria-label="Close insights drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Spoilers & Access Control Bar */}
      <div className={`px-4 sm:px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${styles.bannerBg}`}>
        <div className="flex items-center gap-2">
          {isReader ? (
            <>
              {showAll ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Eye className="w-4 h-4" />
                  <span>Spoilers revealed (showing full manuscript analysis)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                  <EyeOff className="w-4 h-4 text-[#FF500A]" />
                  <span>
                    Spoilers hidden up to page <strong className="text-stone-900 font-bold">{displayPage}</strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-600">
              <span className="font-semibold text-stone-800 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-stone-200/70">
                {isWriterOwner ? 'Author Mode' : isAdmin ? 'Admin Mode' : 'Publisher Mode'}
              </span>
              <span className="text-[11px] text-stone-500">
                {isPublisher
                  ? 'High-level summaries & character sheets'
                  : 'Unrestricted full story analysis'}
              </span>
            </div>
          )}
        </div>

        {/* Reader Show All Toggle */}
        {isReader && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px] font-semibold text-stone-600">Show everything</span>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4 accent-[#FF500A] rounded cursor-pointer"
            />
          </label>
        )}
      </div>

      {/* Tabs Navigation Bar */}
      <div className={`px-4 sm:px-5 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar ${styles.border}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? styles.tabActive : styles.tabInactive
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {!bookId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF500A] mb-3" />
            <p className="text-sm font-semibold">Loading book analysis...</p>
          </div>
        ) : !isCurrentTabAllowed ? (
          <div className="text-center py-16 px-4 bg-stone-50 border border-stone-200 rounded-2xl max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h4 className="font-heading font-bold text-base text-stone-800">
              Access Restricted
            </h4>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Continuity analysis is reserved for the author and platform administrators to resolve manuscript conflicts before publishing.
            </p>
          </div>
        ) : (
          <div className="insights-tab-content">
            {activeTab === 'characters' && (
              <CharactersTab source={source} options={options} />
            )}
            {activeTab === 'graph' && (
              <RelationshipsTab source={source} options={options} />
            )}
            {activeTab === 'timeline' && (
              <TimelineTab source={source} options={options} />
            )}
            {activeTab === 'mood' && (
              <OverviewTab source={source} options={options} />
            )}
            {activeTab === 'arc' && (
              <StoryArcTab source={source} options={options} />
            )}
            {activeTab === 'search' && (
              <SearchTab source={source} options={options} />
            )}
            {activeTab === 'ask' && (
              <AskQuestionsTab source={source} options={options} />
            )}
            {activeTab === 'continuity' && (
              <ContinuityTab source={source} options={options} />
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-fade-in">
      <div
        className={`w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full flex flex-col border-l shadow-2xl transition-all ${styles.border}`}
      >
        {content}
      </div>
    </div>
  );
}

export default InsightsDrawer;
