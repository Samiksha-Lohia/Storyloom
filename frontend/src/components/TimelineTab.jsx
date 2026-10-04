import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Clock, Calendar, AlertTriangle, ArrowRightLeft, BookOpen, MapPin } from 'lucide-react';

export default function TimelineTab({ documentId, source, options = {} }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [scenes, setScenes] = useState({});
  const [loading, setLoading] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [orderMode, setOrderMode] = useState('narrative'); // 'narrative' | 'chronological'

  useEffect(() => {
    loadData();
  }, [resolvedSource?.kind, resolvedSource?.id, JSON.stringify(options)]);

  const loadData = async () => {
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch scenes
      const sceneRes = await api.analysis.getScenes(resolvedSource, options).catch(() => []);
      const scenesList = sceneRes?.data?.results || sceneRes?.results || sceneRes?.data || sceneRes || [];
      const scenesMap = {};
      scenesList.forEach(s => {
        scenesMap[(s._id || s.id)?.toString()] = s;
      });
      setScenes(scenesMap);

      // 2. Fetch timeline events
      const eventsRes = await api.analysis.getTimeline(resolvedSource, options).catch(() => []);
      if (eventsRes?.analysisStatus) {
        setAnalysisStatus(eventsRes.analysisStatus);
      }
      const rawEvents = eventsRes?.data !== undefined ? eventsRes.data : eventsRes;
      const eventsList = Array.isArray(rawEvents) ? rawEvents : rawEvents?.results || [];
      setTimelineEvents(eventsList || []);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort timeline events based on selected mode
  const sortedEvents = [...timelineEvents].sort((a, b) => {
    const sIdA = (a.sceneId?._id || a.sceneId)?.toString();
    const sIdB = (b.sceneId?._id || b.sceneId)?.toString();
    const sceneA = scenes[sIdA];
    const sceneB = scenes[sIdB];

    if (orderMode === 'chronological') {
      return a.chronologicalOrder - b.chronologicalOrder;
    } else {
      // narrative order matches sceneNumber
      const numA = sceneA ? sceneA.sceneNumber : 0;
      const numB = sceneB ? sceneB.sceneNumber : 0;
      return numA - numB;
    }
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
        <div className="flex gap-4 overflow-x-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-72 h-64 bg-slate-100 rounded-2xl flex-shrink-0"></div>
          ))}
        </div>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-8">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Timeline not reconstructed yet</h3>
        <p className="text-sm text-slate-500 mt-1">Make sure the story timeline job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Story Timeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">Scrub through plot events. Chronological mode highlights flashbacks.</p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setOrderMode('narrative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              orderMode === 'narrative' 
                ? 'bg-white text-slate-950 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Narrative Order
          </button>
          <button
            onClick={() => setOrderMode('chronological')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              orderMode === 'chronological' 
                ? 'bg-white text-slate-950 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Chronological
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable timeline lane */}
      <div className="w-full overflow-x-auto flex gap-6 pb-6 pt-4 px-2 scrollbar-thin select-none snap-x">
        {sortedEvents.map((evt, idx) => {
          const scene = scenes[evt.sceneId];
          if (!scene) return null;

          return (
            <div 
              key={evt._id || evt.id} 
              className="w-72 flex-shrink-0 flex flex-col relative snap-start"
            >
              {/* Connector line */}
              {idx < sortedEvents.length - 1 && (
                <div className="absolute top-[38px] left-[260px] w-20 h-0.5 bg-slate-200 z-0 hidden sm:block" />
              )}

              {/* Time node marker dot */}
              <div className="flex items-center gap-2 mb-3 z-10">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                  evt.isFlashback 
                    ? 'bg-purple-100 border-purple-500 text-purple-700' 
                    : 'bg-white border-slate-900 text-slate-900'
                }`}>
                  {orderMode === 'chronological' ? evt.chronologicalOrder : scene.sceneNumber}
                </div>
                
                {evt.timeLabel && (
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {evt.timeLabel}
                  </span>
                )}
              </div>

              {/* Card info */}
              <div className={`flex-1 bg-white border p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                evt.isFlashback 
                  ? 'border-purple-200 ring-2 ring-purple-500/10' 
                  : 'border-slate-200'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Scene {scene.sceneNumber}
                    </span>
                    {evt.isFlashback && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-sm text-[8px] font-bold uppercase tracking-wider">
                        Flashback
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-serif font-bold text-slate-900 text-base leading-snug">
                    {scene.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-serif line-clamp-4">
                    {scene.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{scene.location || 'Unknown location'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
