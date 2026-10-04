import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { usePipelineProgress, PIPELINE_STAGES } from '../../hooks/usePipelineProgress';
import { Button } from '../common/Button';
import { api } from '../../services/api';

export default function PipelineProgressView({ book, documentId, onPublished }) {
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState('');

  const {
    jobs,
    overallProgress,
    currentStageText,
    activeStage,
    isPaginated,
    pageCount,
    retryStage,
  } = usePipelineProgress(documentId);

  const effectivePageCount = pageCount || book?.pageCount || 0;

  const bookId = book?.id || book?._id;

  const handlePublish = async () => {
    if (!bookId) return;
    try {
      setPublishing(true);
      setPublishError('');
      await api.books.update(bookId, { status: 'published' });
      setPublishSuccess(true);
      if (onPublished) onPublished();
    } catch (err) {
      setPublishError(err.message || 'Failed to publish story.');
    } finally {
      setPublishing(false);
    }
  };

  const getStageStatus = (stageId) => {
    const job = jobs.find((j) => j.stage === stageId);
    if (!job) return 'pending';
    return job.status; // 'pending' | 'running' | 'completed' | 'failed'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner & Status */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF0E8] text-[#FF500A]">
                {publishSuccess || book?.status === 'published' ? 'Published' : isPaginated ? 'Draft (Ready to Publish)' : 'Processing'}
              </span>
              <span className="text-xs text-stone-500">• 10 AI Analysis Stages</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-stone-900">
              {book?.title || 'Processing Manuscript'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              {currentStageText}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {isPaginated && !publishSuccess && book?.status !== 'published' && (
              <Button
                variant="primary"
                size="md"
                onClick={handlePublish}
                disabled={publishing}
                className="shadow-sm hover:shadow-md"
              >
                {publishing ? 'Publishing...' : 'Publish Story'}
              </Button>
            )}

            {publishSuccess || book?.status === 'published' ? (
              <Link to={`/book/${bookId}`}>
                <Button variant="secondary" size="md" className="flex items-center gap-2">
                  View Story Page
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            ) : null}

            {bookId && (
              <Link to={`/read/${bookId}`}>
                <Button variant="ghost" size="md" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Reader Preview
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="pt-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-stone-700">Overall Narrative Intelligence Progress</span>
            <span className="text-[#FF500A]">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#FF500A] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ ease: 'easeOut', duration: 0.5 }}
            />
          </div>
        </div>

        {/* Feedback / Errors */}
        {publishError && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{publishError}</span>
          </div>
        )}
        {publishSuccess && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Your story is now published and visible on the catalogue!</span>
          </div>
        )}
      </div>

      {/* 10 Pipeline Stages Grid */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-stone-900">Analysis Pipeline Stages</h2>
            <p className="text-xs text-stone-500">
              Each stage parses and unlocks narrative intelligence layers.
            </p>
          </div>
          {isPaginated && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Paginator verified ({effectivePageCount} pages)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PIPELINE_STAGES.map((stage, idx) => {
            const status = getStageStatus(stage.id);
            const isCurrent = activeStage === stage.id;
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-[#FF500A] bg-[#FFF0E8]/20 shadow-xs'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isFailed
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-stone-100 bg-stone-50/40 text-stone-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-stone-400 mt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4
                        className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-[#FF500A]'
                            : isCompleted
                            ? 'text-stone-900'
                            : isFailed
                            ? 'text-red-700'
                            : 'text-stone-500'
                        }`}
                      >
                        {stage.label}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">{stage.desc}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 ml-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-5 h-5 text-[#FF500A] animate-spin" />
                    ) : isFailed ? (
                      <button
                        type="button"
                        onClick={() => retryStage(stage.id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Retry stage"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    ) : (
                      <Clock className="w-5 h-5 text-stone-300" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center text-xs text-stone-500 px-2">
        <Link to="/w/books" className="hover:text-stone-900 transition flex items-center gap-1 font-semibold">
          ← Back to My Books
        </Link>
        <span>Changes saved automatically</span>
      </div>
    </div>
  );
}
