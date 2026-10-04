import { useState, useEffect, useRef, useCallback } from 'react';
import { socketClient } from '../services/socket';
import { api } from '../services/api';

export const PIPELINE_STAGES = [
  { id: 'parsing', label: 'Parsing & Pagination', desc: 'Slicing text into deterministic pages and offsets' },
  { id: 'scenes', label: 'Scene Breakdown', desc: 'Segmenting narrative beats, locations, and timeframes' },
  { id: 'characters', label: 'Character Extraction', desc: 'Identifying entities, descriptions, and motivations' },
  { id: 'relationships', label: 'Relationship Graph', desc: 'Mapping interpersonal dynamics and friction' },
  { id: 'timeline', label: 'Story Timeline', desc: 'Reconstructing linear and chronological event flow' },
  { id: 'dialogue', label: 'Dialogue Analysis', desc: 'Scoring character subtext, cadence, and voice' },
  { id: 'mood', label: 'Mood & Emotional Tone', desc: 'Evaluating scene atmosphere and tension' },
  { id: 'arc', label: 'Narrative Arc', desc: 'Plotting exposition, rising action, and climax' },
  { id: 'continuity', label: 'Continuity Validation', desc: 'Checking plot consistency across scenes' },
  { id: 'embeddings', label: 'Search Embeddings', desc: 'Indexing semantic vectors for rapid querying' },
];

export function usePipelineProgress(documentId, options = {}) {
  const { onComplete, onPaginated } = options;

  const [jobs, setJobs] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStageText, setCurrentStageText] = useState('Initializing analysis pipeline...');
  const [activeStage, setActiveStage] = useState(null);
  const [failedStage, setFailedStage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isPaginated, setIsPaginated] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Poll fallback to query DB state
  const fetchStatus = useCallback(async (docId) => {
    if (!docId) return;
    try {
      const jobList = await api.jobs.getStatus(docId);
      if (!isMountedRef.current || !jobList) return;

      setJobs(jobList);

      let completedCount = 0;
      let running = null;
      let failed = null;
      const totalStages = jobList.length || 10;

      jobList.forEach((job) => {
        if (job.status === 'completed') completedCount++;
        if (job.status === 'running') running = job.stage;
        if (job.status === 'failed') failed = job;
      });

      // Parsing completed check
      const parsingJob = jobList.find((j) => j.stage === 'parsing');
      if (parsingJob && parsingJob.status === 'completed') {
        setIsPaginated(true);
      }

      const percent = Math.min(100, Math.round((completedCount / totalStages) * 100));
      setOverallProgress(percent);

      if (failed) {
        setFailedStage(failed);
        setErrorMsg(failed.error || 'A processing pipeline job failed.');
        setCurrentStageText(`Failed during ${failed.stage}`);
        return;
      }

      if (running) {
        setActiveStage(running);
        const stageInfo = PIPELINE_STAGES.find((s) => s.id === running);
        setCurrentStageText(stageInfo ? `${stageInfo.label}...` : `${running}...`);
      } else if (completedCount >= totalStages && totalStages > 0) {
        setIsReady(true);
        setCurrentStageText('Pipeline analysis complete!');
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (onComplete) {
          onComplete(docId);
        }
      } else {
        const nextJob = jobList.find((j) => j.status !== 'completed');
        if (nextJob) {
          const stageInfo = PIPELINE_STAGES.find((s) => s.id === nextJob.stage);
          setCurrentStageText(`Queued: ${stageInfo ? stageInfo.label : nextJob.stage}`);
        }
      }
    } catch (err) {
      if (isMountedRef.current && err.status !== 404) {
        console.warn('Status poll warning:', err.message);
      }
    }
  }, [onComplete]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!documentId) return;

    // 1. Initial status fetch
    fetchStatus(documentId);

    // 2. Setup polling fallback (every 3 seconds)
    pollTimerRef.current = setInterval(() => {
      fetchStatus(documentId);
    }, 3000);

    // 3. Setup WebSocket connection via socketClient singleton
    const room = `document:${documentId}`;
    socketClient.joinRoom(room);

    const onStageStarted = ({ stage }) => {
      if (!isMountedRef.current) return;
      setActiveStage(stage);
      const stageInfo = PIPELINE_STAGES.find((s) => s.id === stage);
      setCurrentStageText(stageInfo ? `${stageInfo.label}...` : `${stage}...`);
    };

    const onStageCompleted = ({ stage, completedStages, totalStages }) => {
      if (!isMountedRef.current) return;
      if (completedStages !== undefined && totalStages !== undefined) {
        setOverallProgress(Math.min(100, Math.round((completedStages / totalStages) * 100)));
      }
      if (stage === 'parsing') {
        setIsPaginated(true);
      }
      fetchStatus(documentId);
    };

    const onPaginatedEvent = ({ pageCount: count }) => {
      if (!isMountedRef.current) return;
      setIsPaginated(true);
      if (count) {
        setPageCount(count);
      }
      if (onPaginated) {
        onPaginated(count);
      }
    };

    const onStageFailed = ({ stage, error }) => {
      if (!isMountedRef.current) return;
      setFailedStage({ stage, error });
      setErrorMsg(error || `Stage ${stage} failed.`);
      setCurrentStageText(`Failed: ${stage}`);
    };

    const onDocReady = () => {
      if (!isMountedRef.current) return;
      setIsReady(true);
      setOverallProgress(100);
      setCurrentStageText('Pipeline analysis complete!');
      if (onComplete) {
        onComplete(documentId);
      }
    };

    socketClient.on('pipeline:stage-started', onStageStarted);
    socketClient.on('pipeline:stage-completed', onStageCompleted);
    socketClient.on('pipeline:paginated', onPaginatedEvent);
    socketClient.on('pipeline:stage-failed', onStageFailed);
    socketClient.on('pipeline:document-ready', onDocReady);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      socketClient.off('pipeline:stage-started', onStageStarted);
      socketClient.off('pipeline:stage-completed', onStageCompleted);
      socketClient.off('pipeline:paginated', onPaginatedEvent);
      socketClient.off('pipeline:stage-failed', onStageFailed);
      socketClient.off('pipeline:document-ready', onDocReady);
      socketClient.leaveRoom(room);
    };
  }, [documentId, fetchStatus, onComplete, onPaginated]);

  const retryStage = async (stage) => {
    if (!documentId || !stage) return;
    try {
      setErrorMsg('');
      setFailedStage(null);
      await api.jobs.retryStage(documentId, stage);
      fetchStatus(documentId);
    } catch (err) {
      setErrorMsg(err.message || 'Retry failed.');
    }
  };

  return {
    jobs,
    overallProgress,
    currentStageText,
    activeStage,
    failedStage,
    errorMsg,
    isReady,
    isPaginated,
    pageCount,
    retryStage,
    refetch: () => fetchStatus(documentId),
  };
}
