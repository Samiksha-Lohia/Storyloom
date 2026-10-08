import React, { useState, useEffect, useMemo } from 'react';
import { Users, Award, Tag, BookOpen, Heart } from 'lucide-react';
import { api } from '../services/api';

export default function CharactersTab({
  documentId,
  source,
  options = {},
  characters: initialCharacters = [],
  loading: initialLoading,
}) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);

  const [characters, setCharacters] = useState(initialCharacters || []);
  const [loading, setLoading] = useState(
    initialLoading !== undefined
      ? initialLoading
      : (!initialCharacters?.length && Boolean(resolvedSource?.id))
  );

  useEffect(() => {
    if (initialCharacters && initialCharacters.length > 0) {
      setCharacters(initialCharacters);
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
        const res = await api.analysis.getCharacters(resolvedSource, stableOptions);
        if (isCancelled) return;
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.results || raw?.characters || []);
        setCharacters(list);
      } catch (err) {
        console.error('Failed to load characters:', err);
        if (!isCancelled) setCharacters([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey, Boolean(initialCharacters?.length)]);

  const getRoleBadgeColor = (role) => {
    const r = role?.toLowerCase();
    if (r === 'protagonist') {
      return 'border-accent text-accent';
    }
    if (r === 'antagonist') {
      return 'border-danger text-danger';
    }
    return 'border-rule text-muted';
  };

  const sortedCharacters = useMemo(() => {
    const rolePriority = { protagonist: 1, antagonist: 2, supporting: 3 };
    return [...characters].sort((a, b) => {
      const rA = rolePriority[a.role?.toLowerCase()] || 99;
      const rB = rolePriority[b.role?.toLowerCase()] || 99;
      if (rA !== rB) return rA - rB;
      const countA = a.sceneIds?.length || 0;
      const countB = b.sceneIds?.length || 0;
      if (countA !== countB) return countB - countA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [characters]);

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (sortedCharacters.length === 0) {
    return (
      <div className="text-center py-16 bg-paper border border-rule rounded p-8">
        <Users className="w-8 h-8 text-muted mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink">No characters extracted yet</h3>
        <p className="text-xs text-muted mt-1">Make sure the character profiles job has completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Character Profiles</h2>
          <p className="text-xs text-muted mt-0.5 font-medium">Extract, merge aliases, and view developmental story arcs.</p>
        </div>
        <div className="text-xs font-semibold text-muted">
          Total Cast: {sortedCharacters.length} characters
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedCharacters.map((char) => {
          const charId = char._id || char.id;
          return (
            <div 
              key={charId}
              className="bg-paper border border-rule rounded p-6 text-left flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink">{char.name}</h3>
                    {char.aliases && char.aliases.length > 0 && (
                      <p className="text-xs text-muted font-medium mt-0.5">
                        Aliases: {char.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  {char.role && (
                    <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getRoleBadgeColor(char.role)}`}>
                      <Award className="w-3.5 h-3.5" />
                      {char.role}
                    </span>
                  )}
                </div>

                {char.traits && char.traits.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {char.traits.map((trait, tIdx) => (
                      <span 
                        key={tIdx}
                        className="px-2 py-0.5 bg-paper text-muted border border-rule rounded text-xs font-medium flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 text-muted" />
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                {char.description && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Description</span>
                    <p className="text-sm text-ink leading-relaxed">{char.description}</p>
                  </div>
                )}

                {char.arcSummary && (
                  <div className="space-y-1 bg-paper border border-rule rounded p-3 mt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                      <Heart className="w-3 h-3 text-muted" />
                      Character Arc Summary
                    </span>
                    <p className="text-xs text-ink leading-relaxed">&ldquo;{char.arcSummary}&rdquo;</p>
                  </div>
                )}
              </div>

              {char.sceneIds && char.sceneIds.length > 0 && (
                <div className="pt-3 border-t border-rule">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Appearances ({char.sceneIds.length} scenes)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {char.sceneIds.map((scene, sIdx) => {
                      const sceneNum = typeof scene === 'object' ? scene.sceneNumber : (sIdx + 1);
                      return (
                        <span 
                          key={sIdx}
                          className="px-2 py-0.5 bg-paper text-muted rounded text-[10px] font-semibold border border-rule cursor-default"
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
