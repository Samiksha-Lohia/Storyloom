import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { 
  BookOpen, 
  FileText, 
  Users, 
  Activity, 
  Smile, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';

export default function OverviewTab({ documentId, source, options = {} }) {
  const resolvedSource = useMemo(
    () => source || (documentId ? { kind: 'document', id: documentId } : null),
    [source, documentId]
  );
  const optionsKey = JSON.stringify(options || {});
  const stableOptions = useMemo(() => options || {}, [optionsKey]);
  const [doc, setDoc] = useState(null);
  const [jobs, setJobs] = useState([]);
  const jobsRef = useRef([]);
  const [stats, setStats] = useState({
    wordCount: 0,
    scenesCount: 0,
    charactersCount: 0,
    dominantMood: null,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (isBackground = false) => {
    if (!resolvedSource?.id || resolvedSource.id === 'null' || resolvedSource.id === 'undefined') {
      setLoading(false);
      return;
    }
    if (!isBackground) {
      setLoading(true);
    }
    try {
      let sourceData = null;
      if (resolvedSource.kind === 'book') {
        sourceData = await api.books.getById(resolvedSource.id).catch(() => null);
      } else {
        sourceData = await api.documents.getById(resolvedSource.id).catch(() => null);
      }
      setDoc(sourceData);

      const charsRes = await api.analysis.getCharacters(resolvedSource, stableOptions).catch(() => []);
      const chars = charsRes?.data !== undefined ? (Array.isArray(charsRes.data) ? charsRes.data : charsRes.data?.results || []) : (Array.isArray(charsRes) ? charsRes : charsRes?.results || []);

      const scenesRes = await api.analysis.getScenes(resolvedSource, stableOptions).catch(() => []);
      const scenes = scenesRes?.data?.results || scenesRes?.results || scenesRes?.data || scenesRes || [];

      let jobsList = [];
      try {
        const jobsRes = await api.analysis.getPipelineStatus(resolvedSource.id, stableOptions);
        jobsList = jobsRes?.data?.jobs || jobsRes?.jobs || [];
      } catch {
        jobsList = [];
      }
      setJobs(jobsList);
      jobsRef.current = jobsList;

      let words = 0;
      if (sourceData?.manuscriptText) {
        words = sourceData.manuscriptText.trim().split(/\s+/).length;
      } else if (sourceData?.content) {
        words = sourceData.content.trim().split(/\s+/).length;
      } else if (sourceData?.pageCount) {
        words = sourceData.pageCount * 250;
      }

      setStats({
        wordCount: words,
        scenesCount: Array.isArray(scenes) ? scenes.length : 0,
        charactersCount: Array.isArray(chars) ? chars.length : 0,
        dominantMood: sourceData?.dominantMood || sourceData?.overallTone || null,
      });

    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [resolvedSource?.id, resolvedSource?.kind, optionsKey]);

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      if (jobsRef.current.some(j => j.status === 'running' || j.status === 'queued')) {
        loadData(true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleRetryStage = async (stage) => {
    try {
      if (resolvedSource?.id) {
        await api.analysis.retryPipelineStage(resolvedSource.id, stage);
        loadData();
      }
    } catch (err) {
      console.error(`Failed to retry stage ${stage}:`, err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-muted">
        Loading…
      </div>
    );
  }

  const overallProgress = jobs.length 
    ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-paper border border-rule rounded p-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Analysis Summary</span>
          <h2 className="text-xl font-bold text-ink leading-tight">{doc?.title}</h2>
          <p className="text-xs text-muted leading-relaxed max-w-xl font-body">
            Structured manuscript breakdown. Navigate the tabs to inspect timeline, character profiles, and relationships.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-muted">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Word Count</p>
            <p className="text-lg font-bold text-ink font-mono">{stats.wordCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-muted">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Scenes</p>
            <p className="text-lg font-bold text-ink font-mono">{stats.scenesCount}</p>
          </div>
        </div>

        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-muted">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Characters</p>
            <p className="text-lg font-bold text-ink font-mono">{stats.charactersCount}</p>
          </div>
        </div>

        <div className="bg-paper border border-rule p-4 rounded flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-muted">
            <Smile className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Dominant Mood</p>
            <p className="text-base font-bold text-ink capitalize truncate max-w-[120px]">{stats.dominantMood}</p>
          </div>
        </div>
      </div>

      <div className="bg-paper border border-rule rounded p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Analysis Pipeline Status</h3>
            <p className="text-xs text-muted">Multi-stage analysis progress</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted">{overallProgress}% complete</span>
            <div className="w-24 h-1 bg-rule rounded overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((job) => {
            const statusConfig = {
              completed: { text: 'text-success', icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
              running: { text: 'text-accent', icon: <Activity className="w-4 h-4 text-accent" /> },
              queued: { text: 'text-muted', icon: <Activity className="w-4 h-4 text-muted" /> },
              failed: { text: 'text-danger', icon: <AlertCircle className="w-4 h-4 text-danger" /> }
            };

            const cfg = statusConfig[job.status] || statusConfig.queued;

            return (
              <div key={job.stage} className="flex items-center justify-between p-3 border border-rule rounded bg-paper">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex-shrink-0">{cfg.icon}</div>
                  <div className="text-left overflow-hidden">
                    <span className="block text-xs font-bold capitalize text-ink truncate">{job.stage}</span>
                    <span className={`text-[10px] uppercase font-semibold ${cfg.text}`}>{job.status}</span>
                  </div>
                </div>
                {job.status === 'failed' && (
                  <button 
                    onClick={() => handleRetryStage(job.stage)}
                    className="p-1 text-danger hover:bg-rule/40 rounded cursor-pointer"
                    title="Retry this stage"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
