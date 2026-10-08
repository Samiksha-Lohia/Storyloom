import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Building2, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { APP_NAME } from '../../constants/app';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetEmail =
      category === 'publisher'
        ? 'publishers@storyloom.app'
        : category === 'copyright' || category === 'safety'
        ? 'legal@storyloom.app'
        : 'support@storyloom.app';

    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(
      `[${category.toUpperCase()}] ${subject}`
    )}&body=${encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\nMessage:\n${message}`
    )}`;

    window.location.href = mailtoUrl;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-10 pb-20">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <h1 className="font-calligraphy text-3xl sm:text-4xl font-normal text-ink">
          Contact the {APP_NAME} Team
        </h1>
        <p className="text-muted text-xs leading-relaxed">
          Have a question about manuscript publishing, reader accounts, publisher scouting, or safety moderation? We&apos;re here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 space-y-6">
          <div className="bg-paper border border-rule rounded p-6 space-y-6">
            <h2 className="font-bold text-sm text-ink uppercase tracking-wider">Direct Channels</h2>
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded border border-rule flex items-center justify-center shrink-0 text-ink">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-ink">General Support</span>
                  <a href="mailto:support@storyloom.app" className="text-muted hover:text-ink">
                    support@storyloom.app
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded border border-rule flex items-center justify-center shrink-0 text-ink">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-ink">Publisher Relations</span>
                  <a href="mailto:publishers@storyloom.app" className="text-muted hover:text-ink">
                    publishers@storyloom.app
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded border border-rule flex items-center justify-center shrink-0 text-ink">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-ink">Trust & Legal</span>
                  <a href="mailto:legal@storyloom.app" className="text-muted hover:text-ink">
                    legal@storyloom.app
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-rule flex items-center gap-2 text-xs text-muted">
              <Clock className="w-4 h-4 text-muted" />
              <span>Response time: Usually within 24 hours</span>
            </div>
          </div>

          <div className="bg-paper border border-rule rounded p-6 space-y-3 text-xs text-muted">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider">Helpful Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-accent font-semibold hover:underline inline-flex items-center gap-1">
                  &bull; Visit Help Center & FAQs
                </Link>
              </li>
              <li>
                <Link to="/copyright" className="hover:text-ink">
                  &bull; DMCA & Copyright Guidelines
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-ink">
                  &bull; Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-ink">
                  &bull; Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-7 bg-paper border border-rule rounded p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-bold text-base text-ink border-b border-rule pb-3">
              Send us a message
            </h2>
            <p className="text-xs text-muted">
              Submitting opens a pre-composed message in your email client addressed to our dedicated department.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                  Your Name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full h-10 px-3 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@example.com"
                  className="w-full h-10 px-3 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-category" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Inquiry Category *
              </label>
              <select
                id="contact-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
              >
                <option value="general">General Support & Reader Questions</option>
                <option value="writer">Writer Studio & Manuscript Ingestion</option>
                <option value="publisher">Publisher Licensing & Scout Inquiries</option>
                <option value="copyright">Copyright, DMCA & Legal</option>
                <option value="safety">Trust & Safety Moderation</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact-subject" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Subject *
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Summary of your inquiry"
                className="w-full h-10 px-3 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Message *
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please provide details about your inquiry..."
                className="w-full p-3 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink resize-none"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Compose Email in Default Client</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
