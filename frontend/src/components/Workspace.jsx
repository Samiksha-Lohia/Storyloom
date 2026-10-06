import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import OverviewTab from './OverviewTab';
import ScenesTab from './ScenesTab';
import CharactersTab from './CharactersTab';
import RelationshipsTab from './RelationshipsTab';
import TimelineTab from './TimelineTab';
import StoryArcTab from './StoryArcTab';
import AskQuestionsTab from './AskQuestionsTab';

import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  GitFork, 
  Clock, 
  BarChart2, 
  ShieldAlert, 
  Edit2, 
  Check, 
  LayoutDashboard,
  MessageSquare
} from 'lucide-react';

export default function Workspace({ documentId, onBack }) {
  const [doc, setDoc] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDoc();
  }, [documentId]);

  const loadDoc = async () => {
    try {
      const data = await api.documents.getById(documentId);
      setDoc(data);
      setEditedTitle(data.title);
    } catch (err) {
      console.error('Failed to load document info:', err);
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === doc.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const updated = await api.documents.updateTitle(documentId, editedTitle);
      setDoc(prev => ({ ...prev, title: updated.title }));
      setIsEditingTitle(false);
    } catch (err) {
      alert(`Failed to update title: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'scenes', label: 'Scenes Explorer', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'characters', label: 'Characters', icon: <Users className="w-4 h-4" /> },
    { id: 'relationships', label: 'Relationships', icon: <GitFork className="w-4 h-4" /> },
    { id: 'timeline', label: 'Story Timeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'arc', label: 'Story Arc', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'ask', label: 'Ask Questions', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col text-ink">
      {/* Workspace Header */}
      <header className="w-full bg-paper border-b border-rule px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4 max-w-[60%]">
          <button 
            onClick={onBack}
            className="p-1.5 border border-rule hover:bg-rule/10 rounded text-muted hover:text-ink cursor-pointer"
            title="Back to library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 overflow-hidden">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  onBlur={handleSaveTitle}
                  autoFocus
                  className="px-2 py-1 border border-rule rounded text-base font-bold text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
                <button onClick={handleSaveTitle} className="p-1 text-ink hover:text-accent rounded cursor-pointer">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-lg font-bold text-ink truncate max-w-[400px]">
                  {doc?.title || 'Loading Story...'}
                </h1>
                <Edit2 className="w-3.5 h-3.5 text-muted hover:text-ink" />
              </div>
            )}
            <span className="hidden sm:inline-block px-2 py-0.5 border border-rule text-muted rounded text-[10px] uppercase font-semibold">
              {doc?.fileType}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-paper border-r border-rule p-4 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-3 mb-2">Notebook Tabs</p>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-ink text-paper' 
                    : 'text-muted hover:text-ink hover:bg-rule/10'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom user card or badge */}
          <div className="p-3 border-t border-rule flex items-center gap-3">
            <div className="w-7 h-7 rounded border border-rule flex items-center justify-center font-bold text-[10px] text-ink">
              SL
            </div>
            <div className="text-left overflow-hidden">
              <span className="block text-xs font-semibold text-ink truncate">{doc?.title}</span>
              <span className="block text-[10px] text-muted uppercase font-mono">{doc?.wordCount || 0} words</span>
            </div>
          </div>
        </aside>

        {/* Content Sheet */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-paper relative">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && <OverviewTab documentId={documentId} />}
            {activeTab === 'scenes' && <ScenesTab documentId={documentId} />}
            {activeTab === 'characters' && <CharactersTab documentId={documentId} />}
            {activeTab === 'relationships' && <RelationshipsTab documentId={documentId} />}
            {activeTab === 'timeline' && <TimelineTab documentId={documentId} />}
            {activeTab === 'arc' && <StoryArcTab documentId={documentId} />}
            {activeTab === 'ask' && <AskQuestionsTab documentId={documentId} />}
          </div>
        </main>

      </div>
    </div>
  );
}
