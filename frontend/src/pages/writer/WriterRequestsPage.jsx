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
    bg: 'bg-paper text-muted border-rule',
    label: 'Pending Your Decision',
  },
  accepted: {
    bg: 'bg-paper text-success border-success',
    label: 'Accepted / In Talks',
  },
  declined: {
    bg: 'bg-paper text-danger border-danger',
    label: 'Declined (30d Cooldown)',
  },
  withdrawn: {
    bg: 'bg-paper text-muted border-rule',
    label: 'Withdrawn by Publisher',
  },
  closed: {
    bg: 'bg-paper text-muted border-rule',
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
      <div className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rule text-muted flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              Publisher Inbox
            </span>
          </div>
          <h1 className="text-3xl font-normal text-ink mt-2">
            Publishing Offers & Inquiries
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Review formal acquisition proposals and inquiries from verified publishers. Accepting an offer opens a secure, private communication channel.
          </p>
        </div>

        <Link
          to="/w/chat"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink hover:opacity-90 text-paper rounded text-xs font-bold shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          Active Conversations
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

      {/* Requests list */}
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
          <Inbox className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-bold text-ink text-base">No Inquiries Found</h3>
          <p className="text-xs text-muted max-w-md mx-auto mt-1 mb-6">
            {statusFilter === 'all'
              ? 'You have not received any publishing proposals yet. Keep publishing and sharing your stories!'
              : `You have no proposals currently categorized as '${statusFilter}'.`}
          </p>
          <Link
            to="/w/books"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold"
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
                className="bg-paper border border-rule rounded p-6 flex flex-col lg:flex-row gap-6 justify-between"
              >
                {/* Left/Middle Content */}
                <div className="flex flex-col sm:flex-row gap-5 min-w-0 flex-1">
                  {/* Book thumbnail */}
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

                  {/* Proposal details */}
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted">
                        Received {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-bold text-ink text-base line-clamp-1">
                        Offer for "{book.title || 'Untitled'}"
                      </h2>
                    </div>

                    {/* Publisher Meta Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-paper border border-rule rounded p-3 text-xs text-ink">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="truncate">
                          <strong>{req.company || publisher.company || 'Publisher'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="truncate">{req.contactName || publisher.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="truncate">{req.contactEmail || publisher.email}</span>
                      </div>
                    </div>

                    {/* Commercial Terms & Message */}
                    <div className="space-y-1.5 text-xs text-ink">
                      <div className="p-3 bg-paper border border-rule rounded space-y-1">
                        <span className="font-bold text-muted uppercase text-[10px] tracking-wider block">
                          Proposed Commercial Terms
                        </span>
                        <p className="font-bold text-ink">{req.proposedTerms}</p>
                      </div>

                      {req.message && (
                        <div className="p-3 bg-paper border border-rule rounded text-muted italic">
                          "{req.message}"
                        </div>
                      )}

                      {/* Rights Requested */}
                      {req.rights && req.rights.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-bold text-muted">
                            Requested Rights:
                          </span>
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

                {/* Right Action Column */}
                <div className="flex flex-col justify-between items-stretch lg:items-end gap-3 shrink-0 lg:w-48 pt-3 lg:pt-0 border-t lg:border-t-0 border-rule">
                  <div className="space-y-1 text-left lg:text-right">
                    {req.status === 'accepted' && (
                      <span className="text-xs text-success font-bold flex items-center gap-1 lg:justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Conversation Active
                      </span>
                    )}
                    {req.status === 'declined' && (
                      <p className="text-[11px] text-muted">
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
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Offer
                        </button>
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'decline', request: req });
                            setModalNote('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-paper hover:border-danger text-danger border border-rule rounded text-xs font-bold cursor-pointer"
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
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-ink hover:opacity-90 text-paper rounded text-xs font-bold cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Open Chat
                        </button>
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'close', request: req });
                            setModalNote('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-paper hover:border-ink text-ink border border-rule rounded text-xs font-bold cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Close Deal
                        </button>
                      </>
                    )}

                    {/* Secondary actions: Block & Report */}
                    <div className="flex items-center justify-between pt-1 text-muted">
                      <button
                        onClick={() => {
                          setActiveModal({ type: 'block', request: req });
                          setModalNote('');
                        }}
                        title="Block this publisher from contacting you"
                        className="text-[11px] text-muted hover:text-danger inline-flex items-center gap-1 cursor-pointer font-bold"
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

      {/* Interactive Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-paper rounded max-w-md w-full p-6 space-y-4 border border-rule">
            {/* Accept */}
            {activeModal.type === 'accept' && (
              <>
                <div className="flex items-center gap-3 text-accent">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-bold text-base text-ink">
                    Accept Publishing Offer
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Accepting this offer opens an official direct messaging channel with{' '}
                  <strong className="text-ink">
                    {activeModal.request?.company || 'the publisher'}
                  </strong>
                  . You can discuss contract details, rights, and next steps in complete privacy.
                </p>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    Optional Acceptance Note / Greeting:
                  </label>
                  <textarea
                    rows={3}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Hello, thank you for your interest! I look forward to discussing..."
                    className="w-full bg-paper border border-rule rounded p-3 text-xs text-ink placeholder-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                  />
                </div>
              </>
            )}

            {/* Decline */}
            {activeModal.type === 'decline' && (
              <>
                <div className="flex items-center gap-3 text-danger">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-ink">
                    Decline Publishing Offer
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Declining will notify the publisher. Note: A 30-day cooldown will prevent this publisher from re-submitting a new proposal for this specific book during this window.
                </p>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    Reason / Polite Note (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Thank you for your interest, however at this time I am seeking different terms/commitments..."
                    className="w-full bg-paper border border-rule rounded p-3 text-xs text-ink placeholder-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                  />
                </div>
              </>
            )}

            {/* Close */}
            {activeModal.type === 'close' && (
              <>
                <div className="flex items-center gap-3 text-ink">
                  <Archive className="w-5 h-5" />
                  <h3 className="font-bold text-base text-ink">
                    Close Proposal / Talks
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Mark this negotiation as closed. The active conversation will be locked from sending new messages.
                </p>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    Closing Note (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Contract signed / negotiations concluded..."
                    className="w-full bg-paper border border-rule rounded p-3 text-xs text-ink placeholder-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                  />
                </div>
              </>
            )}

            {/* Block */}
            {activeModal.type === 'block' && (
              <>
                <div className="flex items-center gap-3 text-danger">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-base text-ink">
                    Block Publisher
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Blocking this publisher will immediately prevent them from sending any future proposals to you across all your books.
                </p>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    Reason for blocking (Internal record):
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Unwanted solicitations, offensive conduct..."
                    className="w-full bg-paper border border-rule rounded p-3 text-xs text-ink placeholder-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
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
                className="px-4 py-2 border border-rule text-ink rounded text-xs font-bold hover:border-ink cursor-pointer bg-paper"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalAction}
                disabled={modalLoading}
                className={`px-4 py-2 text-paper rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                  activeModal.type === 'accept'
                    ? 'bg-accent hover:bg-accent-hover'
                    : activeModal.type === 'decline' || activeModal.type === 'block'
                    ? 'bg-danger hover:opacity-90'
                    : 'bg-ink hover:opacity-90'
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
