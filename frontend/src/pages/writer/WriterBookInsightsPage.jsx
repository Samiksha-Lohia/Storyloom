import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Share2,
  Clock,
  Smile,
  TrendingUp,
  Search,
  MessageSquare,
  ShieldAlert,
  Eye,
  ExternalLink,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import ScenesTab from '../../components/ScenesTab';
import CharactersTab from '../../components/CharactersTab';
import RelationshipsTab from '../../components/RelationshipsTab';
import TimelineTab from '../../components/TimelineTab';
import OverviewTab from '../../components/OverviewTab';
import StoryArcTab from '../../components/StoryArcTab';
import SearchTab from '../../components/SearchTab';
import AskQuestionsTab from '../../components/AskQuestionsTab';
import ContinuityTab from '../../components/ContinuityTab';

const WRITER_TABS = [
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'relationships', label: 'Character Graph', icon: Share2 },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'mood', label: 'Mood & Tone', icon: Smile },
  { id: 'arc', label: 'Story Arc', icon: TrendingUp },
  { id: 'search', label: 'Semantic Search', icon: Search },
  { id: 'ask', label: 'Ask AI', icon: MessageSquare },
  { id: 'continuity', label: 'Continuity Checker', icon: ShieldAlert },
];

export function WriterBookInsightsPage() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [activeTab, setActiveTab] = useState('scenes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        setError('');
        const data = await api.books.getById(id);
        setBook(data);
      } catch (err) {
        setError(err.message || 'Failed to load book data.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadBook();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper max-w-5xl mx-auto my-8">
        Loading…
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-paper border border-rule rounded text-center space-y-4">
        <div className="w-12 h-12 border border-rule text-danger rounded flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-bold text-base text-ink">Unable to load insights</h2>
        <p className="text-xs text-muted">{error || 'Story not found.'}</p>
        <Link to="/w/books">
          <Button variant="secondary" size="sm">Back to My Books</Button>
        </Link>
      </div>
    );
  }

  const source = {
    kind: 'book',
    id: book._id || book.id,
    documentId: book.documentId?._id || book.documentId,
  };

  const options = { showAll: true };

  return (
    <div className="space-y-6 pb-16 text-left">
      {/* Header Bar */}
      <div className="bg-paper rounded border border-rule p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <Link
              to="/w/books"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Stories</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-rule text-muted">
                Author Analysis Suite
              </span>
              <Chip label={book.genre || 'General'} />
              {book.mature && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-rule text-muted">
                  18+
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-normal text-ink">
              {book.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span>📄 {book.pageCount || 0} Pages</span>
              <span>•</span>
              <span>Status: <strong className="text-ink uppercase text-[11px] font-bold">{book.status}</strong></span>
              <span>•</span>
              <span>Reads: {book.stats?.reads || 0}</span>
            </div>
          </div>

          {/* Action preview link */}
          <div className="flex items-center gap-3">
            <Link to={`/read/${book.id || book._id}`}>
              <Button variant="secondary" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                <span>Open in Reader</span>
              </Button>
            </Link>
            <Link to={`/book/${book.id || book._id}`}>
              <Button variant="ghost" size="sm" className="gap-2 text-ink hover:text-accent">
                <ExternalLink className="w-4 h-4" />
                <span>Public Page</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-rule overflow-x-auto" role="tablist">
          {WRITER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-ink text-paper border border-ink'
                    : 'text-muted hover:text-ink bg-paper border border-rule'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Workspace Card */}
      <div className="bg-paper rounded border border-rule p-6 sm:p-8">
        {activeTab === 'scenes' && (
          <ScenesTab source={source} options={options} />
        )}
        {activeTab === 'characters' && (
          <CharactersTab source={source} options={options} />
        )}
        {activeTab === 'relationships' && (
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
    </div>
  );
}

export default WriterBookInsightsPage;
