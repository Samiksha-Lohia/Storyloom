import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { ShieldAlert as _ShieldAlert, AlertTriangle as _AlertTriangle, CheckCircle, Check, EyeOff, Archive, BookOpen } from 'lucide-react';

export default function ContinuityTab({ documentId, source, options = {} }) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const stableOptions = useMemo(() => options, [options]);
  const [issues, setIssues] = useState([]);
  const [scenes, setScenes] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'reviewed' | 'resolved' | 'dismissed' | 'all'
  const [severityFilter, setSeverityFilter] = useState('all');

  const loadData = useCallback(async () => {
    if (!resolvedSource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch scenes to resolve names in the log
      const sceneRes = await api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []);
      const sceneRaw = sceneRes?.data !== undefined ? sceneRes.data : sceneRes;
      const scenesList = Array.isArray(sceneRaw) ? sceneRaw : sceneRaw?.results || [];
      const scenesMap = {};
      scenesList.forEach(s => {
        scenesMap[s._id || s.id] = s;
      });
      setScenes(scenesMap);

      // 2. Fetch continuity issues
      const res = await api.analysis.getContinuity(resolvedSource, stableOptions).catch(() => []);
      const raw = res?.data !== undefined ? res.data : res;
      setIssues(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load continuity issues:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedSource, stableOptions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (issueId, newStatus) => {
    if (!resolvedSource?.id) return;
    try {
      const updated = await api.analysis.updateContinuityStatus(resolvedSource, issueId, newStatus);
      
      // Update local state
      setIssues(prev => prev.map(issue => {
        const id = issue._id || issue.id;
        if (id === issueId) {
          return { ...issue, status: updated?.status || newStatus };
        }
        return issue;
      }));
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Filter logic
  const filteredIssues = issues.filter(issue => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && issue.status !== 'open') return false;
      if (statusFilter === 'reviewed' && issue.status !== 'reviewed') return false;
      if (statusFilter === 'resolved' && issue.status !== 'resolved') return false;
      if (statusFilter === 'dismissed' && issue.status !== 'dismissed') return false;
    }
    // Severity filter
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity) => {
    const s = severity?.toLowerCase();
    if (s === 'high') {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    if (s === 'medium') {
      return 'bg-amber-50 border-amber-200 text-amber-700';
    }
    return 'bg-slate-50 border-slate-200 text-slate-600';
  };

  const getTypeLabel = (type) => {
    if (type === 'attribute-conflict') return 'Character Attribute Conflict';
    if (type === 'timeline-conflict') return 'Timeline Sequence Contradiction';
    if (type === 'unexplained-gap') return 'Unexplained Narrative Gap';
    return 'Continuity Inconsistency';
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Continuity Checker</h2>
          <p className="text-xs text-slate-500 mt-0.5">Flags inconsistencies in character traits, timeline events, or narrative gaps.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="open">Open Inconsistencies</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All Issues</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="all">All Severities</option>
              <option value="high">High Severity Only</option>
              <option value="medium">Medium Severity</option>
              <option value="low">Low Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Continuity Issues log */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No continuity issues found</h3>
          <p className="text-sm text-slate-500 mt-1">Your manuscript is clean of detected timeline or character attribute gaps!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const issueId = issue._id || issue.id;
            
            return (
              <div 
                key={issueId}
                className="bg-paper border border-rule rounded p-6 flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="space-y-3 max-w-[75%]">
                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 border border-rule rounded text-[9px] font-bold uppercase tracking-wider ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity} severity
                    </span>
                    <span className="text-xs font-bold text-muted uppercase tracking-wider font-mono">
                      {getTypeLabel(issue.type)}
                    </span>
                  </div>

                  {/* Conflict description */}
                  <p className="text-sm text-ink leading-relaxed font-body">
                    {issue.description}
                  </p>

                  {/* Scenes involved */}
                  {issue.sceneIds && issue.sceneIds.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-muted" />
                        Conflicting Scenes
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {issue.sceneIds.map((sceneId) => {
                          const scene = scenes[sceneId];
                          if (!scene) return null;
                          return (
                            <span 
                              key={sceneId}
                              className="px-2.5 py-0.5 bg-paper border border-rule rounded text-[10px] font-semibold text-ink"
                            >
                              Scene {scene.sceneNumber}: {scene.title}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Issue Actions panel */}
                <div className="flex items-center gap-2 self-end md:self-start bg-paper p-2 rounded border border-rule flex-shrink-0">
                  {issue.status === 'open' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(issueId, 'reviewed')}
                        className="px-2.5 py-1.5 bg-paper border border-rule text-ink hover:bg-rule/40 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Mark as reviewed"
                      >
                        <Archive className="w-4 h-4" />
                        Review
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(issueId, 'resolved')}
                        className="px-2.5 py-1.5 bg-ink text-paper rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Mark as resolved"
                      >
                        <Check className="w-4 h-4" />
                        Resolve
                      </button>
                    </>
                  )}

                  {issue.status === 'reviewed' && (
                    <>
                      <span className="text-xs font-semibold text-muted px-2 italic">Reviewed</span>
                      <button
                        onClick={() => handleUpdateStatus(issueId, 'resolved')}
                        className="p-1.5 hover:bg-rule/40 rounded text-muted hover:text-ink cursor-pointer"
                        title="Resolve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(issueId, 'dismissed')}
                        className="p-1.5 hover:bg-rule/40 rounded text-muted hover:text-ink cursor-pointer"
                        title="Dismiss"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {issue.status === 'resolved' && (
                    <span className="text-xs font-semibold text-success bg-paper px-2.5 py-1.5 border border-rule rounded flex items-center gap-1">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      Resolved
                    </span>
                  )}

                  {issue.status === 'dismissed' && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1.5 border border-slate-200/50 rounded-lg flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" />
                      Dismissed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
