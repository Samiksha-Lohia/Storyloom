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
      // Prompt user to login to submit in-app report
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
          className={`p-1 text-stone-400 hover:text-red-600 transition rounded-lg hover:bg-stone-100 ${className}`}
        >
          <Flag className="w-4 h-4" />
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 border border-stone-200 transition ${className}`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
      )}

      {variant === 'link' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`text-xs text-stone-400 hover:text-red-600 transition inline-flex items-center gap-1 ${className}`}
        >
          <Flag className="w-3 h-3" />
          <span>Report {targetType}</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-stone-900">
                  Report {targetType}
                </h3>
                {targetTitle && (
                  <p className="text-xs text-stone-500 truncate max-w-xs">{targetTitle}</p>
                )}
              </div>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-heading font-bold text-stone-900 text-base">
                  Report Submitted
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  Thank you for helping keep our community safe. Our moderation team will review this item.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Reason for report
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  >
                    <option value="abuse">Harassment, hate speech, or abuse</option>
                    <option value="plagiarism">Plagiarism or stolen content</option>
                    <option value="copyright">Copyright infringement</option>
                    <option value="spam">Spam, scam, or misleading</option>
                    <option value="other">Other policy violation</option>
                  </select>
                </div>

                {reason === 'copyright' && (
                  <div className="space-y-3 p-3.5 bg-amber-500/10 border border-amber-300 rounded-2xl">
                    <p className="text-[11px] text-amber-900 font-medium">
                      Copyright claims require claimant verification under our Terms of Service.
                    </p>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Claimant Name / Entity *
                      </label>
                      <input
                        type="text"
                        required
                        value={claimantName}
                        onChange={(e) => setClaimantName(e.target.value)}
                        placeholder="Legal name of rights owner"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Contact Email / Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={claimantContact}
                        onChange={(e) => setClaimantContact(e.target.value)}
                        placeholder="author@example.com or phone"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Details / Explanation
                  </label>
                  <textarea
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={3000}
                    placeholder="Provide specific details, quotes, or timestamps to assist our moderation team..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  />
                  <div className="text-right text-[10px] text-stone-400 mt-1">
                    {details.length} / 3000
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 rounded-full hover:bg-stone-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-full transition disabled:opacity-50 shadow-xs"
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
