import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('open');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected report for action modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionType, setActionType] = useState('dismiss');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchReports = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await api.admin.getReports({
        page,
        limit: 20,
        status: statusFilter,
        targetType: targetTypeFilter || undefined,
        reason: reasonFilter || undefined,
      });
      setReports(data.reports || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load admin reports:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetTypeFilter, reasonFilter]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handleOpenActionModal = (report) => {
    setSelectedReport(report);
    setActionType(report.targetType === 'book' ? 'unpublish_book' : report.targetType === 'review' ? 'remove_review' : 'dismiss');
    setAdminNotes('');
    setActionError(null);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setActionError(null);
  };

  const handleApplyAction = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    if (actionType !== 'dismiss') {
      const confirmMsg =
        actionType === 'strike_user'
          ? 'Are you sure you want to issue a formal strike to this user? 3 strikes automatically suspends the account and unpublishes all their books.'
          : actionType === 'unpublish_book'
          ? 'Are you sure you want to take down this book? The author will be notified.'
          : 'Are you sure you want to remove this review and recompute story rating stats?';

      if (!window.confirm(confirmMsg)) return;
    }

    setSubmittingAction(true);
    setActionError(null);

    try {
      await api.admin.handleReport(selectedReport._id, {
        action: actionType,
        notes: adminNotes,
      });

      setFeedbackMsg(`Action "${actionType}" successfully applied to report.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      handleCloseModal();
      await fetchReports(pagination.page);
    } catch (err) {
      setActionError(err.message || 'Failed to process report action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getReasonBadge = (reason) => {
    switch (reason) {
      case 'copyright':
        return <span className="bg-red-100 text-red-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Copyright</span>;
      case 'plagiarism':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Plagiarism</span>;
      case 'abuse':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Abuse / Hate</span>;
      case 'spam':
        return <span className="bg-stone-200 text-stone-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Spam</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">{reason}</span>;
    }
  };

  const getStatusBadge = (status, outcome) => {
    if (status === 'closed') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="bg-stone-100 text-stone-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
            Resolved
          </span>
          {outcome && (
            <span className="text-[10px] text-stone-400 font-mono capitalize">
              {outcome.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full animate-pulse">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#FF500A]" />
            <span>Moderation Reports Queue</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Review user-submitted and public copyright complaints, issue strikes, and manage takedowns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReports(pagination.page)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        {/* Status Tabs */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600">
          {['open', 'closed', 'all'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'hover:text-stone-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Target Type Filter */}
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 font-medium focus:ring-1 focus:ring-[#FF500A]"
        >
          <option value="">All Targets</option>
          <option value="book">Books</option>
          <option value="review">Reviews</option>
          <option value="user">Users</option>
        </select>

        {/* Reason Filter */}
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 font-medium focus:ring-1 focus:ring-[#FF500A]"
        >
          <option value="">All Reasons</option>
          <option value="copyright">Copyright</option>
          <option value="plagiarism">Plagiarism</option>
          <option value="abuse">Abuse / Hate</option>
          <option value="spam">Spam</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
        {loading && reports.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-400">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="font-heading font-bold text-stone-900 text-sm">
              Moderation Queue Clear
            </h3>
            <p className="text-xs text-stone-400">
              No reports matching your active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Reporter / Claimant</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {reports.map((rep) => {
                  const isClosed = rep.status === 'closed';

                  return (
                    <tr key={rep._id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-stone-900 capitalize block">
                          {rep.targetType}
                        </span>
                        <span className="text-[10px] text-stone-400 truncate block max-w-[120px]">
                          {rep.targetId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getReasonBadge(rep.reason)}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-stone-800 text-xs">
                          {rep.details || <span className="text-stone-400 italic">No details</span>}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {rep.source === 'public' ? (
                          <div>
                            <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm block w-fit mb-0.5">
                              Public Notice
                            </span>
                            <span className="font-medium text-stone-900 block">
                              {rep.claimantName}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate max-w-[140px]">
                              {rep.claimantContact}
                            </span>
                          </div>
                        ) : rep.reporterId ? (
                          <div>
                            <span className="font-medium text-stone-900 block">
                              {rep.reporterId.name}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate max-w-[140px]">
                              @{rep.reporterId.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Anonymous</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                        {new Date(rep.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(rep.status, rep.outcome)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant={isClosed ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenActionModal(rep)}
                          className="text-xs"
                        >
                          {isClosed ? 'View Audit' : 'Review'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchReports(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-stone-500 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReports(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Action / Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF0E8] flex items-center justify-center text-[#FF500A]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-stone-900">
                  Moderation Review
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  Report ID: {selectedReport._id}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            {/* Report Context Card */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 mb-6 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-400 block font-semibold">Target</span>
                  <span className="font-bold text-stone-900 capitalize">
                    {selectedReport.targetType} ({selectedReport.targetId})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block font-semibold">Reason</span>
                  {getReasonBadge(selectedReport.reason)}
                </div>
              </div>

              {selectedReport.claimantName && (
                <div className="border-t border-stone-200 pt-2">
                  <span className="text-stone-400 block font-semibold">Claimant</span>
                  <span className="font-medium text-stone-900">
                    {selectedReport.claimantName} ({selectedReport.claimantContact})
                  </span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-2">
                <span className="text-stone-400 block font-semibold mb-1">Report Details</span>
                <p className="whitespace-pre-line text-stone-800 bg-white p-3 rounded-xl border border-stone-200 font-mono text-[11px]">
                  {selectedReport.details || 'No details provided.'}
                </p>
              </div>

              {selectedReport.targetType === 'book' && (
                <div className="pt-1">
                  <a
                    href={`/book/${selectedReport.targetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#FF500A] font-semibold hover:underline"
                  >
                    <span>Inspect Target Book</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {selectedReport.status === 'closed' ? (
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    Report closed with action: <strong className="text-stone-900 uppercase">{selectedReport.outcome}</strong>
                  </span>
                </div>
                {selectedReport.adminNotes && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                    <span className="text-stone-400 block font-semibold mb-1">Admin Audit Notes:</span>
                    <p className="text-stone-800">{selectedReport.adminNotes}</p>
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleCloseModal}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              /* Action Form */
              <form onSubmit={handleApplyAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Select Moderation Action *
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  >
                    <option value="dismiss">Dismiss Report (No violation found)</option>
                    {selectedReport.targetType === 'book' && (
                      <option value="unpublish_book">Unpublish Book (Takedown & notify author)</option>
                    )}
                    {selectedReport.targetType === 'review' && (
                      <option value="remove_review">Remove Review (Delete & recompute rating stats)</option>
                    )}
                    <option value="strike_user">Issue Strike to User (3 strikes triggers suspension)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Audit Log Notes & Rationale *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter audit log notes documenting the rationale for this action..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    maxLength={2000}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={actionType === 'dismiss' ? 'outline' : 'primary'}
                    size="sm"
                    disabled={submittingAction}
                    className={actionType !== 'dismiss' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {submittingAction
                      ? 'Applying...'
                      : actionType === 'dismiss'
                      ? 'Dismiss Report'
                      : 'Apply Action'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
