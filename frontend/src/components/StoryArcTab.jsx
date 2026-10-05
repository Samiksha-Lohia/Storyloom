import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceDot, 
  Line 
} from 'recharts';
import { BarChart2 } from 'lucide-react';

export default function StoryArcTab({ documentId, source, options = {}, summary = false, initialData = null }) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const stableOptions = useMemo(() => options, [options]);
  const [arc, setArc] = useState(initialData || null);
  const [scenes, setScenes] = useState({});
  const [loading, setLoading] = useState(!initialData);

  // Overlay toggles
  const [showThreeAct, setShowThreeAct] = useState(false);
  const [showHeroJourney, setShowHeroJourney] = useState(false);

  const loadData = useCallback(async () => {
    if (initialData) {
      setArc(initialData);
      setLoading(false);
      return;
    }
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sceneRes = await api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []);
      const scenesList = sceneRes?.data?.results || sceneRes?.results || sceneRes?.data || sceneRes || [];
      const scenesMap = {};
      scenesList.forEach(s => {
        scenesMap[(s._id || s.id)?.toString()] = s;
      });
      setScenes(scenesMap);

      const arcRes = await api.analysis.getArc(resolvedSource, stableOptions).catch(() => null);
      const arcData = arcRes?.data !== undefined ? arcRes.data : arcRes;
      setArc(arcData);
    } catch (err) {
      console.error('Failed to load story arc:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedSource, stableOptions, initialData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build chart dataset including overlays
  const chartData = useMemo(() => {
    if (!arc || !arc.arcPoints) return [];
    
    const totalPoints = arc.arcPoints.length;
    
    return arc.arcPoints.map((pt, idx) => {
      const sId = (pt.sceneId?._id || pt.sceneId)?.toString();
      const scene = scenes[sId];
      const sceneNum = scene ? scene.sceneNumber : idx + 1;
      
      const point = {
        name: `Scene ${sceneNum}`,
        tension: (pt.tensionScore || 0) / 100,
        label: scene ? scene.summary : (pt.label || scene?.title || `Scene ${sceneNum}`),
        sceneId: sId,
      };

      const x = idx / (totalPoints - 1 || 1);
      let threeActVal = 0.2;
      if (x < 0.2) {
        threeActVal = 0.2 + (x / 0.2) * 0.15;
      } else if (x < 0.8) {
        threeActVal = 0.35 + ((x - 0.2) / 0.6) * 0.5;
      } else {
        threeActVal = 0.85 - ((x - 0.8) / 0.2) * 0.65;
      }
      point.threeAct = Math.round(threeActVal * 100) / 100;

      let heroVal = 0.25;
      if (x < 0.25) {
        heroVal = 0.25 + Math.sin((x / 0.25) * Math.PI) * 0.15;
      } else if (x < 0.6) {
        heroVal = 0.25 + Math.sin(((x - 0.25) / 0.35) * Math.PI) * 0.25;
      } else if (x < 0.85) {
        heroVal = 0.3 + ((x - 0.6) / 0.25) * 0.6;
      } else {
        heroVal = 0.9 - ((x - 0.85) / 0.15) * 0.6;
      }
      point.heroJourney = Math.round(heroVal * 100) / 100;

      return point;
    });
  }, [arc, scenes]);

  const climaxPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    if (arc && arc.climaxSceneId) {
      const found = chartData.find(d => d.sceneId === arc.climaxSceneId);
      if (found) return found;
    }
    return [...chartData].sort((a, b) => b.tension - a.tension)[0];
  }, [chartData, arc]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted font-body">
        <p className="text-xs font-bold">Loading…</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-16 bg-paper border border-rule rounded p-6 font-body text-ink">
        <BarChart2 className="w-8 h-8 text-muted mx-auto mb-2" />
        <h3 className="text-sm font-bold text-ink">Story arc not mapped yet</h3>
        <p className="text-xs text-muted mt-1">Make sure the narrative tension analysis job has completed.</p>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="space-y-3 text-left font-body text-ink">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-ink">Story Arc & Pacing</h3>
            <p className="text-[11px] text-muted">Narrative tension beats with peak climax marker</p>
          </div>
          {climaxPoint && (
            <span className="px-2 py-0.5 border border-rule rounded text-[10px] font-bold text-ink flex items-center gap-1">
              <span>Climax:</span>
              <span className="text-accent">{climaxPoint.name}</span>
            </span>
          )}
        </div>

        <div className="bg-paper border border-rule rounded p-3">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6B6358" fontSize={9} tickLine={false} />
                <YAxis stroke="#6B6358" fontSize={9} tickLine={false} domain={[0, 1]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-paper text-ink p-2 rounded border border-rule text-xs space-y-0.5 max-w-xs">
                          <p className="font-bold text-accent">{data.name}</p>
                          <p className="text-muted text-[11px] truncate">{data.label}</p>
                          <p className="font-bold text-ink">Tension: {Math.round(data.tension * 100)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tension"
                  stroke="#9B2D20"
                  strokeWidth={2}
                  fillOpacity={0.1}
                  fill="#9B2D20"
                  isAnimationActive={false}
                />
                {climaxPoint && (
                  <ReferenceDot
                    x={climaxPoint.name}
                    y={climaxPoint.tension}
                    r={4}
                    fill="#9B2D20"
                    stroke="#FBF8F2"
                    strokeWidth={1}
                    label={{ value: 'Climax', position: 'top', fill: '#9B2D20', fontSize: 10, fontWeight: 'bold' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {(initialData?.pacingSummary || arc?.pacingSummary) && (
            <div className="mt-3 p-2 bg-paper border border-rule rounded text-xs text-ink">
              <span>{initialData?.pacingSummary || arc?.pacingSummary}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left font-body text-ink">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <h2 className="text-base font-bold text-ink">Story Arc Visualization</h2>
          <p className="text-xs text-muted mt-0.5">Plot scene-by-scene narrative tension to review pacing structure.</p>
        </div>

        {/* Structure overlays buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-bold">
          <span className="text-muted">Overlays:</span>
          <button
            onClick={() => setShowThreeAct(!showThreeAct)}
            className={`px-2.5 py-1 rounded border cursor-pointer ${
              showThreeAct 
                ? 'bg-ink text-paper border-ink' 
                : 'bg-paper border-rule text-ink hover:border-ink'
            }`}
          >
            Three-Act Structure
          </button>
          <button
            onClick={() => setShowHeroJourney(!showHeroJourney)}
            className={`px-2.5 py-1 rounded border cursor-pointer ${
              showHeroJourney 
                ? 'bg-ink text-paper border-ink' 
                : 'bg-paper border-rule text-ink hover:border-ink'
            }`}
          >
            Hero's Journey
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-paper border border-rule rounded p-4">
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#6B6358" fontSize={10} tickLine={false} />
              <YAxis stroke="#6B6358" fontSize={10} tickLine={false} domain={[0, 1]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-paper text-ink p-3 rounded border border-rule text-xs space-y-1 text-left max-w-sm">
                        <p className="font-bold text-accent">{data.name}</p>
                        <p className="text-muted font-bold">Development:</p>
                        <p className="italic text-ink">"{data.label}"</p>
                        <p className="font-bold text-accent mt-1">Tension Level: {Math.round(data.tension * 100)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* Primary Story Tension Curve */}
              <Area 
                type="monotone" 
                dataKey="tension" 
                stroke="#9B2D20" 
                strokeWidth={2} 
                fillOpacity={0.1} 
                fill="#9B2D20" 
                isAnimationActive={false}
              />
              
              {/* Three Act Reference Line */}
              {showThreeAct && (
                <Line
                  type="monotone"
                  dataKey="threeAct"
                  stroke="#1C1917"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Hero Journey Reference Line */}
              {showHeroJourney && (
                <Line
                  type="monotone"
                  dataKey="heroJourney"
                  stroke="#6B6358"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Peak Climax Marker */}
              {climaxPoint && (
                <ReferenceDot
                  x={climaxPoint.name}
                  y={climaxPoint.tension}
                  r={5}
                  fill="#9B2D20"
                  stroke="#FBF8F2"
                  strokeWidth={1}
                  label={{ value: 'Climax', position: 'top', fill: '#9B2D20', fontSize: 10, fontWeight: 'bold' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Climax Scene Details Card */}
      {climaxPoint && scenes[climaxPoint.sceneId] && (
        <div className="bg-paper border border-rule rounded p-4 space-y-1 text-left">
          <span className="px-1.5 py-0.5 bg-paper border border-rule rounded text-[10px] font-bold uppercase tracking-wider text-muted">
            Peak Climax Detected
          </span>
          <h3 className="font-bold text-ink text-sm">
            {climaxPoint.name}: {scenes[climaxPoint.sceneId].title}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {scenes[climaxPoint.sceneId].summary}
          </p>
        </div>
      )}
    </div>
  );
}

