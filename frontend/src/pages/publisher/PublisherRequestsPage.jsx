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
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    label: 'Pending Response',
  },
  accepted: {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    label: 'Accepted / In Talks',
  },
  declined: {
    bg: 'bg-rose-50 text-rose-800 border-rose-200',
    label: 'Declined',
  },
  withdrawn: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Withdrawn',
  },
  closed: {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
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
      <div className="border-b border-slate-200/80 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF500A] flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Acquisition Proposals
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            Publishing Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Track your formal deal offers sent to authors. When an author accepts your proposal, a direct secure chat channel opens.
          </p>
        </div>

        <Link
          to="/p/discover"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-[#FF500A] transition-all shrink-0 shadow-2xs"
        >
          <BookOpen className="w-4 h-4" />
          Find More Manuscripts
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
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
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchRequests}
            className="ml-auto underline font-semibold text-xs"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-serif font-bold text-slate-800 text-lg">No Proposals Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {statusFilter === 'all'
              ? "You haven't submitted any publishing proposals yet. Discover promising manuscripts and pitch to authors."
              : `You have no requests currently in '${statusFilter}' status.`}
          </p>
          <Link
            to="/p/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF500A] text-white rounded-xl text-xs font-bold hover:bg-[#e04505] transition-all"
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
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all shadow-2xs flex flex-col md:flex-row gap-5 justify-between"
              >
                {/* Book & Proposal Info */}
                <div className="flex gap-4 min-w-0">
                  {/* Thumbnail Cover */}
                  <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <BookOpen className="w-6 h-6 mb-1" />
                        <span className="text-[9px] line-clamp-2">{book.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        Submitted {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="font-serif font-bold text-slate-900 text-lg line-clamp-1">
                      {book.title || 'Untitled Manuscript'}
                    </h2>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span>
                        Author:{' '}
                        <strong className="text-slate-900">
                          {author.name || author.username || 'Author'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Genre:{' '}
                        <strong className="text-slate-900">{book.genre || 'General'}</strong>
                      </span>
                    </div>

                    {/* Proposed Terms summary */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 space-y-1.5 max-w-xl">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>Commercial Proposal:</span>
                        <span className="font-normal text-slate-700">{req.proposedTerms}</span>
                      </div>
                      {req.message && (
                        <p className="text-slate-600 italic line-clamp-2">
                          "{req.message}"
                        </p>
                      )}
                      {req.rights && req.rights.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {req.rights.map((right) => (
                            <span
                              key={right}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 uppercase"
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
                <div className="flex flex-col justify-between items-start md:items-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    {req.status === 'accepted' && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 md:justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Chat channel is open
                      </span>
                    )}
                    {req.status === 'declined' && req.note && (
                      <p className="text-xs text-rose-600 max-w-xs text-left md:text-right">
                        Reason: {req.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {req.status === 'accepted' && (
                      <button
                        onClick={() => navigate(`/p/chat?convo=${req.conversationId || ''}`)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Open Chat
                      </button>
                    )}

                    {req.status === 'pending' && (
                      <button
                        onClick={() => setWithdrawingReq(req)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Withdraw Proposal
                      </button>
                    )}

                    <Link
                      to={`/p/book/${book.id || book._id || req.bookId}`}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-[#FF500A] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
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
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawingReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif font-bold text-lg text-slate-900">
                Withdraw Proposal?
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to withdraw your publishing offer for{' '}
              <strong className="text-slate-900">
                {withdrawingReq.bookId?.title || 'this manuscript'}
              </strong>
              ? The author will no longer be able to accept it.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawingReq(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Keep Offer
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
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
