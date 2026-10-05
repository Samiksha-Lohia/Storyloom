import React, { useState } from 'react';
import {
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
  const isReader = !isWriterOwner && !isAdmin && !isPublisher;

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

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
  const isCurrentTabAllowed = currentTabObj.roleAllowed;

  const content = (
    <div
      className={`flex flex-col h-full bg-paper text-ink font-body ${
        inline ? 'rounded border border-rule' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-rule flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base leading-tight text-ink">
            Narrative Insights
          </h3>
          <p className="text-[11px] text-muted">
            {book?.title ? `Analysis for ${book.title}` : 'Story Breakdown & Insights'}
          </p>
        </div>

        {/* Close button if drawer */}
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded border border-rule hover:border-ink cursor-pointer text-ink"
            aria-label="Close insights drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Spoilers & Access Control Bar */}
      <div className="px-4 py-2 border-b border-rule flex flex-wrap items-center justify-between gap-3 text-xs bg-paper">
        <div className="flex items-center gap-2">
          {isReader ? (
            <>
              {showAll ? (
                <div className="flex items-center gap-1.5 text-accent font-bold">
                  <Eye className="w-4 h-4" />
                  <span>Spoilers revealed (showing full analysis)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted font-bold">
                  <EyeOff className="w-4 h-4 text-accent" />
                  <span>
                    Spoilers hidden up to page <strong className="text-ink font-bold">{displayPage}</strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-muted">
              <span className="font-bold text-ink uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded border border-rule">
                {isWriterOwner ? 'Author Mode' : isAdmin ? 'Admin Mode' : 'Publisher Mode'}
              </span>
              <span className="text-[11px]">
                {isPublisher
                  ? 'High-level summaries & character sheets'
                  : 'Full story analysis'}
              </span>
            </div>
          )}
        </div>

        {/* Reader Show All Toggle */}
        {isReader && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px] font-bold text-ink">Show everything</span>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4 accent-accent rounded cursor-pointer"
            />
          </label>
        )}
      </div>

      {/* Tabs Navigation Bar */}
      <div className="px-4 py-2 border-b border-rule flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-rule hover:border-ink hover:text-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper">
        {!bookId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <p className="text-sm font-bold">Loading…</p>
          </div>
        ) : !isCurrentTabAllowed ? (
          <div className="text-center py-12 px-4 border border-rule rounded max-w-md mx-auto">
            <ShieldAlert className="w-8 h-8 text-muted mx-auto mb-2" />
            <h4 className="font-bold text-sm text-ink">
              Access Restricted
            </h4>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Continuity analysis is reserved for the author and platform administrators.
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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full flex flex-col border-l border-rule bg-paper">
        {content}
      </div>
    </div>
  );
}

export default InsightsDrawer;

