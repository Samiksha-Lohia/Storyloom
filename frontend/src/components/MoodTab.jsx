import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Smile, Flame, Activity, Sparkles, Heart, Compass } from 'lucide-react';

export default function MoodTab({ documentId, source, options = {} }) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);

  const [doc, setDoc] = useState(null);
  const [moodRecords, setMoodRecords] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!resolvedSource?.id || resolvedSource.id === 'null' || resolvedSource.id === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch Source metadata
      let sourceData = null;
      if (resolvedSource.kind === 'book') {
        sourceData = await api.books.getById(resolvedSource.id).catch(() => null);
      } else {
        sourceData = await api.documents.getById(resolvedSource.id).catch(() => null);
      }
      setDoc(sourceData);

      // 2. Fetch Mood Analysis
      const moodRes = await api.analysis.getMood(resolvedSource, stableOptions).catch(() => null);
      let rawMoods = [];
      let summary = null;

      if (moodRes) {
        if (Array.isArray(moodRes)) {
          rawMoods = moodRes;
        } else if (Array.isArray(moodRes.data)) {
          rawMoods = moodRes.data;
        } else if (moodRes.data?.results) {
          rawMoods = moodRes.data.results;
          summary = moodRes.data.summary;
        } else if (moodRes.results) {
          rawMoods = moodRes.results;
          summary = moodRes.summary;
        } else if (moodRes.data && typeof moodRes.data === 'object' && moodRes.data.summary) {
          summary = moodRes.data.summary;
          rawMoods = moodRes.data.results || [];
        }
      }

      setMoodRecords(rawMoods);
      setSummaryData(summary);

      // 3. Fetch Scenes for scene-by-scene mood flow
      const scenesRes = await api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []);
      const sceneList = scenesRes?.data?.results || scenesRes?.results || scenesRes?.data || (Array.isArray(scenesRes) ? scenesRes : []);
      setScenes(Array.isArray(sceneList) ? sceneList : []);

    } catch (err) {
      console.error('Failed to load mood analysis:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate mood insights strictly
  const moodAnalysis = useMemo(() => {
    const list = Array.isArray(moodRecords) ? moodRecords : [];

    const emotionFrequency = {};
    const emotionScoresAccum = {};
    let totalIntensity = 0;
    let minIntensity = 1;
    let maxIntensity = 0;

    list.forEach((m) => {
      const moodName = (m.primaryMood || 'Neutral').trim();
      emotionFrequency[moodName] = (emotionFrequency[moodName] || 0) + 1;

      const intensity = typeof m.intensity === 'number' ? m.intensity : 0.5;
      totalIntensity += intensity;
      if (intensity < minIntensity) minIntensity = intensity;
      if (intensity > maxIntensity) maxIntensity = intensity;

      const scores = m.emotionScores instanceof Map 
        ? Object.fromEntries(m.emotionScores) 
        : (m.emotionScores || {});

      Object.entries(scores).forEach(([emo, val]) => {
        const numVal = Number(val) || 0;
        emotionScoresAccum[emo] = (emotionScoresAccum[emo] || 0) + numVal;
      });
    });

    const totalCount = list.length || 1;
    const avgIntensity = list.length > 0 ? Math.round((totalIntensity / totalCount) * 100) : 65;
    const computedMin = list.length > 0 ? Math.round(minIntensity * 100) : 40;
    const computedMax = list.length > 0 ? Math.round(maxIntensity * 100) : 90;

    // Frequencies sorted
    const sortedFrequencies = Object.entries(emotionFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: Math.round((count / totalCount) * 100),
      }));

    // Top emotion scores averaged
    const averagedScores = Object.entries(emotionScoresAccum)
      .map(([emo, sum]) => ({
        emotion: emo,
        score: Math.round((sum / totalCount) * 100),
      }))
      .sort((a, b) => b.score - a.score);

    const dominantMood = summaryData?.dominantMood || 
      sortedFrequencies[0]?.emotion || 
      doc?.dominantMood || 
      doc?.overallTone || 
      'Dramatic';

    return {
      dominantMood,
      averageIntensity: summaryData?.averageIntensity ? Math.round(summaryData.averageIntensity * 100) : avgIntensity,
      minIntensity: computedMin,
      maxIntensity: computedMax,
      frequencies: sortedFrequencies,
      scores: averagedScores.length > 0 ? averagedScores : sortedFrequencies.map(f => ({ emotion: f.emotion, score: f.percentage })),
      distinctMoodsCount: Object.keys(emotionFrequency).length || 1,
    };
  }, [moodRecords, summaryData, doc]);

  // Map scenes to mood records
  const sceneMoodList = useMemo(() => {
    return scenes.map((scene, idx) => {
      const sceneId = (scene._id || scene.id)?.toString();
      const matchedMood = moodRecords.find(
        (m) => (m.sceneId?._id || m.sceneId)?.toString() === sceneId
      ) || moodRecords[idx] || null;

      const primaryMood = matchedMood?.primaryMood || scene.primaryMood || moodAnalysis.dominantMood;
      const intensity = typeof matchedMood?.intensity === 'number' 
        ? Math.round(matchedMood.intensity * 100) 
        : 65;

      const scores = matchedMood?.emotionScores instanceof Map 
        ? Object.fromEntries(matchedMood.emotionScores) 
        : (matchedMood?.emotionScores || {});

      return {
        scene,
        index: idx + 1,
        title: scene.title || `Scene ${idx + 1}`,
        summary: scene.summary || scene.synopsis || '',
        primaryMood,
        intensity,
        scores,
      };
    });
  }, [scenes, moodRecords, moodAnalysis.dominantMood]);

  const getMoodBadgeStyle = (mood) => {
    const m = (mood || '').toLowerCase();
    if (m.includes('tense') || m.includes('danger') || m.includes('confront')) {
      return 'border-rose-300 bg-rose-50 text-rose-800';
    }
    if (m.includes('joy') || m.includes('exuber') || m.includes('hope')) {
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    }
    if (m.includes('melanch') || m.includes('somber') || m.includes('sad')) {
      return 'border-indigo-300 bg-indigo-50 text-indigo-800';
    }
    if (m.includes('myster') || m.includes('suspense') || m.includes('dark')) {
      return 'border-amber-300 bg-amber-50 text-amber-800';
    }
    if (m.includes('romance') || m.includes('passion') || m.includes('intimate')) {
      return 'border-pink-300 bg-pink-50 text-pink-800';
    }
    return 'border-rule bg-paper text-ink';
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-muted flex flex-col items-center gap-2">
        <Activity className="w-5 h-5 animate-spin text-ink" />
        <span>Loading mood and tone analysis…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mood Header Banner */}
      <div className="bg-paper border border-rule rounded p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Mood & Tone Analysis
            </span>
            <h2 className="text-xl font-bold text-ink leading-tight">
              {doc?.title ? `${doc.title} — Emotional Spectrum` : 'Atmospheric & Emotional Profile'}
            </h2>
            <p className="text-xs text-muted leading-relaxed max-w-xl font-body">
              Deep emotional resonance and tone mapping evaluated across narrative beats and scenes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-bold text-muted uppercase">Dominant Tone:</span>
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border shadow-xs ${getMoodBadgeStyle(moodAnalysis.dominantMood)}`}>
              {moodAnalysis.dominantMood}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Mood Stats Cards - ONLY MOOD METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dominant Mood Card */}
        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-rule flex items-center justify-center text-ink shrink-0 bg-paper">
            <Smile className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Dominant Mood</p>
            <p className="text-base font-bold text-ink capitalize truncate">
              {moodAnalysis.dominantMood}
            </p>
          </div>
        </div>

        {/* Emotional Intensity Card */}
        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-rule flex items-center justify-center text-ink shrink-0 bg-paper">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Average Intensity</p>
            <p className="text-base font-bold text-ink font-mono">
              {moodAnalysis.averageIntensity}%
            </p>
          </div>
        </div>

        {/* Intensity Range Card */}
        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-rule flex items-center justify-center text-ink shrink-0 bg-paper">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Intensity Range</p>
            <p className="text-xs font-bold text-ink font-mono">
              {moodAnalysis.minIntensity}% → {moodAnalysis.maxIntensity}%
            </p>
          </div>
        </div>

        {/* Emotion Spectrum Card */}
        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-rule flex items-center justify-center text-ink shrink-0 bg-paper">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Distinct Moods</p>
            <p className="text-base font-bold text-ink font-mono">
              {moodAnalysis.distinctMoodsCount} Registered
            </p>
          </div>
        </div>
      </div>

      {/* Emotional Landscape / Frequency Distribution */}
      <div className="bg-paper border border-rule rounded p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" />
              Emotional Landscape & Frequencies
            </h3>
            <p className="text-xs text-muted">Relative presence of tonal elements across the story</p>
          </div>
        </div>

        {moodAnalysis.scores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {moodAnalysis.scores.map((item, idx) => (
              <div key={idx} className="p-3 border border-rule rounded bg-paper space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                    {item.emotion}
                  </span>
                  <span className="font-mono text-xs font-semibold text-muted">
                    {item.score}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-rule/50 rounded overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(8, item.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">No emotional frequencies calculated yet.</p>
        )}
      </div>

      {/* Scene-by-Scene Mood Progression */}
      {sceneMoodList.length > 0 && (
        <div className="bg-paper border border-rule rounded p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Compass className="w-4 h-4 text-ink" />
                Scene-by-Scene Mood Progression
              </h3>
              <p className="text-xs text-muted">Chronological atmospheric progression through the story</p>
            </div>
            <span className="text-xs font-mono text-muted">{sceneMoodList.length} scenes mapped</span>
          </div>

          <div className="space-y-3 pt-1">
            {sceneMoodList.map((item) => (
              <div 
                key={item.index} 
                className="p-4 border border-rule rounded bg-paper flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-ink/30 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-rule bg-paper text-muted">
                      #{item.index}
                    </span>
                    <h4 className="text-xs font-bold text-ink">
                      {item.title}
                    </h4>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-muted block">Intensity</span>
                    <span className="text-xs font-mono font-bold text-ink">{item.intensity}%</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border shadow-xs ${getMoodBadgeStyle(item.primaryMood)}`}>
                    {item.primaryMood}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
