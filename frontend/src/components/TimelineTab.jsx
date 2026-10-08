import React, { useState, useEffect, useMemo } from 'react';
import { Clock, BookOpen, Calendar, MapPin } from 'lucide-react';
import { api } from '../services/api';

export default function TimelineTab({ 
  documentId,
  source,
  options = {},
  timelineEvents: initialEvents = null, 
  scenes: initialScenes = null, 
  loading: initialLoading,
}) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);

  const [timelineEvents, setTimelineEvents] = useState(initialEvents || []);
  const [scenes, setScenes] = useState(initialScenes || {});
  const [loading, setLoading] = useState(
    initialLoading !== undefined
      ? initialLoading
      : (!initialEvents?.length && Boolean(resolvedSource?.id))
  );
  const [orderMode, setOrderMode] = useState('narrative');

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setTimelineEvents(initialEvents);
      if (initialScenes) setScenes(initialScenes);
      setLoading(false);
      return;
    }
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [timelineRes, sceneRes] = await Promise.all([
          api.analysis.getTimeline(resolvedSource, stableOptions).catch(() => []),
          api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []),
        ]);

        if (isCancelled) return;

        const rawEvents = timelineRes?.data !== undefined ? timelineRes.data : timelineRes;
        const eventsList = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.results || rawEvents?.events || []);
        setTimelineEvents(eventsList);

        const rawScenes = sceneRes?.data !== undefined ? sceneRes.data : sceneRes;
        const scenesList = Array.isArray(rawScenes) ? rawScenes : (rawScenes?.results || []);
        const scenesMap = {};
        scenesList.forEach((s) => {
          scenesMap[(s._id || s.id)?.toString()] = s;
        });
        setScenes(scenesMap);
      } catch (err) {
        console.error('Failed to load timeline:', err);
        if (!isCancelled) setTimelineEvents([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey, Boolean(initialEvents?.length)]);

  const sortedEvents = [...timelineEvents].sort((a, b) => {
    if (orderMode === 'chronological') {
      return (a.chronologicalOrder || 0) - (b.chronologicalOrder || 0);
    } else {
      const sceneA = (typeof a.sceneId === 'object' && a.sceneId) ? a.sceneId : (scenes[a.sceneId] || scenes[(a.sceneId?._id || a.sceneId)?.toString()]);
      const sceneB = (typeof b.sceneId === 'object' && b.sceneId) ? b.sceneId : (scenes[b.sceneId] || scenes[(b.sceneId?._id || b.sceneId)?.toString()]);
      const numA = sceneA ? sceneA.sceneNumber : (a.chronologicalOrder || 0);
      const numB = sceneB ? sceneB.sceneNumber : (b.chronologicalOrder || 0);
      return numA - numB;
    }
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-16 bg-paper border border-rule rounded p-8">
        <Clock className="w-8 h-8 text-muted mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink">Timeline not reconstructed yet</h3>
        <p className="text-xs text-muted mt-1">Make sure the story timeline job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Story Timeline</h2>
          <p className="text-xs text-muted mt-0.5">Scrub through plot events. Chronological mode highlights flashbacks.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto border border-rule p-1 rounded">
          <button
            onClick={() => setOrderMode('narrative')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              orderMode === 'narrative' 
                ? 'bg-ink text-paper' 
                : 'text-muted hover:text-ink'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Narrative Order
          </button>
          <button
            onClick={() => setOrderMode('chronological')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              orderMode === 'chronological' 
                ? 'bg-ink text-paper' 
                : 'text-muted hover:text-ink'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Chronological
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto flex gap-6 pb-6 pt-4 px-2 select-none snap-x">
        {sortedEvents.map((evt, idx) => {
          const rawScene = (typeof evt.sceneId === 'object' && evt.sceneId !== null)
            ? evt.sceneId
            : (scenes[evt.sceneId] || scenes[(evt.sceneId?._id || evt.sceneId)?.toString()] || evt.scene);
          const scene = rawScene || {
            sceneNumber: idx + 1,
            title: evt.title || evt.label || `Event ${idx + 1}`,
            summary: evt.description || evt.summary || '',
            location: evt.location || 'Scene ' + (idx + 1),
          };

          return (
            <div 
              key={evt._id || evt.id} 
              className="w-72 shrink-0 flex flex-col relative snap-start"
            >
              {idx < sortedEvents.length - 1 && (
                <div className="absolute top-[38px] left-[260px] w-20 h-px bg-rule z-0 hidden sm:block" />
              )}

              <div className="flex items-center gap-2 mb-3 z-10">
                <div className={`w-8 h-8 rounded border flex items-center justify-center font-bold text-xs ${
                  evt.isFlashback 
                    ? 'border-accent text-accent bg-paper' 
                    : 'bg-ink text-paper border-ink'
                }`}>
                  {orderMode === 'chronological' ? evt.chronologicalOrder : scene.sceneNumber}
                </div>
                
                {evt.timeLabel && (
                  <span className="px-2 py-0.5 bg-paper border border-rule rounded text-[9px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted" />
                    {evt.timeLabel}
                  </span>
                )}
              </div>

              <div className={`flex-1 bg-paper border p-4 rounded flex flex-col justify-between ${
                evt.isFlashback 
                  ? 'border-accent' 
                  : 'border-rule'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
                      Scene {scene.sceneNumber}
                    </span>
                    {evt.isFlashback && (
                      <span className="px-1.5 py-0.5 border border-accent text-accent rounded text-[8px] font-bold uppercase tracking-wider">
                        Flashback
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-ink text-sm leading-snug">
                    {scene.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed line-clamp-4">
                    {scene.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-rule mt-4 flex items-center gap-1 text-[10px] text-muted font-semibold uppercase">
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
