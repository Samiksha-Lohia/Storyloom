import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Loader2, BookOpen, MessageSquare, Users, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function SearchTab({ documentId, source, options = {}, onNavigateToScene }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [sceneRangeFrom, setSceneRangeFrom] = useState('');
  const [sceneRangeTo, setSceneRangeTo] = useState('');

  // Auxiliary lists for filters
  const [charactersList, setCharactersList] = useState([]);

  useEffect(() => {
    loadAuxiliaryData();
  }, [resolvedSource?.kind, resolvedSource?.id, JSON.stringify(options)]);

  const loadAuxiliaryData = async () => {
    if (!resolvedSource?.id) return;
    try {
      const res = await api.analysis.getCharacters(resolvedSource, options).catch(() => []);
      const raw = res?.data !== undefined ? res.data : res;
      const chars = Array.isArray(raw) ? raw : raw?.results || [];
      setCharactersList(chars || []);
    } catch (err) {
      console.error('Failed to load search filter lists:', err);
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || !resolvedSource?.id) return;

    setLoading(true);
    try {
      const filters = {};
      if (selectedCharacter) filters.character = selectedCharacter;
      if (selectedMood) filters.mood = selectedMood;
      if (sceneRangeFrom) filters.sceneRangeFrom = parseInt(sceneRangeFrom, 10);
      if (sceneRangeTo) filters.sceneRangeTo = parseInt(sceneRangeTo, 10);

      const res = await api.analysis.search(resolvedSource, query, filters, options);
      const raw = res?.data !== undefined ? res.data : res;
      setResults(Array.isArray(raw) ? raw : raw?.results || []);
    } catch (err) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (sourceType) => {
    if (sourceType === 'scene') return <BookOpen className="w-5 h-5 text-purple-600" />;
    if (sourceType === 'dialogue_summary') return <MessageSquare className="w-5 h-5 text-blue-600" />;
    if (sourceType === 'character') return <Users className="w-5 h-5 text-rose-600" />;
    return <Sparkles className="w-5 h-5 text-slate-500" />;
  };

  const getSourceTypeName = (sourceType) => {
    if (sourceType === 'scene') return 'Scene Breakdown';
    if (sourceType === 'dialogue_summary') return 'Dialogue snippet';
    if (sourceType === 'character') return 'Character sheet';
    return 'Story record';
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Semantic Search</h2>
        <p className="text-xs text-slate-500 mt-0.5">Ask questions about your story in plain English, powered by AI vector embeddings.</p>
      </div>

      {/* Search Input bar */}
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. When did the inspector find the notebook?"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-2xs"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 border rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
              showFilters || selectedCharacter || selectedMood || sceneRangeFrom || sceneRangeTo
                ? 'bg-slate-900 border-slate-900 text-white' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            title="Toggle filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Collapsible Filters box */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            {/* Character filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">Speaker / Character:</span>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden"
              >
                <option value="">Any Character</option>
                {charactersList.map(c => (
                  <option key={c._id || c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Mood filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">Scene Mood:</span>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden"
              >
                <option value="">Any Mood</option>
                <option value="joy">Joy</option>
                <option value="tension">Tension</option>
                <option value="grief">Grief</option>
                <option value="fear">Fear</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            {/* Scene Range from */}
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">Scene Range (From):</span>
              <input
                type="number"
                min="1"
                placeholder="Start Scene"
                value={sceneRangeFrom}
                onChange={(e) => setSceneRangeFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            {/* Scene Range to */}
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">Scene Range (To):</span>
              <input
                type="number"
                min="1"
                placeholder="End Scene"
                value={sceneRangeTo}
                onChange={(e) => setSceneRangeTo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </form>

      {/* Search results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 font-semibold">AI is searching embeddings database...</p>
        </div>
      ) : results.length === 0 ? (
        query.trim() && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <p className="text-sm text-slate-500">No matching concepts found for your query. Try rephrasing!</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Semantic Matches ({results.length})
          </h3>
          
          <div className="space-y-3">
            {results.map((res, index) => {
              const scorePercent = Math.round(res.score * 100);
              
              return (
                <div 
                  key={index}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-start gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">
                    {getResultIcon(res.sourceType)}
                  </div>
                  
                  <div className="flex-1 text-left space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {getSourceTypeName(res.sourceType)}
                      </span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-bold font-mono">
                        {scorePercent}% Match
                      </span>
                    </div>

                    {/* Result Content */}
                    <p className="text-sm text-slate-700 leading-relaxed font-serif">
                      {res.text}
                    </p>

                    {/* Meta info / Action linking */}
                    {res.sceneNumber && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          Linked to Scene {res.sceneNumber}
                        </span>
                        
                        <button
                          onClick={() => onNavigateToScene && onNavigateToScene(res.sceneNumber)}
                          className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Jump to Source →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
