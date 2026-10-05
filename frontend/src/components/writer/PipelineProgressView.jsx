import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
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
    return job.status;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-body text-ink">
      {/* Top Banner & Status */}
      <div className="bg-paper rounded border border-rule p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-rule">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-paper border border-rule text-ink">
                {publishSuccess || book?.status === 'published' ? 'Published' : isPaginated ? 'Draft (Ready to Publish)' : 'Processing'}
              </span>
              <span className="text-xs text-muted">• 10 Analysis Stages</span>
            </div>
            <h1 className="font-calligraphy text-3xl font-normal text-ink">
              {book?.title || 'Processing Manuscript'}
            </h1>
            <p className="text-xs text-muted mt-1">
              {currentStageText}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {isPaginated && !publishSuccess && book?.status !== 'published' && (
              <Button
                variant="primary"
                size="default"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? 'Publishing…' : 'Publish Story'}
              </Button>
            )}

            {publishSuccess || book?.status === 'published' ? (
              <Link to={`/book/${bookId}`}>
                <Button variant="secondary" size="default" className="flex items-center gap-2">
                  View Story Page
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            ) : null}

            {bookId && (
              <Link to={`/read/${bookId}`}>
                <Button variant="ghost" size="default" className="flex items-center gap-2">
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
            <span className="text-ink">Pipeline Progress</span>
            <span className="text-accent">{overallProgress}%</span>
          </div>
          <div className="w-full h-2 bg-paper rounded border border-rule overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Feedback / Errors */}
        {publishError && (
          <div className="mt-4 p-3 rounded border border-danger text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{publishError}</span>
          </div>
        )}
        {publishSuccess && (
          <div className="mt-4 p-3 rounded border border-success text-success text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Your story is now published and visible on the catalogue!</span>
          </div>
        )}
      </div>

      {/* 10 Pipeline Stages Grid */}
      <div className="bg-paper rounded border border-rule p-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-rule">
          <div>
            <h2 className="text-base font-bold text-ink">Analysis Pipeline Stages</h2>
            <p className="text-xs text-muted">
              Each stage parses and unlocks narrative intelligence layers.
            </p>
          </div>
          {isPaginated && (
            <span className="text-xs font-bold text-success border border-success px-2 py-0.5 rounded">
              Paginator verified ({effectivePageCount} pages)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const status = getStageStatus(stage.id);
            const isCurrent = activeStage === stage.id;
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';

            return (
              <div
                key={stage.id}
                className={`p-3 rounded border ${
                  isCurrent
                    ? 'border-accent bg-paper'
                    : isCompleted
                    ? 'border-rule bg-rule/10'
                    : isFailed
                    ? 'border-danger bg-paper text-danger'
                    : 'border-rule/40 bg-paper text-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-bold text-muted mt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-accent'
                            : isCompleted
                            ? 'text-ink'
                            : isFailed
                            ? 'text-danger'
                            : 'text-muted'
                        }`}
                      >
                        {stage.label}
                      </h4>
                      <p className="text-[11px] text-muted mt-0.5">{stage.desc}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 ml-2">
                    {isCompleted ? (
                      <span className="text-success text-xs font-bold">Done</span>
                    ) : isCurrent ? (
                      <span className="text-accent text-xs font-bold">Loading…</span>
                    ) : isFailed ? (
                      <button
                        type="button"
                        onClick={() => retryStage(stage.id)}
                        className="text-danger hover:underline text-xs font-bold cursor-pointer"
                        title="Retry stage"
                      >
                        Retry
                      </button>
                    ) : (
                      <span className="text-muted text-xs">Queued</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center text-xs text-muted px-1">
        <Link to="/w/books" className="hover:text-ink hover:underline flex items-center gap-1 font-bold">
          ← Back to My Books
        </Link>
        <span>Changes saved automatically</span>
      </div>
    </div>
  );
}

