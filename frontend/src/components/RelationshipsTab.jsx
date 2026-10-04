import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Heart, HeartCrack, X, BookOpen } from 'lucide-react';

export default function RelationshipsTab({ documentId, source, options = {}, summary = false, initialData = null }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [relationships, setRelationships] = useState(initialData?.relationships || []);
  const [characters, setCharacters] = useState(() => {
    if (!initialData?.characters) return {};
    const map = {};
    initialData.characters.forEach(c => {
      map[(c._id || c.id)?.toString()] = c;
    });
    return map;
  });
  const [scenes, setScenes] = useState({});
  const [loading, setLoading] = useState(!initialData && Boolean(resolvedSource?.id));
  const [analysisStatus, setAnalysisStatus] = useState(null);
  
  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [sentimentRange, setSentimentRange] = useState([-1, 1]);
  
  // Edge detail panel state
  const [selectedEdge, setSelectedEdge] = useState(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.relationships) {
        setRelationships(initialData.relationships);
      }
      if (initialData.characters) {
        const map = {};
        initialData.characters.forEach(c => {
          map[(c._id || c.id)?.toString()] = c;
        });
        setCharacters(map);
      }
      setLoading(false);
      return;
    }
    loadData();
  }, [resolvedSource?.kind, resolvedSource?.id, JSON.stringify(options), initialData]);

  const loadData = async () => {
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Load characters
      const charsRes = await api.analysis.getCharacters(resolvedSource, options).catch(() => []);
      const charsList = charsRes?.data !== undefined ? (Array.isArray(charsRes.data) ? charsRes.data : charsRes.data?.results || []) : (Array.isArray(charsRes) ? charsRes : charsRes?.results || []);
      const charsMap = {};
      charsList.forEach(c => {
        charsMap[(c._id || c.id)?.toString()] = c;
      });
      setCharacters(charsMap);

      // 2. Load scenes (to resolve shared scene titles in edge panel)
      const sceneRes = await api.analysis.getScenes(resolvedSource, options).catch(() => []);
      const scenesList = sceneRes?.data?.results || sceneRes?.results || sceneRes?.data || sceneRes || [];
      const scenesMap = {};
      scenesList.forEach(s => {
        scenesMap[(s._id || s.id)?.toString()] = s;
      });
      setScenes(scenesMap);

      // 3. Load relationships
      const relRes = await api.analysis.getRelationships(resolvedSource, options).catch(() => []);
      if (relRes?.analysisStatus) {
        setAnalysisStatus(relRes.analysisStatus);
      }
      const rawRel = relRes?.data !== undefined ? relRes.data : relRes;
      const relList = Array.isArray(rawRel) ? rawRel : rawRel?.results || [];
      setRelationships(relList || []);
    } catch (err) {
      console.error('Failed to load relationship data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered relationships
  const filteredRelationships = useMemo(() => {
    return relationships
      .map(r => ({
        ...r,
        _id: r._id || r.id,
        characterAId: (r.characterA?.id || r.characterAId?._id || r.characterAId)?.toString(),
        characterBId: (r.characterB?.id || r.characterBId?._id || r.characterBId)?.toString(),
      }))
      .filter(rel => {
        if (selectedType !== 'all' && rel.type !== selectedType) return false;
        if (rel.sentimentScore < sentimentRange[0] || rel.sentimentScore > sentimentRange[1]) return false;
        return true;
      });
  }, [relationships, selectedType, sentimentRange]);

  // Construct React Flow nodes and edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const activeCharIds = new Set();
    filteredRelationships.forEach(r => {
      if (r.characterAId) activeCharIds.add(r.characterAId);
      if (r.characterBId) activeCharIds.add(r.characterBId);
    });

    let activeChars = Object.values(characters).filter(c => activeCharIds.has((c._id || c.id)?.toString()));
    // If no filtered relationships or active IDs, show all characters
    if (activeChars.length === 0) {
      activeChars = Object.values(characters);
    }
    
    // Auto circular layout
    const total = activeChars.length;
    const radius = Math.max(120, Math.min(220, total * 25));
    const centerX = 240;
    const centerY = 160;

    const nodes = activeChars.map((char, index) => {
      const charId = (char._id || char.id)?.toString();
      const angle = (index / total) * 2 * Math.PI;
      
      const isProtagonist = char.role?.toLowerCase() === 'protagonist';
      const isAntagonist = char.role?.toLowerCase() === 'antagonist';

      let bgClass = 'bg-white';
      if (isProtagonist) bgClass = 'bg-[#fef08a] border-amber-400';
      else if (isAntagonist) bgClass = 'bg-rose-50 border-rose-400';

      return {
        id: charId,
        type: 'default',
        data: { 
          label: (
            <div className="text-center font-serif py-1 px-2 select-none">
              <p className="font-bold text-xs text-slate-800">{char.name}</p>
              <p className="text-[8px] uppercase tracking-widest text-slate-400 font-sans mt-0.5">{char.role || 'cast'}</p>
            </div>
          )
        },
        position: {
          x: centerX + radius * Math.cos(angle) - 45,
          y: centerY + radius * Math.sin(angle) - 18,
        },
        style: {
          border: '2px solid #1e293b',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
        className: `${bgClass}`
      };
    });

    const edges = filteredRelationships.map((rel, index) => {
      const relId = rel._id || rel.id || `edge-${index}`;
      
      let color = '#94a3b8'; // gray
      if (rel.sentimentScore > 0.2) color = '#10b981'; // green
      else if (rel.sentimentScore < -0.2) color = '#ef4444'; // red

      const thickness = Math.max(2, Math.min(6, (rel.sceneIds?.length || 1) * 1.5));

      return {
        id: relId,
        source: rel.characterAId,
        target: rel.characterBId,
        animated: Math.abs(rel.sentimentScore) > 0.5,
        style: { 
          stroke: color, 
          strokeWidth: thickness,
          cursor: 'pointer'
        },
        data: { raw: rel }
      };
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [filteredRelationships, characters]);

  const handleEdgeClick = (event, edge) => {
    setSelectedEdge(edge.data.raw);
  };

  const getRelationshipTypeIcon = (type) => {
    if (type === 'romantic') return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
    if (type === 'rival') return <HeartCrack className="w-4 h-4 text-red-500" />;
    return <GitFork className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
        <div className="h-[300px] bg-slate-100 rounded-2xl w-full"></div>
      </div>
    );
  }

  // Read-only summary mode for pitch panel
  if (summary) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs relative h-72">
        {flowNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-slate-50/60">
            <GitFork className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-serif font-semibold text-slate-700 text-sm">No Cast Relationships Mapped</p>
            <p className="text-xs text-slate-400 mt-0.5">Network will appear when interaction data is available.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onEdgeClick={handleEdgeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            fitView
          >
            <Background color="#cbd5e1" gap={16} size={1} />
            <Controls showInteractive={false} className="!bg-white !border-slate-200 !shadow-xs rounded-md scale-90 origin-bottom-left" />
          </ReactFlow>
        )}
        {selectedEdge && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 shadow-md flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2">
              {getRelationshipTypeIcon(selectedEdge.type)}
              <span className="font-semibold text-slate-800">
                {characters[selectedEdge.characterAId]?.name || 'Character A'} ↔ {characters[selectedEdge.characterBId]?.name || 'Character B'}
              </span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] capitalize font-medium">{selectedEdge.type}</span>
              <span className="text-slate-400 text-[10px]">Sentiment: {selectedEdge.sentimentScore > 0 ? '+' : ''}{selectedEdge.sentimentScore}</span>
            </div>
            <button onClick={() => setSelectedEdge(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="text-left">
          <h2 className="text-2xl font-serif font-bold text-slate-900">Relationship Network</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore connections and sentiments between characters.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {/* Dropdown type filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="all">All Connections</option>
              <option value="ally">Allies</option>
              <option value="rival">Rivals</option>
              <option value="family">Family</option>
              <option value="romantic">Romantic</option>
              <option value="mentor">Mentors</option>
            </select>
          </div>

          {/* Sentiment Slider filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sentiment:</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={sentimentRange[0]}
              onChange={(e) => setSentimentRange([parseFloat(e.target.value), sentimentRange[1]])}
              className="w-20 accent-slate-900"
            />
            <span className="text-slate-500 font-mono">to</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={sentimentRange[1]}
              onChange={(e) => setSentimentRange([sentimentRange[0], parseFloat(e.target.value)])}
              className="w-20 accent-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs relative flex">
        <div className="flex-1 h-full min-h-[450px] relative">
          {flowNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-50/60">
              <GitFork className="w-10 h-10 text-slate-300 mb-3" />
              <p className="font-serif font-bold text-slate-700 text-base">No Characters or Relationships Detected</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Once characters are identified and their interactions analyzed across scenes, their connection network will be mapped here.
              </p>
            </div>
          ) : (
            <>
              {flowEdges.length === 0 && (
                <div className="absolute top-4 left-4 z-10 bg-amber-50/95 border border-amber-200 text-amber-800 text-[11px] px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 backdrop-blur-xs">
                  <span>Displaying character nodes (no connections match the current filter).</span>
                </div>
              )}
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onEdgeClick={handleEdgeClick}
                fitView
              >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls className="!bg-white !border-slate-200 !shadow-xs rounded-lg" />
              </ReactFlow>
            </>
          )}
        </div>

        {/* Floating Side Info Panel for Clicked Connections */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 bottom-4 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 overflow-y-auto flex flex-col justify-between z-20 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-serif font-bold text-slate-900 flex items-center gap-1.5">
                  {getRelationshipTypeIcon(selectedEdge.type)}
                  Connection Details
                </h3>
                <button 
                  onClick={() => setSelectedEdge(null)}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Characters pair */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-800">
                  {characters[selectedEdge.characterAId]?.name}
                </span>
                <span className="text-slate-400 font-mono text-xs">↔</span>
                <span className="text-sm font-semibold text-slate-800">
                  {characters[selectedEdge.characterBId]?.name}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <span className="block text-slate-400 uppercase font-semibold text-[9px] tracking-wider">Type</span>
                  <span className="font-bold text-slate-700 capitalize">{selectedEdge.type}</span>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <span className="block text-slate-400 uppercase font-semibold text-[9px] tracking-wider">Sentiment</span>
                  <span className="font-bold text-slate-700">{selectedEdge.sentimentScore > 0 ? '+' : ''}{selectedEdge.sentimentScore}</span>
                </div>
              </div>

              {/* Shared scenes list */}
              {selectedEdge.sceneIds && selectedEdge.sceneIds.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Interaction Scenes ({selectedEdge.sceneIds.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedEdge.sceneIds.map((sceneId) => {
                      const scene = scenes[sceneId];
                      if (!scene) return null;
                      return (
                        <div 
                          key={sceneId}
                          className="p-2 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                        >
                          <span className="font-mono font-bold text-slate-400">Scene {scene.sceneNumber}:</span>
                          <span className="font-serif font-semibold text-slate-800 ml-1">{scene.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 text-center mt-4">
              Click another line in the network to inspect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
