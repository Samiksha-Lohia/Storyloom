import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Heart, HeartCrack, X, BookOpen } from 'lucide-react';

export default function RelationshipsTab({ documentId, source, options = {}, summary = false, initialData = null }) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);
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
  
  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [sentimentRange, setSentimentRange] = useState([-1, 1]);
  
  // Edge detail panel state
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Sync initialData if supplied
  useEffect(() => {
    if (!initialData) return;
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
  }, [initialData]);

  // Network fetch if no initialData
  useEffect(() => {
    if (initialData) return;
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    (async () => {
      try {
        // 1. Load characters
        const charsRes = await api.analysis.getCharacters(resolvedSource, stableOptions).catch(() => []);
        if (isCancelled) return;
        const charsList = charsRes?.data !== undefined ? (Array.isArray(charsRes.data) ? charsRes.data : charsRes.data?.results || []) : (Array.isArray(charsRes) ? charsRes : charsRes?.results || []);
        const charsMap = {};
        charsList.forEach(c => {
          charsMap[(c._id || c.id)?.toString()] = c;
        });
        setCharacters(charsMap);

        // 2. Load scenes
        const sceneRes = await api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []);
        if (isCancelled) return;
        const scenesList = sceneRes?.data?.results || sceneRes?.results || sceneRes?.data || sceneRes || [];
        const scenesMap = {};
        scenesList.forEach(s => {
          scenesMap[(s._id || s.id)?.toString()] = s;
        });
        setScenes(scenesMap);

        // 3. Load relationships
        const relRes = await api.analysis.getRelationships(resolvedSource, stableOptions).catch(() => []);
        if (isCancelled) return;
        const rawRel = relRes?.data !== undefined ? relRes.data : relRes;
        const relList = Array.isArray(rawRel) ? rawRel : rawRel?.results || [];
        setRelationships(relList || []);
      } catch (err) {
        console.error('Failed to load relationship data:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey, Boolean(initialData)]);

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
    if (activeChars.length === 0) {
      activeChars = Object.values(characters);
    }
    
    // Auto circular layout
    const total = activeChars.length;
    const radius = Math.max(140, Math.min(240, total * 30));
    const centerX = 280;
    const centerY = 220;

    const nodes = activeChars.map((char, index) => {
      const charId = (char._id || char.id)?.toString();
      const angle = (index / total) * 2 * Math.PI;

      return {
        id: charId,
        type: 'default',
        data: { 
          label: (
            <div className="text-center py-1 px-2 select-none">
              <p className="font-bold text-xs text-ink">{char.name}</p>
              <p className="text-[8px] uppercase tracking-widest text-muted font-body mt-0.5">{char.role || 'cast'}</p>
            </div>
          )
        },
        position: {
          x: centerX + radius * Math.cos(angle) - 45,
          y: centerY + radius * Math.sin(angle) - 18,
        },
        style: {
          border: '1px solid #D9D2C3',
          borderRadius: '4px',
          backgroundColor: '#FBF8F2',
        },
        className: 'bg-paper'
      };
    });

    const edges = filteredRelationships.map((rel, index) => {
      const relId = rel._id || rel.id || `edge-${index}`;
      
      let color = '#6B6358'; // muted
      if (rel.sentimentScore > 0.2) color = '#1C1917'; // ink
      else if (rel.sentimentScore < -0.2) color = '#9B2D20'; // accent

      const thickness = Math.max(1.5, Math.min(4, (rel.sceneIds?.length || 1) * 1.2));

      return {
        id: relId,
        source: rel.characterAId,
        target: rel.characterBId,
        animated: false,
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
    if (type === 'ally') return <Heart className="w-4 h-4 text-ink" />;
    if (type === 'rival') return <HeartCrack className="w-4 h-4 text-accent" />;
    return <GitFork className="w-4 h-4 text-muted" />;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-muted">
        Loading…
      </div>
    );
  }

  // Read-only summary mode for pitch panel
  if (summary) {
    return (
      <div className="border border-rule rounded overflow-hidden bg-paper relative w-full h-[320px] min-h-[300px]">
        {flowNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-paper">
            <GitFork className="w-4 h-4 text-muted mb-2" />
            <p className="font-bold text-ink text-sm">No Cast Relationships Mapped</p>
            <p className="text-xs text-muted mt-0.5">Network will appear when interaction data is available.</p>
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
            fitViewOptions={{ padding: 0.25 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background color="#D9D2C3" gap={16} size={1} />
            <Controls showInteractive={false} className="!bg-paper !border-rule rounded scale-90 origin-bottom-left" />
          </ReactFlow>
        )}
        {selectedEdge && (
          <div className="absolute bottom-2 left-2 right-2 bg-paper border border-rule rounded p-2.5 flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2">
              {getRelationshipTypeIcon(selectedEdge.type)}
              <span className="font-bold text-ink">
                {characters[selectedEdge.characterAId]?.name || 'Character A'} ↔ {characters[selectedEdge.characterBId]?.name || 'Character B'}
              </span>
              <span className="px-1.5 py-0.5 border border-rule text-muted rounded text-[10px] capitalize font-medium">{selectedEdge.type}</span>
              <span className="text-muted text-[10px]">Sentiment: {selectedEdge.sentimentScore > 0 ? '+' : ''}{selectedEdge.sentimentScore}</span>
            </div>
            <button onClick={() => setSelectedEdge(null)} className="text-muted hover:text-ink p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full interactive mode for Writer & Pitch detailed tabs
  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Controls Bar */}
      <div className="bg-paper p-4 rounded border border-rule flex flex-wrap items-center justify-between gap-4">
        {/* Left: Category selector pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-muted uppercase tracking-wider mr-1">Filter:</span>
          {['all', 'ally', 'rival', 'family', 'mentor', 'romantic'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded text-xs capitalize cursor-pointer border ${
                selectedType === type
                  ? 'bg-ink text-paper border-ink font-bold'
                  : 'bg-paper text-muted border-rule hover:border-ink'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Right: Sentiment filter slider */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted font-bold">Min Sentiment:</span>
          <div className="flex items-center gap-2">
            <input 
              type="range" 
              min="-1" 
              max="1" 
              step="0.1" 
              value={sentimentRange[0]} 
              onChange={(e) => setSentimentRange([parseFloat(e.target.value), sentimentRange[1]])}
              className="w-24 accent-accent cursor-pointer"
            />
            <span className="font-mono text-muted w-8">{sentimentRange[0]}</span>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="w-full h-[540px] min-h-[480px] border border-rule rounded overflow-hidden bg-paper relative flex">
        <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
          {flowNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-paper">
              <GitFork className="w-4 h-4 text-muted mb-2" />
              <p className="font-bold text-ink text-base">No Characters or Relationships Detected</p>
              <p className="text-xs text-muted max-w-sm mt-1 font-body">
                Once characters are identified and their interactions analyzed across scenes, their connection network will be mapped here.
              </p>
            </div>
          ) : (
            <>
              {flowEdges.length === 0 && (
                <div className="absolute top-4 left-4 z-10 bg-paper border border-rule text-muted text-[11px] px-3 py-1.5 rounded flex items-center gap-1.5">
                  <span>Displaying character nodes (no connections match the current filter).</span>
                </div>
              )}
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onEdgeClick={handleEdgeClick}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                style={{ width: '100%', height: '100%' }}
              >
                <Background color="#D9D2C3" gap={20} size={1} />
                <Controls className="!bg-paper !border-rule rounded" />
              </ReactFlow>
            </>
          )}
        </div>

        {/* Floating Side Info Panel for Clicked Connections */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 bottom-4 w-80 bg-paper border border-rule rounded p-5 overflow-y-auto flex flex-col justify-between z-20 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <h3 className="font-bold text-ink flex items-center gap-1.5">
                  {getRelationshipTypeIcon(selectedEdge.type)}
                  Connection Details
                </h3>
                <button 
                  onClick={() => setSelectedEdge(null)}
                  className="p-1 rounded text-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Characters pair */}
              <div className="flex items-center justify-between bg-paper p-3 rounded border border-rule">
                <span className="text-sm font-bold text-ink">
                  {characters[selectedEdge.characterAId]?.name}
                </span>
                <span className="text-muted font-mono text-xs">↔</span>
                <span className="text-sm font-bold text-ink">
                  {characters[selectedEdge.characterBId]?.name}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-paper p-2.5 rounded border border-rule">
                  <span className="block text-muted uppercase font-bold text-[9px] tracking-wider">Type</span>
                  <span className="font-bold text-ink capitalize">{selectedEdge.type}</span>
                </div>
                <div className="bg-paper p-2.5 rounded border border-rule">
                  <span className="block text-muted uppercase font-bold text-[9px] tracking-wider">Sentiment</span>
                  <span className="font-bold text-ink">{selectedEdge.sentimentScore > 0 ? '+' : ''}{selectedEdge.sentimentScore}</span>
                </div>
              </div>

              {/* Shared scenes list */}
              {selectedEdge.sceneIds && selectedEdge.sceneIds.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    Interaction Scenes ({selectedEdge.sceneIds.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedEdge.sceneIds.map((sceneId) => {
                      const scene = scenes[sceneId];
                      if (!scene) return null;
                      return (
                        <div 
                          key={sceneId}
                          className="p-2 border border-rule rounded text-xs bg-paper"
                        >
                          <span className="font-mono font-bold text-muted">Scene {scene.sceneNumber}:</span>
                          <span className="font-bold text-ink ml-1">{scene.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-muted text-center mt-4">
              Click another line in the network to inspect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
