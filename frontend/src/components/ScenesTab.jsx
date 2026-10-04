import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BookOpen, MapPin, Users, Smile, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

export default function ScenesTab({ documentId, source, options = {} }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [scenes, setScenes] = useState([]);
  const [characters, setCharacters] = useState({});
  const [moods, setMoods] = useState({});
  const [dialogues, setDialogues] = useState({});
  const [expandedSceneId, setExpandedSceneId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadInitialData();
  }, [resolvedSource?.kind, resolvedSource?.id, page, JSON.stringify(options)]);

  const loadInitialData = async () => {
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch characters to map IDs to names
      const charsRes = await api.analysis.getCharacters(resolvedSource, options).catch(() => []);
      const charsList = charsRes?.data !== undefined ? (Array.isArray(charsRes.data) ? charsRes.data : charsRes.data?.results || []) : (Array.isArray(charsRes) ? charsRes : charsRes?.results || []);
      const charsMap = {};
      charsList.forEach(c => {
        charsMap[c._id || c.id] = c;
      });
      setCharacters(charsMap);

      // 2. Fetch moods to map to scenes
      const moodsRes = await api.analysis.getMood(resolvedSource, options).catch(() => []);
      const moodsList = moodsRes?.data !== undefined ? (Array.isArray(moodsRes.data) ? moodsRes.data : moodsRes.data?.results || []) : (Array.isArray(moodsRes) ? moodsRes : moodsRes?.results || []);
      const moodsMap = {};
      moodsList.forEach(m => {
        if (m.sceneId) {
          const sId = (m.sceneId._id || m.sceneId).toString();
          moodsMap[sId] = m;
        }
      });
      setMoods(moodsMap);

      // 3. Fetch dialogue summaries (if available for document)
      if (resolvedSource.kind === 'document') {
        const dialogueList = await api.story.getDialogue(resolvedSource.id).catch(() => []);
        const dialogueMap = {};
        (dialogueList || []).forEach(d => {
          if (!dialogueMap[d.sceneId]) {
            dialogueMap[d.sceneId] = [];
          }
          dialogueMap[d.sceneId].push(d);
        });
        setDialogues(dialogueMap);
      }

      // 4. Fetch scenes for the source
      const sceneRes = await api.analysis.getScenes(resolvedSource, { ...options, page, limit });
      if (sceneRes?.analysisStatus) {
        setAnalysisStatus(sceneRes.analysisStatus);
      }
      const rawScenes = sceneRes?.data !== undefined ? sceneRes.data : sceneRes;
      const items = Array.isArray(rawScenes) ? rawScenes : rawScenes?.results || [];
      const pagination = sceneRes?.pagination || sceneRes?.data?.pagination;
      setScenes(items);
      setTotalPages(pagination?.pages || pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load scenes data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (moodName) => {
    if (!moodName) return 'bg-slate-100 border-slate-200 text-slate-700';
    const m = moodName.toLowerCase();
    if (m === 'hopeful') {
      return 'bg-green-50 border-green-200 text-green-700';
    }
    if (m === 'tense') {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    if (m === 'melancholy') {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }
    if (m === 'romantic') {
      return 'bg-rose-50 border-rose-200 text-rose-750';
    }
    if (m === 'mysterious') {
      return 'bg-purple-50 border-purple-200 text-purple-700';
    }
    return 'bg-slate-50 border-slate-200 text-slate-600';
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl w-full"></div>
        ))}
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-8">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">No scenes detected yet</h3>
        <p className="text-sm text-slate-500 mt-1">Make sure the scene breakdown analysis job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Scenes Explorer</h2>
          <p className="text-xs text-slate-500 mt-0.5">Browse your manuscript segmented into chapters and scenes.</p>
        </div>
        <div className="text-xs font-semibold text-slate-500">
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
              className="bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-all overflow-hidden text-left"
            >
              {/* Card Header clickable to expand */}
              <div 
                onClick={() => setExpandedSceneId(isExpanded ? null : sceneId)}
                className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-2.5 max-w-[85%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-950 text-white rounded-md text-[10px] uppercase font-bold tracking-wider font-mono">
                      Scene {scene.sceneNumber}
                    </span>
                    {scene.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {scene.location}
                      </span>
                    )}
                    {mood && (
                      <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${getMoodColor(mood.primaryMood)}`}>
                        {mood.primaryMood} (Int: {Math.round(mood.intensity * 100)}%)
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-serif font-bold text-slate-900">{scene.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-serif">{scene.summary}</p>
                  
                  {/* Cast presence list */}
                  {scene.characterIds && scene.characterIds.length > 0 && (
                    <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cast:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scene.characterIds.map((charId) => {
                          const char = characters[charId];
                          if (!char) return null;
                          return (
                            <span 
                              key={charId}
                              className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200"
                            >
                              {char.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors self-start sm:self-center">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* Expanded details containing Dialogue Summaries */}
              {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Dialogue Insights
                  </h4>

                  {sceneDialogues.length === 0 ? (
                    <p className="text-xs text-slate-400">No dialogue snippets analyzed for this scene.</p>
                  ) : (
                    <div className="space-y-4">
                      {sceneDialogues.map((d) => {
                        const speakerName = characters[d.characterId]?.name || 'Unknown Speaker';
                        return (
                          <div key={d._id || d.id} className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{speakerName}</span>
                              {d.tone && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-sm text-[9px] font-bold uppercase tracking-wider font-mono">
                                  {d.tone}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 italic font-serif">"{d.summaryText}"</p>
                            
                            {/* Key Quotes if present */}
                            {d.keyQuotes && d.keyQuotes.length > 0 && (
                              <div className="border-l-2 border-slate-200 pl-3 mt-2 space-y-1">
                                {d.keyQuotes.map((quote, qidx) => (
                                  <p key={qidx} className="text-xs text-slate-500 font-serif">
                                    “{quote}”
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
            className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500 font-semibold">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
