import React, { useState } from 'react';
import { api } from '../services/api';
import { Search, SlidersHorizontal, BookOpen, MessageSquare, Award } from 'lucide-react';

export default function SearchTab({ documentId, source, charactersList = [], onNavigateToScene }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [sceneRangeFrom, setSceneRangeFrom] = useState('');
  const [sceneRangeTo, setSceneRangeTo] = useState('');

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading || !resolvedSource?.id) return;

    setLoading(true);
    try {
      const filters = {};
      if (selectedCharacter) filters.character = selectedCharacter;
      if (selectedMood) filters.mood = selectedMood;
      if (sceneRangeFrom) filters.sceneFrom = parseInt(sceneRangeFrom, 10);
      if (sceneRangeTo) filters.sceneTo = parseInt(sceneRangeTo, 10);

      const res = await api.analysis.semanticSearch(resolvedSource, query, filters);
      setResults(res?.data?.results || res?.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeName = (sourceType) => {
    switch (sourceType) {
      case 'scene': return 'Scene Summary';
      case 'dialogue': return 'Dialogue Line';
      case 'character_arc': return 'Character Arc';
      default: return 'Story Passage';
    }
  };

  const getResultIcon = (sourceType) => {
    switch (sourceType) {
      case 'scene': return <BookOpen className="w-4 h-4 text-ink" />;
      case 'dialogue': return <MessageSquare className="w-4 h-4 text-ink" />;
      case 'character_arc': return <Award className="w-4 h-4 text-ink" />;
      default: return <BookOpen className="w-4 h-4 text-ink" />;
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-ink">Semantic Search</h2>
        <p className="text-xs text-muted mt-0.5">Ask questions about your story in plain English, powered by AI vector embeddings.</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted" />
            </div>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. When did the inspector find the notebook?"
              className="w-full pl-9 pr-3 py-2 bg-paper border border-rule rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-ink"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded flex items-center justify-center cursor-pointer ${
              showFilters || selectedCharacter || selectedMood || sceneRangeFrom || sceneRangeTo
                ? 'bg-ink border-ink text-paper' 
                : 'bg-paper border-rule text-ink hover:border-ink'
            }`}
            title="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-ink text-paper rounded text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-accent disabled:opacity-40"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {showFilters && (
          <div className="bg-paper border border-rule rounded p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted">Speaker / Character:</span>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-rule bg-paper text-ink rounded focus:outline-hidden"
              >
                <option value="">Any Character</option>
                {charactersList.map(c => (
                  <option key={c._id || c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted">Scene Mood:</span>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-rule bg-paper text-ink rounded focus:outline-hidden"
              >
                <option value="">Any Mood</option>
                <option value="joy">Joy</option>
                <option value="tension">Tension</option>
                <option value="grief">Grief</option>
                <option value="fear">Fear</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted">Scene Range (From):</span>
              <input
                type="number"
                min="1"
                placeholder="Start Scene"
                value={sceneRangeFrom}
                onChange={(e) => setSceneRangeFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-rule bg-paper text-ink rounded focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted">Scene Range (To):</span>
              <input
                type="number"
                min="1"
                placeholder="End Scene"
                value={sceneRangeTo}
                onChange={(e) => setSceneRangeTo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-rule bg-paper text-ink rounded focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </form>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted text-sm">
          Loading…
        </div>
      ) : results.length === 0 ? (
        query.trim() && (
          <div className="text-center py-12 bg-paper border border-rule rounded">
            <p className="text-sm text-muted">No matching concepts found for your query. Try rephrasing!</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
            Semantic Matches ({results.length})
          </h3>
          
          <div className="space-y-3">
            {results.map((res, index) => {
              const scorePercent = Math.round(res.score * 100);
              
              return (
                <div 
                  key={index}
                  className="bg-paper border border-rule rounded p-4 flex items-start gap-4"
                >
                  <div className="p-2 border border-rule rounded shrink-0">
                    {getResultIcon(res.sourceType)}
                  </div>
                  
                  <div className="flex-1 text-left space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        {getSourceTypeName(res.sourceType)}
                      </span>
                      <span className="px-2 py-0.5 border border-rule text-success rounded text-[10px] font-bold">
                        {scorePercent}% Match
                      </span>
                    </div>

                    <p className="text-sm text-ink leading-relaxed">
                      {res.text}
                    </p>

                    {res.sceneNumber && (
                      <div className="flex items-center justify-between pt-2 border-t border-rule mt-1">
                        <span className="text-xs font-semibold text-muted">
                          Linked to Scene {res.sceneNumber}
                        </span>
                        
                        <button
                          onClick={() => onNavigateToScene && onNavigateToScene(res.sceneNumber)}
                          className="text-xs font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Jump to Source &rarr;
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
