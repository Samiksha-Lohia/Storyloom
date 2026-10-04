import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { 
  BookOpen, 
  FileText, 
  Users, 
  Activity, 
  Smile, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';

export default function OverviewTab({ documentId, source, options = {} }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [doc, setDoc] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    wordCount: 0,
    scenesCount: 0,
    charactersCount: 0,
    dominantMood: 'Analyzing...'
  });
  const [loading, setLoading] = useState(true);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!resolvedSource?.id || resolvedSource.id === 'null' || resolvedSource.id === 'undefined') {
      setLoading(false);
      return;
    }
    const abortController = new AbortController();

    loadData();

    // Start polling jobs only if document
    if (resolvedSource.kind === 'document') {
      loadJobs(abortController.signal);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(() => {
        loadJobs(abortController.signal);
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      abortController.abort();
    };
  }, [resolvedSource?.kind, resolvedSource?.id, JSON.stringify(options)]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load source info
      let sourceData = null;
      if (resolvedSource.kind === 'book') {
        sourceData = await api.books.getById(resolvedSource.id).catch(() => null);
      } else {
        sourceData = await api.documents.getById(resolvedSource.id).catch(() => null);
      }
      setDoc(sourceData);

      // Load characters to get count
      const charsRes = await api.analysis.getCharacters(resolvedSource, options).catch(() => []);
      const chars = charsRes?.data !== undefined ? (Array.isArray(charsRes.data) ? charsRes.data : charsRes.data?.results || []) : (Array.isArray(charsRes) ? charsRes : charsRes?.results || []);
      
      // Load scenes to get count
      const sceneRes = await api.analysis.getScenes(resolvedSource, options).catch(() => []);
      const scenes = sceneRes?.data?.results || sceneRes?.results || sceneRes?.data || sceneRes || [];
      
      // Calculate dominant mood
      let dominant = 'Neutral';
      const moodRes = await api.analysis.getMood(resolvedSource, options).catch(() => null);
      if (moodRes?.data?.summary?.dominantMood) {
        dominant = moodRes.data.summary.dominantMood;
      } else {
        const rawMoods = moodRes?.data !== undefined ? moodRes.data : moodRes;
        const moods = Array.isArray(rawMoods) ? rawMoods : rawMoods?.results || [];
        if (moods && moods.length > 0) {
          const counts = {};
          moods.forEach(m => {
            if (m.primaryMood) {
              counts[m.primaryMood] = (counts[m.primaryMood] || 0) + 1;
            }
          });
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) dominant = sorted[0][0];
        }
      }

      setStats({
        wordCount: sourceData?.wordCount || 0,
        scenesCount: scenes.length || sourceData?.totalScenes || 0,
        charactersCount: chars.length || 0,
        dominantMood: dominant
      });
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (signal) => {
    try {
      const jobList = await api.jobs.getStatus(documentId, signal);
      setJobs(jobList || []);

      // Check if there are any active/running/queued jobs
      const hasActiveJobs = (jobList || []).some(
        (job) => job.status === 'running' || job.status === 'queued'
      );

      // If no active jobs, stop polling
      if (!hasActiveJobs && jobList && jobList.length > 0) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load pipeline jobs:', err);
      }
    }
  };

  const handleRetryStage = async (stage) => {
    try {
      await api.jobs.retryStage(documentId, stage);
      loadJobs();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
      </div>
    );
  }

  const overallProgress = jobs.length 
    ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Banner */}
      <div className="relative bg-slate-900 text-white rounded-3xl p-6 md:p-8 overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full filter blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Analysis Summary</span>
          <h2 className="text-3xl font-serif font-bold text-slate-100 leading-tight">{doc?.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
            This workspace represents a structured breakdown of your story. Navigate the tabs to explore the timeline, character profiles, relationship network, and continuity checks.
          </p>
        </div>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Word Count */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Word Count</p>
            <p className="text-2xl font-semibold text-slate-950 font-mono">{stats.wordCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Scenes */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scenes</p>
            <p className="text-2xl font-semibold text-slate-950 font-mono">{stats.scenesCount}</p>
          </div>
        </div>

        {/* Characters */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Characters</p>
            <p className="text-2xl font-semibold text-slate-950 font-mono">{stats.charactersCount}</p>
          </div>
        </div>

        {/* Dominant Mood */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dominant Mood</p>
            <p className="text-lg font-semibold text-slate-950 capitalize truncate max-w-[120px]">{stats.dominantMood}</p>
          </div>
        </div>
      </div>

      {/* Analysis Pipeline Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Analysis Pipeline Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status of multi-stage AI analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 font-mono">{overallProgress}% complete</span>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Pipeline stage cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const statusConfig = {
              completed: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
              running: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> },
              queued: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', icon: <Activity className="w-4 h-4 text-slate-400" /> },
              failed: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4 text-red-600" /> }
            };

            const cfg = statusConfig[job.status] || statusConfig.queued;

            return (
              <div key={job.stage} className={`flex items-center justify-between p-4 border rounded-xl shadow-2xs ${cfg.bg} transition-all`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex-shrink-0">{cfg.icon}</div>
                  <div className="text-left overflow-hidden">
                    <span className="block text-sm font-semibold capitalize text-slate-800 truncate">{job.stage}</span>
                    <span className={`text-[10px] uppercase font-semibold ${cfg.text}`}>{job.status}</span>
                  </div>
                </div>
                {job.status === 'failed' && (
                  <button 
                    onClick={() => handleRetryStage(job.stage)}
                    className="p-1 text-red-800 hover:bg-red-100 rounded-md transition-colors"
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
