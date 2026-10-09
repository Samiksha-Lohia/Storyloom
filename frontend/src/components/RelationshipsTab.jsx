import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  GitFork,
  Heart,
  HeartCrack,
  X,
  BookOpen,
  Search,
  Filter,
  LayoutGrid,
  Share2,
  RotateCcw,
  Users,
  Smile,
  Frown,
  Minus,
  Sparkles,
} from 'lucide-react';

const extractId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return (val._id || val.id)?.toString() || '';
};

const RELATIONSHIP_CONFIGS = {
  ally: {
    label: 'Ally',
    color: '#10B981',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Heart,
  },
  rival: {
    label: 'Rival',
    color: '#EF4444',
    bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: HeartCrack,
  },
  romantic: {
    label: 'Romantic',
    color: '#EC4899',
    bgColor: 'bg-pink-50 text-pink-700 border-pink-200',
    icon: Heart,
  },
  family: {
    label: 'Family',
    color: '#3B82F6',
    bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Users,
  },
  mentor: {
    label: 'Mentor',
    color: '#F59E0B',
    bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Sparkles,
  },
  other: {
    label: 'Other',
    color: '#64748B',
    bgColor: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: GitFork,
  },
};

const getRelConfig = (type = '') => {
  const normalized = type?.toLowerCase()?.trim();
  return RELATIONSHIP_CONFIGS[normalized] || RELATIONSHIP_CONFIGS.other;
};

