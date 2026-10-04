import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, AlertCircle, Building2 } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminPublishersPage() {
  const [publishers, setPublishers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedPublisher, setSelectedPublisher] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchPublishers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.admin.getPublishers({
        page,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setPublishers(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load publishers:', err);
      setErrorMsg(err.message || 'Failed to load publisher applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
    setRejectReason('');
    setErrorMsg(null);
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!selectedPublisher) return;

    if (reviewAction === 'reject' && !rejectReason.trim()) {
      setErrorMsg('A rejection reason is required to notify the applicant.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await api.admin.reviewPublisher(selectedPublisher._id, {
        action: reviewAction,
        reason: rejectReason.trim(),
      });

      setSuccessMsg(
        `Publisher application ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      fetchPublishers(pagination.page);
    } catch (err) {
      console.error('Publisher review failed:', err);
      setErrorMsg(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              Administrative Verification
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            Publisher Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Review company credentials, verify publishing imprints, and grant catalog pitch panel privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPublishers(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['pending', 'active', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusFilter === s
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'pending' ? 'Pending Review' : s === 'active' ? 'Active / Approved' : 'All Accounts'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        ) : publishers.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-slate-800 text-lg">No publisher accounts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no publisher applicants matching the "{statusFilter}" filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Applicant & Email</th>
                  <th className="py-3.5 px-4">Company & Imprint</th>
                  <th className="py-3.5 px-4">Catalog / Website</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {publishers.map((pub) => {
                  const profile = pub.publisherProfile || pub.publisherMetadata || {};
                  const isPending = pub.status === 'pending' || profile.reviewStatus === 'pending';
                  const isApproved = pub.status === 'active' && profile.reviewStatus === 'approved';

                  return (
                    <tr key={pub._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm">{pub.name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{pub.email}</div>
                      </td>

                      {/* Company & Imprint */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">
                          {profile.company || 'Not Specified'}
                        </div>
                        {profile.imprint && (
                          <div className="text-slate-400 text-[11px]">Imprint: {profile.imprint}</div>
                        )}
                      </td>

                      {/* Website */}
                      <td className="py-4 px-4">
                        {profile.website ? (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#FF500A] hover:underline font-medium"
                          >
                            <span>Visit Site</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None provided</span>
                        )}
                        {profile.catalogSize && (
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            {profile.catalogSize} books/yr
                          </div>
                        )}
                      </td>

                      {/* Applied Date */}
                      <td className="py-4 px-4 text-slate-500 font-mono">
                        {pub.createdAt ? new Date(pub.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {profile.rejectionReason && (
                          <div className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={profile.rejectionReason}>
                            Reason: {profile.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenReviewModal(pub, 'approve')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(pub, 'reject')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : isApproved ? (
                          <button
                            onClick={() => handleOpenReviewModal(pub, 'reject')}
                            className="px-2.5 py-1 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReviewModal(pub, 'approve')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-slate-900 text-lg">
                {reviewAction === 'approve' ? 'Approve Publisher' : 'Reject Application'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p>
                <strong>Applicant:</strong> {selectedPublisher.name} ({selectedPublisher.email})
              </p>
              <p>
                <strong>Company:</strong>{' '}
                {selectedPublisher.publisherProfile?.company || 'None specified'}
              </p>
              {reviewAction === 'approve' ? (
                <p className="text-emerald-700 pt-1">
                  Approving this account will set their status to <strong>active</strong>, granting full access to catalogue pitch panels, reader analytics, and private wishlists. An audit log and email notification will be generated.
                </p>
              ) : (
                <p className="text-rose-700 pt-1">
                  Rejecting this applicant will reset their role to <strong>reader</strong> and record your explanation in their file and applicant notification.
                </p>
              )}
            </div>

            {reviewAction === 'reject' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this publisher application could not be verified (e.g. Unverified company email, missing publishing credentials)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReview}
                disabled={submitting}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-2xs cursor-pointer ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
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
