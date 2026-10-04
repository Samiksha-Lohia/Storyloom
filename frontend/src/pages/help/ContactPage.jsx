import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  MessageSquare,
  Building2,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate support ticket dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setCategory('general');
    setSubject('');
    setMessage('');
    setSubmitted(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-10 pb-20">
      {/* Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E8] text-[#FF500A] text-xs font-bold uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          Get In Touch
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Contact the SceneCraft Team
        </h1>
        <p className="text-stone-600 text-sm leading-relaxed">
          Have a question about manuscript publishing, reader accounts, publisher scouting, or safety moderation? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact Info Sidebar */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 space-y-6 shadow-lg">
            <h2 className="font-heading font-bold text-lg text-white">Direct Channels</h2>
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 text-[#FF500A]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-stone-200">General Support</span>
                  <a href="mailto:support@scenecraft.com" className="text-stone-400 hover:text-white transition">
                    support@scenecraft.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 text-purple-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-stone-200">Publisher Relations</span>
                  <a href="mailto:publishers@scenecraft.com" className="text-stone-400 hover:text-white transition">
                    publishers@scenecraft.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-stone-200">Trust & Legal</span>
                  <a href="mailto:legal@scenecraft.com" className="text-stone-400 hover:text-white transition">
                    legal@scenecraft.com
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center gap-2 text-xs text-stone-400">
              <Clock className="w-4 h-4 text-[#FF500A]" />
              <span>Response time: Usually within 24 hours</span>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-3 shadow-xs text-xs text-stone-600">
            <h3 className="font-bold text-stone-900 text-sm">Helpful Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-[#FF500A] font-semibold hover:underline inline-flex items-center gap-1">
                  &bull; Visit Help Center & FAQs
                </Link>
              </li>
              <li>
                <Link to="/copyright" className="hover:text-stone-900 transition">
                  &bull; DMCA & Copyright Guidelines
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-stone-900 transition">
                  &bull; Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-stone-900 transition">
                  &bull; Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-stone-900">
                Message Received!
              </h2>
              <p className="text-stone-600 text-sm max-w-sm mx-auto leading-relaxed">
                Thank you for reaching out, <strong>{name}</strong>. A support ticket has been opened and sent to our team at <strong>{email}</strong>.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button variant="secondary" size="md" onClick={handleReset}>
                  Send Another Message
                </Button>
                <Link to="/">
                  <Button variant="primary" size="md">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-heading font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
                Send us a message
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Vance"
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@example.com"
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-category" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Inquiry Category *
                </label>
                <select
                  id="contact-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] focus:bg-white transition cursor-pointer"
                >
                  <option value="general">General Support & Reader Questions</option>
                  <option value="writer">Writer Studio & Manuscript Ingestion</option>
                  <option value="publisher">Publisher Licensing & Scout Inquiries</option>
                  <option value="copyright">Copyright, DMCA & Legal</option>
                  <option value="safety">Trust & Safety Moderation</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summary of your inquiry"
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] focus:bg-white transition"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please provide details about your inquiry..."
                  className="w-full p-3.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] focus:bg-white transition resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  className="w-full shadow-xs"
                >
                  {loading ? 'Submitting...' : 'Send Message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
