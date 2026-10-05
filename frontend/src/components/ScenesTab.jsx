import React, { useState } from 'react';
import { BookOpen, Users, MapPin, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export default function ScenesTab({ 
  scenes = [], 
  dialogues = {}, 
  moods = {}, 
  characters = {},
  loading,
  page = 1,
  totalPages = 1,
  setPage
}) {
  const [expandedSceneId, setExpandedSceneId] = useState(null);

  const getMoodColor = (mood) => {
    const m = mood?.toLowerCase();
    if (m === 'tense' || m === 'angry' || m === 'confrontational') {
      return 'border-danger text-danger';
    }
    if (m === 'joyful' || m === 'cheerful') {
      return 'border-success text-success';
    }
    if (m === 'melancholy' || m === 'mysterious' || m === 'romantic') {
      return 'border-muted text-ink';
    }
    return 'border-rule text-muted';
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="text-center py-16 bg-paper border border-rule rounded p-8">
        <BookOpen className="w-8 h-8 text-muted mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink">No scenes detected yet</h3>
        <p className="text-xs text-muted mt-1">Make sure the scene breakdown analysis job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Scenes Explorer</h2>
          <p className="text-xs text-muted mt-0.5">Browse your manuscript segmented into chapters and scenes.</p>
        </div>
        <div className="text-xs font-semibold text-muted">
          Showing {scenes.length} scenes (Page {page} of {totalPages})
        </div>
      </div>

      {/* Scenes List */}
      <div className="space-y-4">
        {scenes.map((scene) => {
          const sceneId = scene._id || scene.id;
          const mood = moods[sceneId];
          const sceneDialogues = dialogues[sceneId] || [];
          const isExpanded = expandedSceneId === sceneId;

          return (
            <div 
              key={sceneId}
              className="bg-paper border border-rule rounded overflow-hidden text-left"
            >
              {/* Card Header clickable to expand */}
              <div 
                onClick={() => setExpandedSceneId(isExpanded ? null : sceneId)}
                className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer hover:bg-rule/10"
              >
                <div className="space-y-2.5 max-w-[85%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-ink text-paper rounded text-[10px] uppercase font-bold tracking-wider">
                      Scene {scene.sceneNumber}
                    </span>
                    {scene.location && (
                      <span className="flex items-center gap-1 text-xs text-muted font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted" />
                        {scene.location}
                      </span>
                    )}
                    {mood && (
                      <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider ${getMoodColor(mood.primaryMood)}`}>
                        {mood.primaryMood} (Int: {Math.round(mood.intensity * 100)}%)
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-ink">{scene.title}</h3>
                  <p className="text-sm text-ink leading-relaxed">{scene.summary}</p>
                  
                  {/* Cast presence list */}
                  {scene.characterIds && scene.characterIds.length > 0 && (
                    <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                      <Users className="w-3.5 h-3.5 text-muted" />
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider">Cast:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scene.characterIds.map((charId) => {
                          const char = characters[charId];
                          if (!char) return null;
                          return (
                            <span 
                              key={charId}
                              className="px-2 py-0.5 bg-paper text-ink rounded text-xs font-medium border border-rule"
                            >
                              {char.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button className="p-1 text-muted hover:text-ink self-start sm:self-center cursor-pointer">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded details containing Dialogue Summaries */}
              {isExpanded && (
                <div className="bg-paper border-t border-rule p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Dialogue Insights
                  </h4>

                  {sceneDialogues.length === 0 ? (
                    <p className="text-xs text-muted">No dialogue snippets analyzed for this scene.</p>
                  ) : (
                    <div className="space-y-3">
                      {sceneDialogues.map((d) => {
                        const speakerName = characters[d.characterId]?.name || 'Unknown Speaker';
                        return (
                          <div key={d._id || d.id} className="bg-paper border border-rule rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-ink">{speakerName}</span>
                              {d.tone && (
                                <span className="px-1.5 py-0.5 border border-rule text-muted rounded text-[9px] font-bold uppercase tracking-wider">
                                  {d.tone}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink italic">&ldquo;{d.summaryText}&rdquo;</p>
                            
                            {/* Key Quotes if present */}
                            {d.keyQuotes && d.keyQuotes.length > 0 && (
                              <div className="border-l-2 border-rule pl-3 mt-2 space-y-1">
                                {d.keyQuotes.map((quote, qidx) => (
                                  <p key={qidx} className="text-xs text-muted">
                                    &ldquo;{quote}&rdquo;
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-paper border border-rule text-ink rounded text-xs font-semibold disabled:opacity-40 hover:bg-rule/10 cursor-pointer"
          >
            Prev
          </button>
          <span className="text-xs text-muted font-semibold">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-paper border border-rule text-ink rounded text-xs font-semibold disabled:opacity-40 hover:bg-rule/10 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
