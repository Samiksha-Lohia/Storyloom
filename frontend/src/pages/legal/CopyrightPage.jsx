import React, { useState } from 'react';
import { LegalPageLayout } from './LegalPageLayout';
import { ShieldAlert, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/common/Button';

export function CopyrightPage() {
  const [targetId, setTargetId] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantContact, setClaimantContact] = useState('');
  const [details, setDetails] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot field
  const [perjuryAck, setPerjuryAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Extract MongoDB ObjectId if user pasted full URL (e.g. /book/6ac16...)
    let cleanId = targetId.trim();
    const match = cleanId.match(/([0-9a-fA-F]{24})/);
    if (match) {
      cleanId = match[1];
    }

    if (!cleanId || cleanId.length !== 24) {
      setError('Please provide a valid 24-character Book ID or SceneCraft book URL.');
      return;
    }

    if (!perjuryAck) {
      setError('You must confirm the good faith declaration under penalty of perjury.');
      return;
    }

    setLoading(true);
    try {
      await api.reports.submitPublicNotice({
        targetType: 'book',
        targetId: cleanId,
        reason: 'copyright',
        details,
        claimantName,
        claimantContact,
        honeypot,
      });

      setSuccess(true);
      setTargetId('');
      setClaimantName('');
      setClaimantContact('');
      setDetails('');
      setHoneypot('');
      setPerjuryAck(false);
    } catch (err) {
      setError(err.message || 'Failed to submit takedown notice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalPageLayout title="Copyright & Takedown Policy" lastUpdated="October 2026">
      {/* Draft Notice Banner */}
      <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-8 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Draft Policy Notice
          </h2>
          <p className="text-xs text-amber-800 mt-0.5">
            Draft: requires legal review. The following procedure is provided for informational and preliminary dispute resolution purposes.
          </p>
        </div>
      </div>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">1. Intellectual Property Protection</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          SceneCraft respects the intellectual property rights of creators and expects its users to do the same. In accordance with the Digital Millennium Copyright Act (DMCA) and international copyright directives, we promptly process notices of alleged copyright infringement.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">2. Author Rights & Ownership</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          Writers on SceneCraft retain 100% of the copyright in their original literary works. Uploading your manuscript to SceneCraft does not transfer ownership of your stories, characters, or world-building to SceneCraft.
        </p>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">3. Requirements for a Valid Notice</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          If you believe in good faith that any content hosted on SceneCraft infringes your copyright, please submit a notice containing:
        </p>
        <ul className="list-disc pl-6 space-y-1 font-sans text-stone-700 text-sm">
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Identification of the infringing material on SceneCraft (Book ID or URL).</li>
          <li>Your contact information (name, mailing address, telephone number, and email address).</li>
          <li>A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement under penalty of perjury that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
          <li>An electronic or physical signature of the copyright owner or authorized agent.</li>
        </ul>
      </section>

      {/* Public Takedown Form */}
      <section className="space-y-4 font-sans pt-4">
        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E8] flex items-center justify-center text-[#FF500A]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Submit Public Takedown Notice
              </h2>
              <p className="text-xs text-stone-500">
                Direct statutory notice for copyright holders and authorized representatives.
              </p>
            </div>
          </div>

          {success ? (
            <div className="py-8 text-center space-y-3 bg-white rounded-2xl border border-stone-200 p-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-heading font-bold text-stone-900 text-lg">
                Takedown Notice Received
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Your notice has been logged and forwarded to the Trust & Safety and Legal team. A confirmation reference has been created.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuccess(false)}
                className="mt-2"
              >
                Submit another notice
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              {/* Honeypot field (hidden from legitimate users, catches spam bots) */}
              <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                <label htmlFor="website-hp">Website</label>
                <input
                  type="text"
                  id="website-hp"
                  name="website"
                  tabIndex="-1"
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  SceneCraft Book ID or URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6ac1642a8df244b1988d7951 or https://scenecraft.com/book/..."
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Claimant Legal Name / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name of copyright holder"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Contact Email / Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="author@publisher.com or phone"
                    value={claimantContact}
                    onChange={(e) => setClaimantContact(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Infringement Details & Proof of Rights *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={3000}
                  placeholder="Describe your original copyrighted work, registration details (if applicable), and specific infringing excerpts or chapters..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-xs text-stone-800 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                />
              </div>

              <div className="p-3.5 bg-white border border-stone-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="perjury-ack"
                  checked={perjuryAck}
                  onChange={(e) => setPerjuryAck(e.target.checked)}
                  className="mt-0.5 rounded text-[#FF500A] focus:ring-[#FF500A]"
                />
                <label htmlFor="perjury-ack" className="text-xs text-stone-700 leading-snug cursor-pointer">
                  I state under penalty of perjury that I am the owner or authorized agent of the copyrighted work and that the disputed use is not authorized.
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting Notice...' : 'Submit Takedown Notice'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="space-y-3 font-sans pt-4">
        <h2 className="font-heading font-bold text-xl text-stone-900">4. Designated Copyright Agent</h2>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 font-sans text-sm text-stone-800 space-y-1">
          <p className="font-bold">SceneCraft Copyright Agent</p>
          <p>Legal & Trust & Safety Team</p>
          <p>Email: <a href="mailto:copyright@scenecraft.local" className="text-[#FF500A] underline">copyright@scenecraft.local</a></p>
        </div>
      </section>

      <section className="space-y-3 font-sans">
        <h2 className="font-heading font-bold text-xl text-stone-900">5. Counter-Notification Procedure</h2>
        <p className="font-serif text-stone-700 leading-relaxed">
          If you believe your content was wrongly removed due to a mistake or misidentification, you may submit a counter-notice in writing to our designated agent following statutory DMCA requirements.
        </p>
      </section>
    </LegalPageLayout>
  );
}
