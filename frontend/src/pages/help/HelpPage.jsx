import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  BookOpen,
  PenTool,
  Building2,
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
  Mail,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { APP_NAME } from '../../constants/app';

const FAQ_CATEGORIES = [
  {
    id: 'readers',
    title: 'Readers & Subscriptions',
    icon: BookOpen,
    questions: [
      {
        q: 'How do I start reading on the platform?',
        a: `Browse our public catalog by genre, weekly rankings, or tags. Any reader can immediately read chapters directly in their browser without paywalls.`,
      },
      {
        q: 'Can I bookmark my reading progress across devices?',
        a: 'Yes. When signed into your reader account, your reading position and bookmarks sync across mobile, tablet, and desktop.',
      },
      {
        q: 'Is there an offline reading mode?',
        a: `${APP_NAME} is built as a responsive progressive web app. You can read smoothly on any desktop, tablet, or smartphone browser.`,
      },
      {
        q: 'How do I leave reviews or rate stories?',
        a: 'At the bottom of any finished chapter or book profile page, sign-in to submit star ratings and detailed reader reviews.',
      },
    ],
  },
  {
    id: 'writers',
    title: 'Writers & Publishing',
    icon: PenTool,
    questions: [
      {
        q: `How do I publish my first manuscript on ${APP_NAME}?`,
        a: 'Navigate to Writer Studio, select "New Book", and upload your manuscript (EPUB, PDF, DOCX, or TXT). Our ingestion pipeline automatically parses chapters and scene structure.',
      },
      {
        q: 'Do I retain the copyright to my published books?',
        a: `You retain 100% of your copyright. ${APP_NAME} only requires a non-exclusive license to host, format, and display your text to readers on our platform.`,
      },
      {
        q: 'What is the Story Intelligence engine?',
        a: 'Our analysis suite segments your chapters into distinct scenes, extracts character relationship graphs, and charts narrative tension arcs to assist your editing workflow.',
      },
      {
        q: 'Can I unpublish or delete my story anytime?',
        a: 'Yes. In your Writer Studio book dashboard, you can change your manuscript visibility to Draft or delete it entirely at any moment.',
      },
    ],
  },
  {
    id: 'publishers',
    title: 'Publishers & Scouting',
    icon: Building2,
    questions: [
      {
        q: 'How do publishers obtain verified scout access?',
        a: 'Accredited literary agents, editors, and scouts can apply for a Publisher account. Our editorial team reviews business credentials within 2 business days.',
      },
      {
        q: 'What publisher discovery features are available?',
        a: 'Scouts can filter trending manuscripts by genre, reader sentiment scores, pacing metrics, and contact authors directly for licensing inquiries.',
      },
      {
        q: 'How are author contact requests handled?',
        a: 'Publishers submit structured pitch requests directly through the manuscript profile. Authors receive in-app notifications and review proposals privately.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety, Content & DMCA',
    icon: Shield,
    questions: [
      {
        q: 'How do I report inappropriate or plagiarized content?',
        a: 'Use the "Report" button on any story card or chapter, or email legal directly with proof of copyright infringement.',
      },
      {
        q: 'What content guidelines are enforced?',
        a: 'We strictly prohibit unauthorized fanfiction containing copyright violations, non-consensual imagery, hate speech, and harassment.',
      },
      {
        q: 'How does DMCA takedown notice processing work?',
        a: 'Our legal department processes formal DMCA notices within 24 hours. Counter-notices can be filed according to our DMCA policy guidelines.',
      },
    ],
  },
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openQuestions, setOpenQuestions] = useState({ 'readers-0': true, 'writers-0': true });

  const toggleQuestion = (catId, idx) => {
    const key = `${catId}-${idx}`;
    setOpenQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredCategories = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 space-y-12 pb-20">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="font-calligraphy text-3xl sm:text-5xl font-normal text-ink">
          How can we help you today?
        </h1>
        <p className="text-muted text-xs leading-relaxed">
          Find answers to common questions about reading, publishing, structural analysis, and publisher acquisitions.
        </p>

        <div className="pt-2 relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics, FAQs, and guides..."
            className="w-full h-10 pl-9 pr-3 bg-paper border border-rule rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/browse"
          className="bg-paper border border-rule rounded p-5 flex flex-col justify-between hover:border-ink"
        >
          <div>
            <div className="w-8 h-8 rounded border border-rule flex items-center justify-center mb-3 text-ink">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-ink text-sm">
              Explore Stories
            </h3>
            <p className="text-muted text-xs mt-1">
              Browse weekly trending manuscripts and discover serialized chapters across 11 genres.
            </p>
          </div>
          <span className="text-xs font-bold text-accent mt-4 inline-flex items-center gap-1">
            Browse catalogue &rarr;
          </span>
        </Link>

        <Link
          to="/signup?role=writer"
          className="bg-paper border border-rule rounded p-5 flex flex-col justify-between hover:border-ink"
        >
          <div>
            <div className="w-8 h-8 rounded border border-rule flex items-center justify-center mb-3 text-ink">
              <PenTool className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-ink text-sm">
              Writer Studio
            </h3>
            <p className="text-muted text-xs mt-1">
              Publish original manuscripts, view scene pacing, and build an audience of dedicated readers.
            </p>
          </div>
          <span className="text-xs font-bold text-accent mt-4 inline-flex items-center gap-1">
            Start writing &rarr;
          </span>
        </Link>

        <Link
          to="/contact"
          className="bg-paper border border-rule rounded p-5 flex flex-col justify-between hover:border-ink"
        >
          <div>
            <div className="w-8 h-8 rounded border border-rule flex items-center justify-center mb-3 text-ink">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-ink text-sm">
              Contact Support
            </h3>
            <p className="text-muted text-xs mt-1">
              Need personalized assistance? Send a message directly to our dedicated support team.
            </p>
          </div>
          <span className="text-xs font-bold text-accent mt-4 inline-flex items-center gap-1">
            Open contact form &rarr;
          </span>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="border-b border-rule pb-3">
          <h2 className="text-lg font-bold text-ink">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-muted mt-1">
            Select any question to expand detailed instructions and guides.
          </p>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="bg-paper border border-rule rounded p-8 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-muted mx-auto" />
            <h3 className="font-bold text-ink text-sm">No matching topics found</h3>
            <p className="text-muted text-xs max-w-sm mx-auto">
              We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Try a different keyword or contact our support team.
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="sm">
                Contact Support
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="bg-paper border border-rule rounded p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-rule pb-2">
                    <Icon className="w-4 h-4 text-ink" />
                    <h3 className="font-bold text-sm text-ink">{cat.title}</h3>
                  </div>

                  <div className="space-y-2">
                    {cat.questions.map((q, idx) => {
                      const key = `${cat.id}-${idx}`;
                      const isOpen = Boolean(openQuestions[key]);

                      return (
                        <div key={idx} className="border border-rule rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleQuestion(cat.id, idx)}
                            className="w-full text-left p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-rule/10"
                          >
                            <span className="font-semibold text-xs text-ink">{q.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-muted shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="p-3 pt-0 text-xs text-muted leading-relaxed border-t border-rule bg-paper">
                              {q.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-paper border border-rule rounded p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-base font-bold text-ink">Still have questions?</h2>
          <p className="text-muted text-xs max-w-md">
            Our team is available to assist writers with ingestion questions, readers with book recommendations, and publishers with licensing inquiries.
          </p>
        </div>
        <Link to="/contact">
          <Button variant="primary" size="md" className="whitespace-nowrap cursor-pointer">
            Get in Touch
          </Button>
        </Link>
      </div>
    </div>
  );
}