export default function RelationshipsTab({
  documentId,
  source,
  options = {},
  summary = false,
  initialData = null,
}) {
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
    const list = Array.isArray(initialData.characters)
      ? initialData.characters
      : Object.values(initialData.characters);
    list.forEach((c) => {
      const id = extractId(c);
      if (id) map[id] = c;
    });
    return map;
  });
  const [scenes, setScenes] = useState({});
  const [loading, setLoading] = useState(!initialData && Boolean(resolvedSource?.id));

  // Filters State
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCharacterId, setSelectedCharacterId] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all'); // 'all', 'positive', 'neutral', 'negative'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'cards'
  const [focusedCharacterId, setFocusedCharacterId] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.relationships) {
      setRelationships(initialData.relationships);
    }
    const map = {};
    if (initialData.characters) {
      const list = Array.isArray(initialData.characters)
        ? initialData.characters
        : Object.values(initialData.characters);
      list.forEach((c) => {
        const id = extractId(c);
        if (id) map[id] = c;
      });
    }
    // Also extract any character objects embedded in relationships
    (initialData.relationships || []).forEach((r) => {
      if (r.characterA && typeof r.characterA === 'object' && r.characterA.name) {
        const idA = extractId(r.characterA);
        if (idA && !map[idA]) map[idA] = r.characterA;
      }
      if (r.characterB && typeof r.characterB === 'object' && r.characterB.name) {
        const idB = extractId(r.characterB);
        if (idB && !map[idB]) map[idB] = r.characterB;
      }
    });
    setCharacters(map);
    setLoading(false);
  }, [initialData]);

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
        const [charsRes, sceneRes, relRes] = await Promise.all([
          api.analysis.getCharacters(resolvedSource, stableOptions).catch(() => []),
          api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []),
          api.analysis.getRelationships(resolvedSource, stableOptions).catch(() => []),
        ]);

        if (isCancelled) return;

        const charsList =
          charsRes?.data !== undefined
            ? Array.isArray(charsRes.data)
              ? charsRes.data
              : charsRes.data?.results || []
            : Array.isArray(charsRes)
            ? charsRes
            : charsRes?.results || [];

        const charsMap = {};
        charsList.forEach((c) => {
          charsMap[extractId(c)] = c;
        });
        setCharacters(charsMap);

        const scenesList =
          sceneRes?.data?.results ||
          sceneRes?.results ||
          sceneRes?.data ||
          sceneRes ||
          [];
        const scenesMap = {};
        scenesList.forEach((s) => {
          scenesMap[extractId(s)] = s;
        });
        setScenes(scenesMap);

        const rawRel = relRes?.data !== undefined ? relRes.data : relRes;
        const relList = Array.isArray(rawRel) ? rawRel : rawRel?.results || [];

        // In existing stories, characters might be populated directly in relationships
        relList.forEach((r) => {
          if (r.characterA && typeof r.characterA === 'object' && r.characterA.name) {
            const idA = extractId(r.characterA);
            if (idA && !charsMap[idA]) {
              charsMap[idA] = r.characterA;
            }
          }
          if (r.characterB && typeof r.characterB === 'object' && r.characterB.name) {
            const idB = extractId(r.characterB);
            if (idB && !charsMap[idB]) {
              charsMap[idB] = r.characterB;
            }
          }
        });

        setCharacters(charsMap);
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

  // Available Characters List for dropdown
  const characterList = useMemo(() => {
    const list = Object.values(characters);
    const roleOrder = { protagonist: 1, antagonist: 2, supporting: 3 };
    return list.sort((a, b) => {
      const pA = roleOrder[a.role?.toLowerCase()] || 99;
      const pB = roleOrder[b.role?.toLowerCase()] || 99;
      if (pA !== pB) return pA - pB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [characters]);

  // Normalized Relationships
  const normalizedRelationships = useMemo(() => {
    return relationships.map((r, index) => {
      const charAId =
        extractId(r.characterA) || extractId(r.characterAId) || extractId(r.source);
      const charBId =
        extractId(r.characterB) || extractId(r.characterBId) || extractId(r.target);

      const type = (r.type || r.relationshipType || 'other').toLowerCase().trim();
      const sentimentScore = typeof r.sentimentScore === 'number' ? r.sentimentScore : 0;

      return {
        ...r,
        _id: r._id || r.id || `rel-${index}`,
        characterAId: charAId,
        characterBId: charBId,
        type,
        sentimentScore,
      };
    });
  }, [relationships]);

  // Available Types with Counts
  const typeCounts = useMemo(() => {
    const counts = { all: normalizedRelationships.length };
    normalizedRelationships.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [normalizedRelationships]);

  // Filtered Relationships
  const filteredRelationships = useMemo(() => {
    return normalizedRelationships.filter((rel) => {
      // 1. Type Filter
      if (selectedType !== 'all' && rel.type !== selectedType) {
        return false;
      }

      // 2. Character Filter (from dropdown)
      if (selectedCharacterId !== 'all') {
        if (
          rel.characterAId !== selectedCharacterId &&
          rel.characterBId !== selectedCharacterId
        ) {
          return false;
        }
      }

      // 3. Sentiment Filter
      if (sentimentFilter === 'positive' && rel.sentimentScore <= 0.1) return false;
      if (
        sentimentFilter === 'neutral' &&
        (rel.sentimentScore < -0.1 || rel.sentimentScore > 0.1)
      ) {
        return false;
      }
      if (sentimentFilter === 'negative' && rel.sentimentScore >= -0.1) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const charAName = characters[rel.characterAId]?.name?.toLowerCase() || '';
        const charBName = characters[rel.characterBId]?.name?.toLowerCase() || '';
        if (!charAName.includes(query) && !charBName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    normalizedRelationships,
    selectedType,
    selectedCharacterId,
    sentimentFilter,
    searchQuery,
    characters,
  ]);

  // Is any filter active?
  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedCharacterId !== 'all' ||
    sentimentFilter !== 'all' ||
    searchQuery.trim().length > 0 ||
    focusedCharacterId !== null;

  const resetFilters = useCallback(() => {
    setSelectedType('all');
    setSelectedCharacterId('all');
    setSentimentFilter('all');
    setSearchQuery('');
    setFocusedCharacterId(null);
    setSelectedEdge(null);
  }, []);

  // Connected nodes map for highlighting when a node is clicked / focused
  const focusedNeighbors = useMemo(() => {
    if (!focusedCharacterId) return null;
    const neighbors = new Set([focusedCharacterId]);
    filteredRelationships.forEach((rel) => {
      if (rel.characterAId === focusedCharacterId) neighbors.add(rel.characterBId);
      if (rel.characterBId === focusedCharacterId) neighbors.add(rel.characterAId);
    });
    return neighbors;
  }, [focusedCharacterId, filteredRelationships]);

  // ReactFlow Nodes & Edges Generation
  const { flowNodes, flowEdges } = useMemo(() => {
    // Determine which characters to place on graph
    const charIdsInFilteredEdges = new Set();
    filteredRelationships.forEach((r) => {
      if (r.characterAId) charIdsInFilteredEdges.add(r.characterAId);
      if (r.characterBId) charIdsInFilteredEdges.add(r.characterBId);
    });

    let displayChars = characterList.filter((c) =>
      charIdsInFilteredEdges.has(extractId(c))
    );

    // If no filtered edges or looking at all, include all characters that have any relationship
    if (displayChars.length === 0) {
      const allActiveIds = new Set();
      normalizedRelationships.forEach((r) => {
        if (r.characterAId) allActiveIds.add(r.characterAId);
        if (r.characterBId) allActiveIds.add(r.characterBId);
      });
      displayChars = characterList.filter((c) => allActiveIds.has(extractId(c)));
      if (displayChars.length === 0) {
        displayChars = characterList;
      }
    }

    const total = displayChars.length;
    const radius = Math.max(160, Math.min(280, total * 35));
    const centerX = 360;
    const centerY = 250;

    const nodes = displayChars.map((char, index) => {
      const charId = extractId(char);
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;

      const isFocused = focusedCharacterId === charId;
      const isNeighbor = focusedNeighbors ? focusedNeighbors.has(charId) : true;
      const isDimmed = focusedNeighbors && !isNeighbor;

      const role = char.role?.toLowerCase() || 'supporting';
      let roleBadgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
      if (role === 'protagonist') {
        roleBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      } else if (role === 'antagonist') {
        roleBadgeColor = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      }

      return {
        id: charId,
        type: 'default',
        data: {
          label: (
            <div
              className="text-center py-1.5 px-3 select-none cursor-pointer"
              onClick={() => {
                setFocusedCharacterId((prev) => (prev === charId ? null : charId));
              }}
            >
              <p className="font-bold text-xs text-ink truncate max-w-[120px]">
                {char.name}
              </p>
              <span
                className={`inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border mt-0.5 ${roleBadgeColor}`}
              >
                {char.role || 'cast'}
              </span>
            </div>
          ),
        },
        position: {
          x: centerX + radius * Math.cos(angle) - 60,
          y: centerY + radius * Math.sin(angle) - 25,
        },
        style: {
          border: isFocused
            ? '2px solid #C2410C'
            : isNeighbor
            ? '1px solid #D9D2C3'
            : '1px solid #E5E5E5',
          borderRadius: '8px',
          backgroundColor: isFocused ? '#FFF7ED' : '#FBF8F2',
          boxShadow: isFocused ? '0 0 12px rgba(194, 65, 12, 0.25)' : 'none',
          opacity: isDimmed ? 0.25 : 1,
          transition: 'all 0.2s ease',
          zIndex: isFocused ? 10 : 1,
        },
        className: 'bg-paper shadow-xs',
      };
    });

    const edges = filteredRelationships.map((rel, index) => {
      const relId = rel._id || `edge-${index}`;
      const config = getRelConfig(rel.type);

      const isConnectedToFocused =
        focusedCharacterId &&
        (rel.characterAId === focusedCharacterId ||
          rel.characterBId === focusedCharacterId);

      const isDimmed = focusedCharacterId && !isConnectedToFocused;

      const strokeColor = config.color;
      const strokeWidth = isConnectedToFocused ? 3.5 : 2;

      return {
        id: relId,
        source: rel.characterAId,
        target: rel.characterBId,
        type: 'smoothstep',
        animated: isConnectedToFocused,
        label: config.label,
        labelStyle: {
          fill: '#1E293B',
          fontWeight: 600,
          fontSize: 9,
          fontFamily: 'inherit',
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          rx: 4,
          ry: 4,
          stroke: '#CBD5E1',
          strokeWidth: 1,
        },
        labelBgPadding: [4, 2],
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity: isDimmed ? 0.1 : 0.85,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        data: { raw: rel },
      };
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [
    filteredRelationships,
    normalizedRelationships,
    characterList,
    focusedCharacterId,
    focusedNeighbors,
  ]);

  const handleEdgeClick = (event, edge) => {
    setSelectedEdge(edge.data?.raw || null);
  };

  // Compact Summary View for Books / Detail Page
  if (summary) {
    return (
      <div className="border border-rule rounded overflow-hidden bg-paper relative w-full h-[320px] min-h-[300px]">
        {flowNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-paper">
            <GitFork className="w-5 h-5 text-muted mb-2" />
            <p className="font-bold text-ink text-sm">No Cast Relationships Mapped</p>
            <p className="text-xs text-muted mt-0.5">
              Network will appear when interaction data is available.
            </p>
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
            fitViewOptions={{ padding: 0.2 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background color="#E2E8F0" gap={16} size={1} />
            <Controls
              showInteractive={false}
              className="!bg-paper !border-rule rounded scale-90 origin-bottom-left"
            />
          </ReactFlow>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-muted bg-paper border border-rule rounded">
        Loading relationship network…
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-4 text-left">
      {/* Top Filter & Control Toolbar */}
      <div className="bg-paper p-4 rounded border border-rule flex flex-col gap-3">
        {/* Row 1: Search, Character Focus & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[180px] max-w-[240px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search character..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-paper border border-rule rounded focus:outline-hidden focus:border-ink placeholder-muted text-ink"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Character Selector Dropdown */}
            <select
              value={selectedCharacterId}
              onChange={(e) => {
                setSelectedCharacterId(e.target.value);
                setFocusedCharacterId(null);
              }}
              className="px-3 py-1.5 text-xs bg-paper border border-rule rounded text-ink font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Characters ({characterList.length})</option>
              {characterList.map((char) => (
                <option key={extractId(char)} value={extractId(char)}>
                  {char.name} ({char.role || 'cast'})
                </option>
              ))}
            </select>

            {/* Sentiment Filter */}
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-rule">
              {[
                { id: 'all', label: 'All Tone' },
                { id: 'positive', label: 'Positive (+)' },
                { id: 'neutral', label: 'Neutral (0)' },
                { id: 'negative', label: 'Negative (-)' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSentimentFilter(s.id)}
                  className={`px-2 py-1 text-[11px] rounded cursor-pointer transition ${
                    sentimentFilter === s.id
                      ? 'bg-paper text-ink font-bold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Switcher & Reset Button */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1 text-xs text-muted hover:text-ink flex items-center gap-1 border border-rule rounded bg-paper cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}

            <div className="flex items-center border border-rule rounded bg-stone-100 p-0.5">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'graph'
                    ? 'bg-paper text-ink font-bold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Graph
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'cards'
                    ? 'bg-paper text-ink font-bold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Relationship Type Pills with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-rule/60">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1">
            Type:
          </span>
          {['all', 'ally', 'rival', 'romantic', 'family', 'mentor', 'other'].map(
            (type) => {
              const count = typeCounts[type] || 0;
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-0.5 rounded text-xs capitalize cursor-pointer border flex items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-ink text-paper border-ink font-bold'
                      : 'bg-paper text-muted border-rule hover:border-ink hover:text-ink'
                  }`}
                >
                  <span>{type}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-full ${
                      isSelected ? 'bg-paper/20 text-paper' : 'bg-stone-100 text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Focus Indicator Banner if user clicked a node */}
      {focusedCharacterId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            <span>
              Focusing on{' '}
              <strong>{characters[focusedCharacterId]?.name || 'Character'}</strong> —
              highlighting their direct connections only.
            </span>
          </div>
          <button
            onClick={() => setFocusedCharacterId(null)}
            className="text-xs font-bold text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear Focus
          </button>
        </div>
      )}

      {/* View Mode: GRAPH VIEW */}
      {viewMode === 'graph' && (
        <div className="w-full h-[540px] min-h-[480px] border border-rule rounded overflow-hidden bg-paper relative flex">
          <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
            {flowNodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-paper">
                <GitFork className="w-6 h-6 text-muted mb-2" />
                <p className="font-bold text-ink text-base">
                  No Relationships Match Current Filters
                </p>
                <p className="text-xs text-muted max-w-sm mt-1">
                  Try adjusting the type or sentiment filter to display character connections.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-3 px-3 py-1.5 text-xs bg-ink text-paper rounded font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* Visual Legend */}
                <div className="absolute top-3 left-3 z-10 bg-paper/95 backdrop-blur-xs border border-rule px-3 py-2 rounded shadow-xs text-[10px] space-y-1">
                  <span className="font-bold text-muted uppercase tracking-wider block">
                    Connection Types
                  </span>
                  <div className="flex flex-wrap gap-2 text-ink">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ally
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Rival
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-500" /> Romantic
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Family
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Mentor
                    </span>
                  </div>
                  <span className="text-muted block pt-0.5 text-[9px]">
                    Tip: Click any character node to highlight their connections.
                  </span>
                </div>

                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  onEdgeClick={handleEdgeClick}
                  fitView
                  fitViewOptions={{ padding: 0.25 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Background color="#E2E8F0" gap={20} size={1} />
                  <Controls className="!bg-paper !border-rule rounded" />
                </ReactFlow>
              </>
            )}
          </div>

          {/* Edge / Connection Details Drawer */}
          {selectedEdge && (
            <div className="absolute top-4 right-4 bottom-4 w-80 bg-paper border border-rule rounded p-5 overflow-y-auto flex flex-col justify-between z-20 text-left shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <h3 className="font-bold text-ink flex items-center gap-1.5 text-sm">
                    {React.createElement(getRelConfig(selectedEdge.type).icon, {
                      className: 'w-4 h-4',
                      style: { color: getRelConfig(selectedEdge.type).color },
                    })}
                    Connection Details
                  </h3>
                  <button
                    onClick={() => setSelectedEdge(null)}
                    className="p-1 rounded text-muted hover:text-ink cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-stone-50 p-3 rounded border border-rule">
                  <span className="text-sm font-bold text-ink">
                    {characters[selectedEdge.characterAId]?.name || 'Character A'}
                  </span>
                  <span className="text-muted font-mono text-xs">↔</span>
                  <span className="text-sm font-bold text-ink">
                    {characters[selectedEdge.characterBId]?.name || 'Character B'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-paper p-2.5 rounded border border-rule">
                    <span className="block text-muted uppercase font-bold text-[9px] tracking-wider">
                      Type
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border mt-0.5 capitalize ${
                        getRelConfig(selectedEdge.type).bgColor
                      }`}
                    >
                      {selectedEdge.type}
                    </span>
                  </div>
                  <div className="bg-paper p-2.5 rounded border border-rule">
                    <span className="block text-muted uppercase font-bold text-[9px] tracking-wider">
                      Sentiment
                    </span>
                    <span
                      className={`font-bold text-[11px] block mt-1 ${
                        selectedEdge.sentimentScore > 0.1
                          ? 'text-emerald-700'
                          : selectedEdge.sentimentScore < -0.1
                          ? 'text-rose-700'
                          : 'text-stone-700'
                      }`}
                    >
                      {selectedEdge.sentimentScore > 0 ? '+' : ''}
                      {selectedEdge.sentimentScore.toFixed(2)}
                    </span>
                  </div>
                </div>

                {selectedEdge.sceneIds && selectedEdge.sceneIds.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Shared Scenes ({selectedEdge.sceneIds.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedEdge.sceneIds.map((sceneId) => {
                        const sId = extractId(sceneId);
                        const scene = scenes[sId];
                        return (
                          <div
                            key={sId}
                            className="p-2 border border-rule rounded text-xs bg-paper flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-muted">
                              Scene {scene?.sceneNumber || '•'}
                            </span>
                            <span className="font-bold text-ink truncate max-w-[170px]">
                              {scene?.title || 'Shared Interaction'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedEdge(null)}
                className="w-full mt-4 py-1.5 text-xs text-muted hover:text-ink border border-rule rounded bg-stone-50 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          )}
        </div>
      )}

      {/* View Mode: CONNECTION CARDS VIEW (Clean & Non-Overwhelming) */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filteredRelationships.length === 0 ? (
            <div className="p-12 text-center bg-paper border border-rule rounded">
              <Users className="w-6 h-6 text-muted mx-auto mb-2" />
              <p className="font-bold text-ink text-sm">No Relationships Found</p>
              <p className="text-xs text-muted mt-1">
                No character pairs match the current filter selection.
              </p>
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1.5 text-xs bg-ink text-paper rounded font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRelationships.map((rel) => {
                const charA = characters[rel.characterAId];
                const charB = characters[rel.characterBId];
                const config = getRelConfig(rel.type);
                const isSelected = selectedEdge?._id === rel._id;

                return (
                  <div
                    key={rel._id}
                    onClick={() => setSelectedEdge(rel)}
                    className={`p-4 rounded border transition cursor-pointer bg-paper ${
                      isSelected
                        ? 'border-ink ring-1 ring-ink shadow-sm'
                        : 'border-rule hover:border-ink/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${config.bgColor}`}
                      >
                        {React.createElement(config.icon, { className: 'w-3 h-3' })}
                        {config.label}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          rel.sentimentScore > 0.1
                            ? 'text-emerald-700'
                            : rel.sentimentScore < -0.1
                            ? 'text-rose-700'
                            : 'text-stone-600'
                        }`}
                      >
                        Sentiment: {rel.sentimentScore > 0 ? '+' : ''}
                        {rel.sentimentScore.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded border border-rule/60 my-2">
                      <div>
                        <p className="font-bold text-xs text-ink">
                          {charA?.name || 'Character A'}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider text-muted">
                          {charA?.role || 'cast'}
                        </span>
                      </div>
                      <span className="text-muted font-bold text-sm">↔</span>
                      <div className="text-right">
                        <p className="font-bold text-xs text-ink">
                          {charB?.name || 'Character B'}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider text-muted">
                          {charB?.role || 'cast'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                      <span>Shared Scenes: {rel.sceneIds?.length || 1}</span>
                      <span className="text-ink font-bold hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
