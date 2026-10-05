import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../services/api.js';

export default function ReportButton({
  targetType = 'book',
  targetId,
  targetTitle = '',
  variant = 'button', // 'button', 'icon', 'link'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('abuse');
  const [details, setDetails] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantContact, setClaimantContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const currentUser = api.auth.getCurrentUser();

  const handleOpen = () => {
    if (!currentUser) {
      alert('Please log in to submit a report. For public copyright takedown notices, please visit the Copyright page.');
      return;
    }
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDetails('');
    setClaimantName('');
    setClaimantContact('');
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.reports.submitAppReport({
        targetType,
        targetId,
        reason,
        details,
        claimantName: reason === 'copyright' ? claimantName : undefined,
        claimantContact: reason === 'copyright' ? claimantContact : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleOpen}
          title={`Report this ${targetType}`}
          className={`p-1 text-muted hover:text-danger rounded cursor-pointer ${className}`}
        >
          <Flag className="w-4 h-4" />
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted hover:text-danger border border-rule cursor-pointer ${className}`}
        >
          <Flag className="w-4 h-4" />
          <span>Report</span>
        </button>
      )}

      {variant === 'link' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`text-xs text-muted hover:text-danger inline-flex items-center gap-1 cursor-pointer ${className}`}
        >
          <Flag className="w-4 h-4" />
          <span>Report {targetType}</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
          <div className="bg-paper rounded max-w-lg w-full p-6 border border-rule relative max-h-[90vh] overflow-y-auto text-ink">
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-muted hover:text-ink p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded border border-danger text-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Report {targetType}
                </h3>
                {targetTitle && (
                  <p className="text-xs text-muted truncate max-w-xs">{targetTitle}</p>
                )}
              </div>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle className="w-6 h-6 text-success mx-auto" />
                <h4 className="font-bold text-ink text-base">
                  Report Submitted
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto font-body">
                  Thank you for helping keep our community safe. Our moderation team will review this item.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-paper border border-danger text-danger text-xs rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Reason for report
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-paper border border-rule rounded px-3 py-2 text-xs text-ink font-body focus:outline-none focus:border-ink cursor-pointer"
                  >
                    <option value="abuse">Harassment, hate speech, or abuse</option>
                    <option value="plagiarism">Plagiarism or stolen content</option>
                    <option value="copyright">Copyright infringement</option>
                    <option value="spam">Spam, scam, or misleading</option>
                    <option value="other">Other policy violation</option>
                  </select>
                </div>

                {reason === 'copyright' && (
                  <div className="space-y-3 p-3 bg-paper border border-rule rounded">
                    <p className="text-[11px] text-muted">
                      Copyright claims require claimant verification under our Terms of Service.
                    </p>
                    <div>
                      <label className="block text-[11px] font-bold text-ink mb-1">
                        Claimant Name / Entity *
                      </label>
                      <input
                        type="text"
                        required
                        value={claimantName}
                        onChange={(e) => setClaimantName(e.target.value)}
                        placeholder="Legal name of rights owner"
                        className="w-full bg-paper border border-rule rounded px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-ink font-body"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-ink mb-1">
                        Contact Email / Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={claimantContact}
                        onChange={(e) => setClaimantContact(e.target.value)}
                        placeholder="author@example.com or phone"
                        className="w-full bg-paper border border-rule rounded px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-ink font-body"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Details / Explanation
                  </label>
                  <textarea
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={3000}
                    placeholder="Provide specific details to assist our moderation team..."
                    className="w-full bg-paper border border-rule rounded p-2.5 text-xs text-ink placeholder-muted focus:outline-none focus:border-ink font-body"
                  />
                  <div className="text-right text-[10px] text-muted mt-1">
                    {details.length} / 3000
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-bold text-paper bg-danger rounded cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
