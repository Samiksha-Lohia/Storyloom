import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RIGHTS_OPTIONS = [
  { id: 'print', label: 'Print Rights (Hardcover / Paperback)' },
  { id: 'ebook', label: 'eBook Rights' },
  { id: 'audiobook', label: 'Audiobook Rights' },
  { id: 'translation', label: 'Translation & International Rights' },
  { id: 'film_tv_web', label: 'Film, TV & Digital Adaptation Rights' },
];

export default function PublishRequestModal({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  onSuccess,
}) {
  const { user } = useAuth();

  const [company, setCompany] = useState(user?.publisherProfile?.company || user?.name || '');
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [proposedTerms, setProposedTerms] = useState('');
  const [message, setMessage] = useState('');
  const [rights, setRights] = useState(['print', 'ebook']);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleRight = (id) => {
    if (rights.includes(id)) {
      if (rights.length === 1) return; // Keep at least one
      setRights(rights.filter((r) => r !== id));
    } else {
      setRights([...rights, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!company.trim()) return setError('Please provide your publishing company or imprint name.');
    if (!contactName.trim()) return setError('Please provide a contact name.');
    if (!contactEmail.trim() || !contactEmail.includes('@')) return setError('A valid contact email is required.');
    if (!proposedTerms.trim() || proposedTerms.trim().length < 5) {
      return setError('Please outline your proposed terms (e.g. advance, royalties, formats).');
    }
    if (!message.trim() || message.trim().length < 10) {
      return setError('Please provide a brief message to the author (at least 10 characters).');
    }
    if (rights.length === 0) {
      return setError('Please select at least one right category you wish to acquire.');
    }

    setSubmitting(true);
    try {
      const payload = {
        bookId,
        company: company.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        proposedTerms: proposedTerms.trim(),
        message: message.trim(),
        rights,
      };

      const result = await api.publishRequests.create(payload);
      setSubmitted(true);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('Publish request failed:', err);
      setError(err.message || 'Failed to submit publishing request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-offer-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF500A] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 id="publish-offer-title" className="font-serif font-bold text-slate-900 text-lg">
                  Submit Publishing Offer
                </h3>
                <p className="text-xs text-slate-500">
                  Negotiate directly for "{bookTitle}"
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-serif font-bold text-slate-900">
                  Publishing Offer Sent!
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your formal request has been delivered to the author. You will receive an instant notification once they accept or review your terms.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Company & Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Publishing House / Imprint *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Apex Literary Publishing"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Acquisitions Contact Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Sarah Jenkins"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Contact Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="acquisitions@apexpublishing.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Rights Sought */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Rights Sought *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RIGHTS_OPTIONS.map((opt) => {
                      const checked = rights.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleRight(opt.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all ${
                            checked
                              ? 'bg-orange-50/70 border-orange-300 text-orange-950 font-semibold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                              checked
                                ? 'bg-[#FF500A] border-[#FF500A] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Proposed Terms */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Proposed Commercial Terms *
                  </label>
                  <textarea
                    rows={3}
                    value={proposedTerms}
                    onChange={(e) => setProposedTerms(e.target.value)}
                    placeholder="Outline advance offer, royalty tiers (e.g. 15% net), geographic territories, and publication timeline..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                    required
                  />
                </div>

                {/* Message to Author */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Introductory Message to Author *
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce your team, why you loved their manuscript, and how your editorial direction will position this book..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>Min 10 characters</span>
                    <span>{message.length} / 3000</span>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FF500A] hover:bg-[#e04505] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Submitting Offer...' : 'Send Publishing Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
