import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { APP_NAME } from '../constants/app';
import Logo from './common/Logo';

export default function Loader({ documentId, file, onComplete, onCancel }) {
  const [activeDocId, setActiveDocId] = useState(documentId);
  const [jobs, setJobs] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStageText, setCurrentStageText] = useState('Initializing upload...');
  const [errorMsg, setErrorMsg] = useState('');
  const pollIntervalRef = React.useRef(null);

  // Reference stack
  const initialBooks = [
    { id: 'embeddings', label: 'EMBEDDINGS', stage: 'embeddings' },
    { id: 'continuity', label: 'CONTINUITY', stage: 'continuity' },
    { id: 'arc', label: 'STORY ARC', stage: 'arc' },
    { id: 'mood', label: 'MOOD & TENSION', stage: 'mood' },
    { id: 'dialogue', label: 'DIALOGUE', stage: 'dialogue' },
    { id: 'timeline', label: 'TIMELINE', stage: 'timeline' },
    { id: 'relationships', label: 'RELATIONSHIPS', stage: 'relationships' },
    { id: 'characters', label: 'CHARACTERS', stage: 'characters' },
    { id: 'scenes', label: 'SCENES', stage: 'scenes' },
    { id: 'parsing', label: 'PARSING TEXT', stage: 'parsing' },
  ];

  // Poll for document processing status
  useEffect(() => {
    const abortController = new AbortController();

    const startProcessing = async () => {
      try {
        let docId = activeDocId;
        
        // If file is provided, upload it first
        if (file && (!docId || docId === 'null' || docId === 'undefined')) {
          setCurrentStageText('Uploading manuscript...');
          const uploadRes = await api.documents.upload(file);
          docId = uploadRes.id || uploadRes._id;
          setActiveDocId(docId);
        }

        if (!docId || docId === 'null' || docId === 'undefined') {
          throw new Error('No document ID or file provided.');
        }

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        pollIntervalRef.current = setInterval(() => {
          checkStatus(docId, abortController.signal);
        }, 3000);

        // Run initial check
        checkStatus(docId, abortController.signal);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorMsg(err.message || 'Failed to upload document.');
        }
      }
    };

    startProcessing();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      abortController.abort();
    };
  }, [activeDocId, file]);

  const checkStatus = async (docId, signal) => {
    try {
      const jobList = await api.jobs.getStatus(docId, signal);
      setJobs(jobList || []);

      const stageLabels = {
        parsing: 'Parsing document text',
        scenes: 'Performing scene breakdown',
        characters: 'Extracting character profiles',
        relationships: 'Generating character relationship graph',
        timeline: 'Reconstructing story timeline',
        dialogue: 'Analyzing dialogue patterns',
        mood: 'Scoring emotional scene mood',
        arc: 'Plotting narrative tension curve',
        continuity: 'Checking for continuity issues',
        embeddings: 'Indexing vector embeddings for search'
      };

      let completedCount = 0;
      let activeStage = null;
      let totalStages = jobList.length || 10;
      let failedStage = null;

      jobList.forEach(job => {
        if (job.status === 'completed') completedCount++;
        if (job.status === 'running') activeStage = job.stage;
        if (job.status === 'failed') failedStage = job;
      });

      const progressPercent = Math.round((completedCount / totalStages) * 100);
      setOverallProgress(progressPercent);

      if (failedStage) {
        setCurrentStageText(`Failed during ${stageLabels[failedStage.stage] || failedStage.stage}`);
        setErrorMsg(failedStage.error || 'A processing pipeline job failed.');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }

      if (activeStage) {
        setCurrentStageText(`${stageLabels[activeStage] || activeStage}...`);
      } else if (completedCount === totalStages && totalStages > 0) {
        setCurrentStageText('Story analysis complete!');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setTimeout(() => {
          onComplete(docId);
        }, 1500);
      } else {
        const nextJob = jobList.find(j => j.status !== 'completed');
        if (nextJob) {
          setCurrentStageText(`Queued: ${stageLabels[nextJob.stage] || nextJob.stage}`);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching jobs:', err);
      }
    }
  };

  const handleRetryStage = async (stage) => {
    setErrorMsg('');
    try {
      await api.jobs.retryStage(activeDocId, stage);
      checkStatus(activeDocId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-ink font-body">
      <div className="w-full max-w-4xl bg-paper border border-rule rounded p-8 flex flex-col md:grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Pipeline List */}
        <div className="md:col-span-5 w-full space-y-2 border-r border-rule pr-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Analysis Pipeline
          </p>
          <div className="space-y-1">
            {initialBooks.map((book) => {
              const isCompleted = jobs.some(j => j.stage === book.stage && j.status === 'completed');
              const isRunning = jobs.some(j => j.stage === book.stage && j.status === 'running');
              return (
                <div
                  key={book.id}
                  className={`px-3 py-1.5 border rounded text-xs flex items-center justify-between ${
                    isCompleted
                      ? 'border-rule text-ink bg-rule/20'
                      : isRunning
                      ? 'border-accent text-accent font-bold'
                      : 'border-rule/40 text-muted'
                  }`}
                >
                  <span>{book.label}</span>
                  {isCompleted && <span className="text-success text-[11px]">Done</span>}
                  {isRunning && <span className="text-accent text-[11px]">Loading…</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Progress Bar and Info */}
        <div className="md:col-span-7 w-full text-left space-y-6">
          <div className="mb-2">
            <Logo />
            <p className="text-xs text-muted mt-1 uppercase tracking-wider">{APP_NAME} Pipeline</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-ink">
              <span className="truncate max-w-[80%]">{currentStageText}</span>
              <span className="font-mono">{overallProgress}%</span>
            </div>
            
            {/* Main Progress Bar */}
            <div className="w-full h-2 bg-paper rounded border border-rule overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Detailed list of pipeline stages */}
          <div className="bg-paper border border-rule rounded p-3 space-y-2 max-h-48 overflow-y-auto">
            {jobs.map((job) => (
              <div key={job.stage} className="flex items-center justify-between text-xs">
                <span className="capitalize font-bold text-ink">{job.stage} analysis</span>
                <div className="flex items-center gap-1.5">
                  {job.status === 'completed' && (
                    <span className="flex items-center gap-1 text-success font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Completed
                    </span>
                  )}
                  {job.status === 'running' && (
                    <span className="text-accent font-bold">
                      Loading… ({job.progress}%)
                    </span>
                  )}
                  {job.status === 'queued' && (
                    <span className="text-muted">Queued</span>
                  )}
                  {job.status === 'failed' && (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-danger font-bold">
                        <AlertCircle className="w-4 h-4" /> Failed
                      </span>
                      <button 
                        onClick={() => handleRetryStage(job.stage)}
                        className="px-2 py-0.5 border border-danger text-danger rounded text-xs font-bold hover:underline cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 border border-danger rounded text-sm flex items-start gap-2 text-danger">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Analysis halted</p>
                <p className="text-xs mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Cancel button */}
          <div className="pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-rule hover:border-ink text-ink rounded text-xs font-bold cursor-pointer"
            >
              Cancel & Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

