import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Shield,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';

export function AdminPublishersPage() {
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'active' | 'all'
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Review Modal State
  const [selectedPublisher, setSelectedPublisher] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchPublishers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await api.admin.getPublishers({
          status: statusFilter,
          page,
          limit: pagination.limit,
        });
        setPublishers(res?.data?.publishers || res?.publishers || []);
        if (res?.data?.pagination || res?.pagination) {
          setPagination(res?.data?.pagination || res?.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch publishers:', err);
        setErrorMsg('Failed to load publisher list. Please check administrative permissions.');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, pagination.limit]
  );

  useEffect(() => {
    fetchPublishers(1);
  }, [fetchPublishers]);

  const handleOpenReviewModal = (publisher, action) => {
    setSelectedPublisher(publisher);
    setReviewAction(action);
    setRejectReason('');
    setErrorMsg(null);
  };

  const handleCloseModal = () => {
    setSelectedPublisher(null);
    setReviewAction(null);
    setRejectReason('');
    setErrorMsg(null);
  };

  const handleExecuteReview = async () => {
    if (!selectedPublisher || !reviewAction) return;

    if (reviewAction === 'reject' && !rejectReason.trim()) {
      setErrorMsg('A rejection reason is required to notify the applicant.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (reviewAction === 'approve') {
        await api.admin.approvePublisher(selectedPublisher._id);
        setSuccessMsg(`Approved ${selectedPublisher.name} (${selectedPublisher.publisherProfile?.company || 'Publisher'})`);
      } else {
        await api.admin.rejectPublisher(selectedPublisher._id, rejectReason.trim());
        setSuccessMsg(`Rejected applicant ${selectedPublisher.name}.`);
      }

      handleCloseModal();
      fetchPublishers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(`Failed to ${reviewAction} publisher:`, err);
      setErrorMsg(err.message || `Failed to ${reviewAction} application.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-rule text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted" />
              Administrative Verification
            </span>
          </div>
          <h1 className="font-calligraphy text-3xl font-normal text-ink mt-2">
            Publisher Applications
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Review company credentials, verify publishing imprints, and grant catalog pitch panel privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPublishers(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-rule rounded text-xs font-semibold text-ink hover:bg-rule/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-ink" />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-paper border border-success text-success rounded text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-2 border-b border-rule pb-3">
        {['pending', 'active', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-xs font-bold capitalize cursor-pointer border ${
              statusFilter === s
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper border-rule text-muted hover:text-ink'
            }`}
          >
            {s === 'pending' ? 'Pending Review' : s === 'active' ? 'Active / Approved' : 'All Accounts'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-paper border border-rule rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">
            Loading…
          </div>
        ) : publishers.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Building2 className="w-8 h-8 text-muted mx-auto mb-3" />
            <h3 className="font-bold text-ink text-base">No publisher accounts found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              There are currently no publisher applicants matching the &ldquo;{statusFilter}&rdquo; filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper border-b border-rule text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Applicant &amp; Email</th>
                  <th className="py-3 px-4">Company &amp; Imprint</th>
                  <th className="py-3 px-4">Catalog / Website</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-ink">
                {publishers.map((pub) => {
                  const profile = pub.publisherProfile || pub.publisherMetadata || {};
                  const isPending = pub.status === 'pending' || profile.reviewStatus === 'pending';
                  const isApproved = pub.status === 'active' && profile.reviewStatus === 'approved';

                  return (
                    <tr key={pub._id} className="hover:bg-rule/10">
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-ink text-sm">{pub.name}</div>
                        <div className="text-muted font-mono text-[11px]">{pub.email}</div>
                      </td>

                      {/* Company & Imprint */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">
                          {profile.company || 'Not Specified'}
                        </div>
                        {profile.imprint && (
                          <div className="text-muted text-[11px]">Imprint: {profile.imprint}</div>
                        )}
                      </td>

                      {/* Website */}
                      <td className="py-3 px-4">
                        {profile.website ? (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                          >
                            <span>Visit Site</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted italic">None provided</span>
                        )}
                        {profile.catalogSize && (
                          <div className="text-muted text-[11px] mt-0.5">
                            {profile.catalogSize} books/yr
                          </div>
                        )}
                      </td>

                      {/* Applied Date */}
                      <td className="py-3 px-4 text-muted font-mono">
                        {pub.createdAt ? new Date(pub.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-success text-success text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rule text-muted text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-danger text-danger text-[10px] font-bold uppercase tracking-wider">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {profile.rejectionReason && (
                          <div className="text-[10px] text-danger mt-1 max-w-xs truncate" title={profile.rejectionReason}>
                            Reason: {profile.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenReviewModal(pub, 'approve')}
                              className="px-2.5 py-1 bg-ink hover:bg-accent text-paper rounded text-xs font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(pub, 'reject')}
                              className="px-2.5 py-1 bg-paper hover:bg-rule/10 text-danger border border-danger rounded text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : isApproved ? (
                          <button
                            onClick={() => handleOpenReviewModal(pub, 'reject')}
                            className="px-2.5 py-1 text-muted hover:text-danger rounded text-xs font-semibold cursor-pointer"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReviewModal(pub, 'approve')}
                            className="px-2.5 py-1 bg-paper border border-rule hover:bg-rule/10 text-ink rounded text-xs font-bold cursor-pointer"
                          >
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedPublisher && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-paper border border-rule rounded max-w-md w-full p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-bold text-ink text-base">
                {reviewAction === 'approve' ? 'Approve Publisher' : 'Reject Application'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted hover:text-ink p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-muted space-y-2 bg-paper p-3 rounded border border-rule">
              <p>
                <strong className="text-ink">Applicant:</strong> {selectedPublisher.name} ({selectedPublisher.email})
              </p>
              <p>
                <strong className="text-ink">Company:</strong>{' '}
                {selectedPublisher.publisherProfile?.company || 'None specified'}
              </p>
              {reviewAction === 'approve' ? (
                <p className="text-success pt-1">
                  Approving this account will set their status to <strong>active</strong>, granting full access to catalogue pitch panels, reader analytics, and private wishlists.
                </p>
              ) : (
                <p className="text-danger pt-1">
                  Rejecting this applicant will reset their role to <strong>reader</strong> and record your explanation.
                </p>
              )}
            </div>

            {reviewAction === 'reject' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted block">
                  Rejection Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this publisher application could not be verified..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-paper border border-danger text-danger rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-3.5 py-1.5 border border-rule rounded text-xs font-semibold text-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReview}
                disabled={submitting}
                className={`px-4 py-1.5 rounded text-xs font-bold cursor-pointer ${
                  reviewAction === 'approve'
                    ? 'bg-ink text-paper hover:bg-accent'
                    : 'bg-paper text-danger border border-danger hover:bg-rule/10'
                }`}
              >
                {submitting
                  ? 'Submitting...'
                  : reviewAction === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPublishersPage;
