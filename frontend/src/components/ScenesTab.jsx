import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Users, MapPin, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

export default function ScenesTab({ 
  documentId,
  source,
  options = {},
  scenes: propScenes, 
  dialogues: propDialogues = {}, 
  moods: propMoods = {}, 
  characters: propCharacters = {},
  loading: propLoading,
  page: propPage = 1,
  totalPages: propTotalPages = 1,
  setPage
}) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);

  const [fetchedScenes, setFetchedScenes] = useState([]);
  const [fetchedDialogues, setFetchedDialogues] = useState({});
  const [fetchedCharacters, setFetchedCharacters] = useState({});
  const [fetchedMoods, setFetchedMoods] = useState({});
  const [loading, setLoading] = useState(
    propLoading !== undefined ? propLoading : Boolean(resolvedSource?.id && !propScenes)
  );
  const [expandedSceneId, setExpandedSceneId] = useState(null);

  useEffect(() => {
    if (propScenes && propScenes.length > 0) return;
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await api.analysis.getScenes(resolvedSource, stableOptions);
        if (isCancelled) return;
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.results || []);
        setFetchedScenes(list);
      } catch (err) {
        console.error('Failed to load scenes:', err);
        if (!isCancelled) setFetchedScenes([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey, Boolean(propScenes?.length)]);

  useEffect(() => {
    if (!resolvedSource?.id) return;
    let isCancelled = false;

    (async () => {
      try {
        const [dialogueRes, charRes, moodRes] = await Promise.allSettled([
          api.analysis.getDialogue ? api.analysis.getDialogue(resolvedSource, stableOptions) : Promise.resolve([]),
          api.analysis.getCharacters ? api.analysis.getCharacters(resolvedSource, { showAll: true, limit: 100 }) : Promise.resolve([]),
          api.analysis.getMood ? api.analysis.getMood(resolvedSource, stableOptions) : Promise.resolve([]),
        ]);

        if (isCancelled) return;

        if (dialogueRes.status === 'fulfilled' && dialogueRes.value) {
          const raw = dialogueRes.value?.data !== undefined ? dialogueRes.value.data : dialogueRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.results || []);
          const grouped = {};
          list.forEach((item) => {
            const sId = (item.sceneId?._id || item.sceneId)?.toString();
            if (sId) {
              if (!grouped[sId]) grouped[sId] = [];
              grouped[sId].push(item);
            }
          });
          setFetchedDialogues(grouped);
        }

        if (charRes.status === 'fulfilled' && charRes.value) {
          const raw = charRes.value?.data !== undefined ? charRes.value.data : charRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.results || []);
          const map = {};
          list.forEach((c) => {
            const cId = (c._id || c.id)?.toString();
            if (cId) map[cId] = c;
          });
          setFetchedCharacters(map);
        }

        if (moodRes.status === 'fulfilled' && moodRes.value) {
          const raw = moodRes.value?.data !== undefined ? moodRes.value.data : moodRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.results || []);
          const map = {};
          list.forEach((m) => {
            const sId = (m.sceneId?._id || m.sceneId)?.toString();
            if (sId) map[sId] = m;
          });
          setFetchedMoods(map);
        }
      } catch (err) {
        console.error('Failed to load dialogue/characters:', err);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey]);

  const scenes = propScenes || fetchedScenes;
  const dialogues = Object.keys(propDialogues || {}).length > 0 ? propDialogues : fetchedDialogues;
  const moods = Object.keys(propMoods || {}).length > 0 ? propMoods : fetchedMoods;
  const characters = Object.keys(propCharacters || {}).length > 0 ? propCharacters : fetchedCharacters;
  const page = propPage;
  const totalPages = propTotalPages;

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

              {isExpanded && (
                <div className="bg-paper border-t border-rule p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Dialogue Subtext &amp; Cadence Analysis
                    </h4>
                    {sceneDialogues.length > 0 && (
                      <span className="text-[11px] text-muted font-medium">
                        {sceneDialogues.length} character perspective{sceneDialogues.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {sceneDialogues.length === 0 ? (
                    <p className="text-xs text-muted">No dialogue subtext or cadence analyzed for this scene yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {sceneDialogues.map((d) => {
                        const charId = (d.characterId?._id || d.characterId)?.toString();
                        const speakerName = characters[charId]?.name || d.characterId?.name || 'Unknown Speaker';
                        return (
                          <div key={d._id || d.id} className="bg-paper border border-rule rounded-md p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                                {speakerName}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {d.tone && (
                                  <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent rounded text-[10px] font-bold uppercase tracking-wider">
                                    Tone: {d.tone}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 border border-rule text-muted rounded text-[9px] font-medium uppercase tracking-wider">
                                  Cadence &amp; Subtext
                                </span>
                              </div>
                            </div>

                            {d.summaryText && (
                              <div className="bg-rule/10 rounded p-2.5 text-xs text-ink space-y-1">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                                  Subtext &amp; Dynamic
                                </span>
                                <p className="italic leading-relaxed">&ldquo;{d.summaryText}&rdquo;</p>
                              </div>
                            )}

                            {d.keyQuotes && d.keyQuotes.length > 0 && (
                              <div className="space-y-1 pt-0.5">
                                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                                  Key Lines
                                </span>
                                <div className="border-l-2 border-accent/40 pl-3 space-y-1">
                                  {d.keyQuotes.map((quote, qidx) => (
                                    <p key={qidx} className="text-xs text-ink/80 font-mono">
                                      &ldquo;{quote}&rdquo;
                                    </p>
                                  ))}
                                </div>
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
