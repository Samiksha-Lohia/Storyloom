import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  ArrowRight,
  AlertCircle,
  BookOpen,
  RotateCcw,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'all', label: 'All Requests' },
  { id: 'pending', label: 'Pending Review', icon: Clock },
  { id: 'accepted', label: 'In Talks', icon: CheckCircle2 },
  { id: 'declined', label: 'Declined', icon: XCircle },
  { id: 'withdrawn', label: 'Withdrawn', icon: RotateCcw },
  { id: 'closed', label: 'Closed', icon: Archive },
];

const STATUS_BADGES = {
  pending: {
    bg: 'bg-paper text-muted border-rule',
    label: 'Pending Response',
  },
  accepted: {
    bg: 'bg-paper text-success border-success',
    label: 'Accepted / In Talks',
  },
  declined: {
    bg: 'bg-paper text-danger border-danger',
    label: 'Declined',
  },
  withdrawn: {
    bg: 'bg-paper text-muted border-rule',
    label: 'Withdrawn',
  },
  closed: {
    bg: 'bg-paper text-muted border-rule',
    label: 'Closed',
  },
};

export function PublisherRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Confirm state for Withdraw action
  const [withdrawingReq, setWithdrawingReq] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.publishRequests.list(params);
      setRequests(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load publisher requests:', err);
      setError(err.message || 'Failed to load publishing proposals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleWithdraw = async () => {
    if (!withdrawingReq) return;
    setActionLoading(true);
    try {
      await api.publishRequests.updateStatus(withdrawingReq._id, {
        action: 'withdraw',
        note: 'Withdrawn by publisher',
      });
      setWithdrawingReq(null);
      await fetchRequests();
    } catch (err) {
      alert(err.message || 'Failed to withdraw proposal');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Acquisition Proposals
            </span>
          </div>
          <h1 className="text-3xl font-normal text-ink mt-2">
            Publishing Requests
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Track your formal deal offers sent to authors. When an author accepts your proposal, a direct secure chat channel opens.
          </p>
        </div>

        <Link
          to="/p/discover"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink hover:opacity-90 text-paper rounded text-xs font-bold shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Find More Manuscripts
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-rule overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-ink text-paper border border-ink'
                  : 'text-muted hover:text-ink bg-paper border border-rule'
              }`}
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content list */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
          Loading…
        </div>
      ) : error ? (
        <div className="p-4 bg-paper border border-rule text-danger rounded flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchRequests}
            className="ml-auto underline font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-paper border border-rule rounded p-8">
          <Send className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-bold text-ink text-base">No Proposals Found</h3>
          <p className="text-xs text-muted max-w-md mx-auto mt-1 mb-6">
            {statusFilter === 'all'
              ? "You haven't submitted any publishing proposals yet. Discover promising manuscripts and pitch to authors."
              : `You have no requests currently in '${statusFilter}' status.`}
          </p>
          <Link
            to="/p/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold"
          >
            Browse Manuscripts
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const book = req.bookId || {};
            const author = book.writerId || {};
            const badge = STATUS_BADGES[req.status] || STATUS_BADGES.pending;

            return (
              <div
                key={req._id}
                className="bg-paper border border-rule rounded p-5 flex flex-col md:flex-row gap-5 justify-between"
              >
                {/* Book & Proposal Info */}
                <div className="flex gap-4 min-w-0">
                  {/* Thumbnail Cover */}
                  <div className="w-20 aspect-[2/3] bg-paper rounded overflow-hidden shrink-0 border border-rule">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-muted">
                        <BookOpen className="w-6 h-6 mb-1" />
                        <span className="text-[9px] line-clamp-2">{book.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted">
                        Submitted {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="font-bold text-ink text-base line-clamp-1">
                      {book.title || 'Untitled Manuscript'}
                    </h2>

                    <div className="text-xs text-muted flex items-center gap-3 flex-wrap">
                      <span>
                        Author:{' '}
                        <strong className="text-ink">
                          {author.name || author.username || 'Author'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Genre:{' '}
                        <strong className="text-ink">{book.genre || 'General'}</strong>
                      </span>
                    </div>

                    {/* Proposed Terms summary */}
                    <div className="bg-paper border border-rule rounded p-3 text-xs text-ink space-y-1.5 max-w-xl">
                      <div className="font-bold text-ink flex items-center gap-2">
                        <span>Commercial Proposal:</span>
                        <span className="font-normal text-muted">{req.proposedTerms}</span>
                      </div>
                      {req.message && (
                        <p className="text-muted italic line-clamp-2">
                          "{req.message}"
                        </p>
                      )}
                      {req.rights && req.rights.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {req.rights.map((right) => (
                            <span
                              key={right}
                              className="px-2 py-0.5 rounded bg-paper border border-rule text-[10px] font-bold text-muted uppercase"
                            >
                              {right.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Status details */}
                <div className="flex flex-col justify-between items-start md:items-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-rule">
                  <div className="text-right">
                    {req.status === 'accepted' && (
                      <span className="text-xs text-success font-bold flex items-center gap-1 md:justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Chat channel is open
                      </span>
                    )}
                    {req.status === 'declined' && req.note && (
                      <p className="text-xs text-danger max-w-xs text-left md:text-right">
                        Reason: {req.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {req.status === 'accepted' && (
                      <button
                        onClick={() => navigate(`/p/chat?convo=${req.conversationId || ''}`)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-ink hover:opacity-90 text-paper rounded text-xs font-bold cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Open Chat
                      </button>
                    )}

                    {req.status === 'pending' && (
                      <button
                        onClick={() => setWithdrawingReq(req)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-paper hover:border-danger text-danger border border-rule rounded text-xs font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Withdraw Proposal
                      </button>
                    )}

                    <Link
                      to={`/p/book/${book.id || book._id || req.bookId}`}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold"
                    >
                      Pitch Deck
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-rule rounded text-xs font-bold bg-paper text-ink hover:border-ink disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 border border-rule rounded text-xs font-bold bg-paper text-ink hover:border-ink disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawingReq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-paper rounded max-w-md w-full p-6 border border-rule space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-base text-ink">
                Withdraw Proposal?
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to withdraw your publishing offer for{' '}
              <strong className="text-ink">
                {withdrawingReq.bookId?.title || 'this manuscript'}
              </strong>
              ? The author will no longer be able to accept it.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawingReq(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-rule text-ink rounded text-xs font-bold hover:border-ink cursor-pointer bg-paper"
              >
                Keep Offer
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={actionLoading}
                className="px-4 py-2 bg-danger hover:opacity-90 text-paper rounded text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'Withdrawing...' : 'Yes, Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublisherRequestsPage;
