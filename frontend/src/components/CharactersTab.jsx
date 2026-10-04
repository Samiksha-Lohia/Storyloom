import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Tag, Award, Heart, BookOpen } from 'lucide-react';

export default function CharactersTab({ documentId, source, options = {} }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState(null);

  useEffect(() => {
    loadCharacters();
  }, [resolvedSource?.kind, resolvedSource?.id, JSON.stringify(options)]);

  const loadCharacters = async () => {
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.analysis.getCharacters(resolvedSource, options).catch(() => []);
      if (res?.analysisStatus) {
        setAnalysisStatus(res.analysisStatus);
      }
      const raw = res?.data !== undefined ? res.data : res;
      const items = Array.isArray(raw) ? raw : raw?.results || [];
      setCharacters(items || []);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    if (!role) return 'bg-slate-100 border-slate-200 text-slate-700';
    const r = role.toLowerCase();
    if (r === 'protagonist') {
      return 'bg-amber-100 border-amber-300 text-amber-900';
    }
    if (r === 'antagonist') {
      return 'bg-rose-100 border-rose-300 text-rose-900';
    }
    return 'bg-slate-100 border-slate-200 text-slate-600';
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-8">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">No characters extracted yet</h3>
        <p className="text-sm text-slate-500 mt-1">Make sure the character profiles job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Character Profiles</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Extract, merge aliases, and view developmental story arcs.</p>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Cast: {characters.length} characters
        </div>
      </div>

      {/* Characters Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {characters.map((char) => {
          const charId = char._id || char.id;
          return (
            <div 
              key={charId}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all p-6 text-left flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Highlight background blob for Protagonists */}
              {char.role?.toLowerCase() === 'protagonist' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              )}

              <div className="space-y-3">
                {/* Header: Name & Role */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-slate-900">{char.name}</h3>
                    {char.aliases && char.aliases.length > 0 && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Aliases: {char.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  {char.role && (
                    <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getRoleBadgeColor(char.role)}`}>
                      <Award className="w-3.5 h-3.5" />
                      {char.role}
                    </span>
                  )}
                </div>

                {/* Traits tags */}
                {char.traits && char.traits.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {char.traits.map((trait, tIdx) => (
                      <span 
                        key={tIdx}
                        className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-md text-xs font-medium flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                {/* Biography Description */}
                {char.description && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
                    <p className="text-sm text-slate-600 leading-relaxed font-serif">{char.description}</p>
                  </div>
                )}

                {/* Character Arc Summary */}
                {char.arcSummary && (
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 mt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-slate-400" />
                      Character Arc Summary
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed font-serif italic">"{char.arcSummary}"</p>
                  </div>
                )}
              </div>

              {/* Appearances Timeline */}
              {char.sceneIds && char.sceneIds.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Appearances ({char.sceneIds.length} scenes)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {char.sceneIds.map((scene, sIdx) => {
                      // scene can be sceneId string or scene object
                      const sceneNum = typeof scene === 'object' ? scene.sceneNumber : (sIdx + 1);
                      return (
                        <span 
                          key={sIdx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200 hover:bg-slate-950 hover:text-white hover:border-transparent transition-colors cursor-default"
                        >
                          Scene {sceneNum}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
