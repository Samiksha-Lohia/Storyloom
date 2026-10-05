import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';

export function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'closed' | 'all'
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });

  // Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionType, setActionType] = useState('dismiss');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchReports = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await api.admin.getReports({
          status: statusFilter,
          targetType: targetTypeFilter || undefined,
          reason: reasonFilter || undefined,
          page,
          limit: pagination.limit,
        });

        setReports(res?.data?.reports || res?.reports || []);
        if (res?.data?.pagination || res?.pagination) {
          setPagination(res?.data?.pagination || res?.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch reports queue:', err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, targetTypeFilter, reasonFilter, pagination.limit]
  );

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handleOpenActionModal = (report) => {
    setSelectedReport(report);
    setActionType(report.targetType === 'book' ? 'unpublish_book' : 'dismiss');
    setAdminNotes('');
    setActionError(null);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setAdminNotes('');
    setActionError(null);
  };

  const handleApplyAction = async (e) => {
    e.preventDefault();
    if (!selectedReport || !adminNotes.trim()) {
      setActionError('Audit log notes are required to document moderation rationale.');
      return;
    }

    setSubmittingAction(true);
    setActionError(null);

    try {
      await api.admin.reviewReport(selectedReport._id, {
        action: actionType,
        adminNotes: adminNotes.trim(),
      });

      setFeedbackMsg(`Applied "${actionType}" to report ${selectedReport._id.slice(-6)}.`);
      handleCloseModal();
      fetchReports(pagination.page);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Failed to review report:', err);
      setActionError(err.message || 'Failed to submit moderation decision.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getReasonBadge = (reason) => {
    const map = {
      copyright: 'border-danger text-danger',
      plagiarism: 'border-accent text-accent',
      abuse: 'border-danger text-danger',
      spam: 'border-rule text-muted',
      other: 'border-rule text-muted',
    };
    return (
      <span
        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
          map[reason] || 'border-rule text-muted'
        }`}
      >
        {reason}
      </span>
    );
  };

  const getStatusBadge = (status, outcome) => {
    if (status === 'closed') {
      return (
        <span className="border border-rule text-muted text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
          Closed ({outcome || 'resolved'})
        </span>
      );
    }
    return (
      <span className="border border-danger text-danger text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-calligraphy text-2xl sm:text-3xl font-normal text-ink flex items-center gap-2">
            <Shield className="w-5 h-5 text-ink" />
            <span>Moderation Reports Queue</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Review user-submitted and public copyright complaints, issue strikes, and manage takedowns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReports(pagination.page)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-paper border border-rule rounded hover:bg-rule/10 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-ink" />
          <span>{loading ? 'Loading…' : 'Refresh'}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-paper border border-success text-success text-xs rounded flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-paper border border-rule rounded p-3 flex flex-wrap items-center gap-3">
        {/* Status Tabs */}
        <div className="flex items-center border border-rule p-0.5 rounded text-xs font-semibold text-muted">
          {['open', 'closed', 'all'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded capitalize cursor-pointer ${
                statusFilter === st
                  ? 'bg-ink text-paper'
                  : 'hover:text-ink'
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
          className="bg-paper border border-rule rounded px-2.5 py-1 text-xs text-ink font-medium focus:outline-hidden focus:ring-1 focus:ring-ink"
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
          className="bg-paper border border-rule rounded px-2.5 py-1 text-xs text-ink font-medium focus:outline-hidden focus:ring-1 focus:ring-ink"
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
      <div className="bg-paper border border-rule rounded overflow-hidden">
        {loading && reports.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle className="w-6 h-6 text-success mx-auto" />
            <h3 className="font-bold text-ink text-sm">
              Moderation Queue Clear
            </h3>
            <p className="text-xs text-muted">
              No reports matching your active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-paper border-b border-rule text-muted uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Reporter / Claimant</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-ink">
                {reports.map((rep) => {
                  const isClosed = rep.status === 'closed';

                  return (
                    <tr key={rep._id} className="hover:bg-rule/10">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-ink capitalize block">
                          {rep.targetType}
                        </span>
                        <span className="text-[10px] text-muted truncate block max-w-[120px]">
                          {rep.targetId}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getReasonBadge(rep.reason)}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-ink text-xs">
                          {rep.details || <span className="text-muted italic">No details</span>}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        {rep.source === 'public' ? (
                          <div>
                            <span className="text-[10px] font-bold uppercase border border-rule text-muted px-1.5 py-0.5 rounded block w-fit mb-0.5">
                              Public Notice
                            </span>
                            <span className="font-medium text-ink block">
                              {rep.claimantName}
                            </span>
                            <span className="text-[10px] text-muted block truncate max-w-[140px]">
                              {rep.claimantContact}
                            </span>
                          </div>
                        ) : rep.reporterId ? (
                          <div>
                            <span className="font-medium text-ink block">
                              {rep.reporterId.name}
                            </span>
                            <span className="text-[10px] text-muted block truncate max-w-[140px]">
                              @{rep.reporterId.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted italic">Anonymous</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-muted font-mono text-[11px]">
                        {new Date(rep.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(rep.status, rep.outcome)}
                      </td>

                      <td className="py-3 px-4 text-right">
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
          <span className="text-xs text-muted px-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-paper rounded max-w-xl w-full p-6 border border-rule relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-muted hover:text-ink p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-ink">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink">
                  Moderation Review
                </h3>
                <p className="text-xs text-muted font-mono">
                  Report ID: {selectedReport._id}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 mb-4 bg-paper border border-danger text-danger text-xs rounded">
                {actionError}
              </div>
            )}

            {/* Report Context Card */}
            <div className="p-4 bg-paper border border-rule rounded space-y-3 mb-6 text-xs text-ink">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted block font-semibold">Target</span>
                  <span className="font-bold text-ink capitalize">
                    {selectedReport.targetType} ({selectedReport.targetId})
                  </span>
                </div>
                <div>
                  <span className="text-muted block font-semibold">Reason</span>
                  {getReasonBadge(selectedReport.reason)}
                </div>
              </div>

              {selectedReport.claimantName && (
                <div className="border-t border-rule pt-2">
                  <span className="text-muted block font-semibold">Claimant</span>
                  <span className="font-medium text-ink">
                    {selectedReport.claimantName} ({selectedReport.claimantContact})
                  </span>
                </div>
              )}

              <div className="border-t border-rule pt-2">
                <span className="text-muted block font-semibold mb-1">Report Details</span>
                <p className="whitespace-pre-line text-ink bg-paper p-3 rounded border border-rule font-mono text-[11px]">
                  {selectedReport.details || 'No details provided.'}
                </p>
              </div>

              {selectedReport.targetType === 'book' && (
                <div className="pt-1">
                  <a
                    href={`/book/${selectedReport.targetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-semibold hover:underline"
                  >
                    <span>Inspect Target Book</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {selectedReport.status === 'closed' ? (
              <div className="space-y-3 border-t border-rule pt-4">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>
                    Report closed with action: <strong className="text-ink uppercase">{selectedReport.outcome}</strong>
                  </span>
                </div>
                {selectedReport.adminNotes && (
                  <div className="p-3 bg-paper rounded border border-rule text-xs">
                    <span className="text-muted block font-semibold mb-1">Admin Audit Notes:</span>
                    <p className="text-ink">{selectedReport.adminNotes}</p>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Select Moderation Action *
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full bg-paper border border-rule rounded px-3 py-2 text-xs text-ink font-medium focus:outline-hidden focus:ring-1 focus:ring-ink"
                  >
                    <option value="dismiss">Dismiss Report (No violation found)</option>
                    {selectedReport.targetType === 'book' && (
                      <option value="unpublish_book">Unpublish Book (Takedown &amp; notify author)</option>
                    )}
                    {selectedReport.targetType === 'review' && (
                      <option value="remove_review">Remove Review (Delete &amp; recompute rating stats)</option>
                    )}
                    <option value="strike_user">Issue Strike to User (3 strikes triggers suspension)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Audit Log Notes &amp; Rationale *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter audit log notes documenting the rationale for this action..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    maxLength={2000}
                    className="w-full bg-paper border border-rule rounded p-2.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ink"
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
                    className={actionType !== 'dismiss' ? 'bg-danger text-paper' : ''}
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

export default AdminReportsPage;
