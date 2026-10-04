import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import ReportButton from '../../components/common/ReportButton';
import {
  Inbox,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Building,
  Mail,
  User,
  ShieldAlert,
  Ban,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'all', label: 'All Offers' },
  { id: 'pending', label: 'Pending Response', icon: Clock },
  { id: 'accepted', label: 'In Talks', icon: CheckCircle2 },
  { id: 'declined', label: 'Declined', icon: XCircle },
  { id: 'withdrawn', label: 'Withdrawn', icon: RotateCcw },
  { id: 'closed', label: 'Closed', icon: Archive },
];

const STATUS_BADGES = {
  pending: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    label: 'Pending Your Decision',
  },
  accepted: {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    label: 'Accepted / In Talks',
  },
  declined: {
    bg: 'bg-rose-50 text-rose-800 border-rose-200',
    label: 'Declined (30d Cooldown)',
  },
  withdrawn: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Withdrawn by Publisher',
  },
  closed: {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    label: 'Closed',
  },
};

export function WriterRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals for actions
  const [activeModal, setActiveModal] = useState(null); // { type: 'accept'|'decline'|'block'|'close', request }
  const [modalNote, setModalNote] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

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
      console.error('Failed to load writer requests:', err);
      setError(err.message || 'Failed to load publishing proposals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleModalAction = async () => {
    if (!activeModal) return;
    const { type, request } = activeModal;
    setModalLoading(true);
    try {
      if (type === 'accept') {
        const result = await api.publishRequests.updateStatus(request._id, {
          action: 'accept',
          note: modalNote,
        });
        setActiveModal(null);
        setModalNote('');
        // Navigate directly to the newly created/opened conversation
        if (result.conversationId) {
          navigate(`/w/chat?convo=${result.conversationId}`);
        } else {
          await fetchRequests();
        }
      } else if (type === 'decline') {
        await api.publishRequests.updateStatus(request._id, {
          action: 'decline',
          note: modalNote,
        });
        setActiveModal(null);
        setModalNote('');
        await fetchRequests();
      } else if (type === 'close') {
        await api.publishRequests.updateStatus(request._id, {
          action: 'close',
          note: modalNote,
        });
        setActiveModal(null);
        setModalNote('');
        await fetchRequests();
      } else if (type === 'block') {
        const pubId = request.publisherId?._id || request.publisherId;
        await api.publishRequests.blockPublisher(pubId, modalNote || 'Blocked by author');
        setActiveModal(null);
        setModalNote('');
        await fetchRequests();
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF500A] flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              Publisher Inbox
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            Publishing Offers & Inquiries
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Review formal acquisition proposals and inquiries from verified publishers. Accepting an offer opens a secure, private communication channel.
          </p>
        </div>

        <Link
          to="/w/chat"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-[#FF500A] transition-all shrink-0 shadow-2xs"
        >
          <MessageSquare className="w-4 h-4" />
          Active Conversations
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

      {/* Requests list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl border border-slate-200" />
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
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-serif font-bold text-slate-800 text-lg">No Inquiries Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {statusFilter === 'all'
              ? 'You have not received any publishing proposals yet. Keep publishing and sharing your stories!'
              : `You have no proposals currently categorized as '${statusFilter}'.`}
          </p>
          <Link
            to="/w/books"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF500A] text-white rounded-xl text-xs font-bold hover:bg-[#e04505] transition-all"
          >
            Manage Your Books
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const book = req.bookId || {};
            const publisher = req.publisherId || {};
            const badge = STATUS_BADGES[req.status] || STATUS_BADGES.pending;

            return (
              <div
                key={req._id}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all shadow-2xs flex flex-col lg:flex-row gap-6 justify-between"
              >
                {/* Left/Middle Content */}
                <div className="flex flex-col sm:flex-row gap-5 min-w-0 flex-1">
                  {/* Book thumbnail */}
                  <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
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

                  {/* Proposal details */}
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        Received {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-serif font-bold text-slate-900 text-lg line-clamp-1">
                        Offer for "{book.title || 'Untitled'}"
                      </h2>
                    </div>

                    {/* Publisher Meta Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong>{req.company || publisher.company || 'Publisher'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.contactName || publisher.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.contactEmail || publisher.email}</span>
                      </div>
                    </div>

                    {/* Commercial Terms & Message */}
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1">
                        <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">
                          Proposed Commercial Terms
                        </span>
                        <p className="font-medium text-slate-900">{req.proposedTerms}</p>
                      </div>

                      {req.message && (
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 italic">
                          "{req.message}"
                        </div>
                      )}

                      {/* Rights Requested */}
                      {req.rights && req.rights.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Requested Rights:
                          </span>
                          {req.rights.map((right) => (
                            <span
                              key={right}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 uppercase"
                            >
                              {right.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Column */}
                <div className="flex flex-col justify-between items-stretch lg:items-end gap-3 shrink-0 lg:w-48 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="space-y-1 text-left lg:text-right">
                    {req.status === 'accepted' && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 lg:justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Conversation Active
                      </span>
                    )}
                    {req.status === 'declined' && (
                      <p className="text-[11px] text-slate-500">
                        {req.note ? `Note: "${req.note}"` : 'Decline cooldown active'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 w-full">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'accept', request: req });
                            setModalNote('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Offer
                        </button>
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'decline', request: req });
                            setModalNote('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {req.status === 'accepted' && (
                      <>
                        <button
                          onClick={() => navigate(`/w/chat?convo=${req.conversationId || ''}`)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Open Chat
                        </button>
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'close', request: req });
                            setModalNote('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Close Deal
                        </button>
                      </>
                    )}

                    {/* Secondary actions: Block & Report */}
                    <div className="flex items-center justify-between pt-1 text-slate-400">
                      <button
                        onClick={() => {
                          setActiveModal({ type: 'block', request: req });
                          setModalNote('');
                        }}
                        title="Block this publisher from contacting you"
                        className="text-[11px] text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Ban className="w-3 h-3" />
                        Block
                      </button>

                      <ReportButton
                        targetType="user"
                        targetId={publisher._id || req.publisherId}
                        targetTitle={`Publisher: ${req.company || publisher.company || publisher.name}`}
                        variant="link"
                      />
                    </div>
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

      {/* Interactive Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            {/* Accept */}
            {activeModal.type === 'accept' && (
              <>
                <div className="flex items-center gap-3 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="font-serif font-bold text-lg text-slate-900">
                    Accept Publishing Offer
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accepting this offer opens an official direct messaging channel with{' '}
                  <strong className="text-slate-900">
                    {activeModal.request?.company || 'the publisher'}
                  </strong>
                  . You can discuss contract details, rights, and next steps in complete privacy.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Acceptance Note / Greeting:
                  </label>
                  <textarea
                    rows={3}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Hello, thank you for your interest! I look forward to discussing..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            {/* Decline */}
            {activeModal.type === 'decline' && (
              <>
                <div className="flex items-center gap-3 text-rose-600">
                  <XCircle className="w-6 h-6" />
                  <h3 className="font-serif font-bold text-lg text-slate-900">
                    Decline Publishing Offer
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Declining will notify the publisher. Note: A 30-day cooldown will prevent this publisher from re-submitting a new proposal for this specific book during this window.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Polite Note (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Thank you for your interest, however at this time I am seeking different terms/commitments..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  />
                </div>
              </>
            )}

            {/* Close */}
            {activeModal.type === 'close' && (
              <>
                <div className="flex items-center gap-3 text-slate-700">
                  <Archive className="w-6 h-6" />
                  <h3 className="font-serif font-bold text-lg text-slate-900">
                    Close Proposal / Talks
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mark this negotiation as closed. The active conversation will be locked from sending new messages.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Closing Note (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Contract signed / negotiations concluded..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
                  />
                </div>
              </>
            )}

            {/* Block */}
            {activeModal.type === 'block' && (
              <>
                <div className="flex items-center gap-3 text-rose-600">
                  <ShieldAlert className="w-6 h-6" />
                  <h3 className="font-serif font-bold text-lg text-slate-900">
                    Block Publisher
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Blocking this publisher will immediately prevent them from sending any future proposals to you across all your books.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for blocking (Internal record):
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Unwanted solicitations, offensive conduct..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  />
                </div>
              </>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={modalLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalAction}
                disabled={modalLoading}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                  activeModal.type === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : activeModal.type === 'decline' || activeModal.type === 'block'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {modalLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WriterRequestsPage;
