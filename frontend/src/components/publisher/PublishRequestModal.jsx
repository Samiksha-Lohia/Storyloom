import React, { useState } from 'react';
import {
  X,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Mail,
  Inbox,
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
      if (rights.length === 1) return;
      setRights(rights.filter((r) => r !== id));
    } else {
      setRights([...rights, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-body">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-offer-title"
        className="relative w-full max-w-xl bg-paper rounded border border-rule overflow-hidden text-left max-h-[90vh] flex flex-col text-ink"
      >
        <div className="flex items-center justify-between p-4 border-b border-rule bg-paper">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-ink" />
            <div>
              <h3 id="publish-offer-title" className="font-bold text-ink text-base">
                Submit Publishing Offer
              </h3>
              <p className="text-xs text-muted">
                Negotiate directly for "{bookTitle}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-ink rounded border border-rule hover:border-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <h4 className="text-lg font-bold text-ink">
                Publishing Offer Sent
              </h4>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Your formal request has been delivered to the author. You will receive a notification once they review your terms.
              </p>
              <div className="pt-2 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-paper rounded text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 border border-danger text-danger text-xs rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Publishing House / Imprint *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Apex Literary Publishing"
                      className="w-full pl-9 pr-3 py-1.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Acquisitions Contact Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Sarah Jenkins"
                      className="w-full pl-9 pr-3 py-1.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="acquisitions@apexpublishing.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
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
                        className={`flex items-center gap-2 p-2 rounded border text-left text-xs cursor-pointer ${
                          checked
                            ? 'bg-ink text-paper border-ink font-bold'
                            : 'bg-paper border-rule text-ink hover:border-ink'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${
                            checked ? 'bg-paper border-paper text-ink' : 'border-rule'
                          }`}
                        >
                          {checked && <div className="w-2 h-2 bg-ink rounded-xs" />}
                        </div>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Proposed Commercial Terms *
                </label>
                <textarea
                  rows={3}
                  value={proposedTerms}
                  onChange={(e) => setProposedTerms(e.target.value)}
                  placeholder="Outline advance offer, royalty tiers, territories..."
                  className="w-full p-2.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Introductory Message to Author *
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Introduce your team, why you loved their manuscript..."
                  className="w-full p-2.5 bg-paper border border-rule rounded text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none resize-none"
                  required
                />
                <div className="flex justify-between items-center text-[10px] text-muted mt-1">
                  <span>Min 10 characters</span>
                  <span>{message.length} / 3000</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-rule">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-bold text-ink rounded border border-rule hover:border-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-paper rounded text-xs font-bold cursor-pointer"
                >
                  <Inbox className="w-4 h-4" />
                  {submitting ? 'Loading…' : 'Send Publishing Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

