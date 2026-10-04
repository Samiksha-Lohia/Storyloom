import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  BookOpen,
  PenTool,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

const FAQ_CATEGORIES = [
  {
    id: 'readers',
    title: 'For Readers',
    icon: BookOpen,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    questions: [
      {
        q: 'How does reading progress and bookmarking work?',
        a: 'Your reading position is automatically saved to your cloud library as you turn pages. You can also manually add bookmarks at any character position using the bookmark button in the top reader toolbar.',
      },
      {
        q: 'Can I read offline or on mobile devices?',
        a: 'SceneCraft is built as a responsive progressive web app. You can read smoothly on any desktop, tablet, or smartphone browser without downloading additional software.',
      },
      {
        q: 'How do I add stories to my personal library?',
        a: 'On any story page, click the "+" button next to "Start Reading". You can organize books into Currently Reading, Want to Read, or Finished shelves in your Library.',
      },
    ],
  },
  {
    id: 'writers',
    title: 'For Writers',
    icon: PenTool,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    questions: [
      {
        q: 'How do I publish my first manuscript on SceneCraft?',
        a: 'Navigate to Writer Studio → Publish New (/w/books/new). Enter your story title, synopsis, genre, and paste your manuscript text or upload a .txt/.docx file. The automated ingestion pipeline will paginate and analyze your story.',
      },
      {
        q: 'Who retains copyright over stories published here?',
        a: 'You retain 100% of your copyright. SceneCraft only requires a non-exclusive license to host, format, and display your text to readers on our platform.',
      },
      {
        q: 'What are narrative insights and how are they generated?',
        a: 'Our pipeline generates character interaction networks, scene pacing curves, and entity co-occurrence graphs to help writers understand the structure and emotional rhythm of their manuscripts.',
      },
    ],
  },
  {
    id: 'publishers',
    title: 'For Publishers',
    icon: Building2,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    questions: [
      {
        q: 'How do publisher applications and approvals work?',
        a: 'Publishers apply at /p/apply. Our editorial and admin trust team reviews verification details within 2-3 business days. Once approved, you gain full access to the Scout Portal and acquisitions tools.',
      },
      {
        q: 'Can I contact writers directly about licensing rights?',
        a: 'Yes. Approved publishers can submit formal representation or adaptation offers via the "Submit Offer" form on any book pitch page. If the writer accepts, a secure direct messaging channel is opened.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Trust & Safety',
    icon: ShieldCheck,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    questions: [
      {
        q: 'How do I report inappropriate content or copyright violations?',
        a: 'Click the Report button on any story card or detail page. For formal DMCA takedown requests, visit our dedicated Copyright page at /copyright.',
      },
      {
        q: 'How is mature (18+) content moderated?',
        a: 'Stories with mature themes must be flagged by the author. Readers must acknowledge an age-verification gate before reading mature works.',
      },
    ],
  },
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (catId, idx) => {
    const key = `${catId}-${idx}`;
    setOpenQuestions((prev) => ({ ...prev, [key]: !prev[key] }));
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
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E8] border border-[#FF500A]/20 text-[#FF500A] text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          SceneCraft Help Center
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
          How can we help you today?
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Find answers to common questions about reading, publishing, structural analysis, and publisher acquisitions.
        </p>

        {/* Search Bar */}
        <div className="pt-2 relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics, FAQs, and guides..."
            className="w-full h-12 pl-11 pr-4 bg-white border border-stone-200 rounded-full text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] transition"
          />
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/browse"
          className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-[#FF500A]/50 hover:shadow-md transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF500A] flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm group-hover:text-[#FF500A] transition">
              Explore Stories
            </h3>
            <p className="text-stone-500 text-xs mt-1">
              Browse weekly trending manuscripts and discover serialized chapters across 11 genres.
            </p>
          </div>
          <span className="text-xs font-bold text-[#FF500A] mt-4 inline-flex items-center gap-1">
            Browse catalogue &rarr;
          </span>
        </Link>

        <Link
          to="/signup?role=writer"
          className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-[#FF500A]/50 hover:shadow-md transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm group-hover:text-[#FF500A] transition">
              Writer Studio
            </h3>
            <p className="text-stone-500 text-xs mt-1">
              Publish original manuscripts, view scene pacing, and build an audience of dedicated readers.
            </p>
          </div>
          <span className="text-xs font-bold text-[#FF500A] mt-4 inline-flex items-center gap-1">
            Start writing &rarr;
          </span>
        </Link>

        <Link
          to="/contact"
          className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-[#FF500A]/50 hover:shadow-md transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm group-hover:text-[#FF500A] transition">
              Contact Support
            </h3>
            <p className="text-stone-500 text-xs mt-1">
              Need personalized assistance? Send a message directly to our dedicated support team.
            </p>
          </div>
          <span className="text-xs font-bold text-[#FF500A] mt-4 inline-flex items-center gap-1">
            Open contact form &rarr;
          </span>
        </Link>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        <div className="border-b border-stone-200 pb-3">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Select any question to expand detailed instructions and guides.
          </p>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-stone-400 mx-auto" />
            <h3 className="font-bold text-stone-800 text-sm">No matching topics found</h3>
            <p className="text-stone-500 text-xs max-w-sm mx-auto">
              We couldn't find any questions matching "{searchQuery}". Try a different keyword or contact our support team.
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
                <div key={cat.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-heading font-bold text-base text-stone-900">{cat.title}</h3>
                  </div>

                  <div className="space-y-2">
                    {cat.questions.map((q, idx) => {
                      const key = `${cat.id}-${idx}`;
                      const isOpen = Boolean(openQuestions[key]);

                      return (
                        <div key={idx} className="border border-stone-100 rounded-xl overflow-hidden transition">
                          <button
                            type="button"
                            onClick={() => toggleQuestion(cat.id, idx)}
                            className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition cursor-pointer"
                          >
                            <span className="font-semibold text-xs text-stone-800">{q.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="p-3.5 pt-0 text-xs text-stone-600 leading-relaxed border-t border-stone-100/60 bg-stone-50/50">
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

      {/* Still need help CTA */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="font-heading text-xl sm:text-2xl font-bold">Still have questions?</h2>
          <p className="text-stone-300 text-xs sm:text-sm max-w-md">
            Our team is available to assist writers with ingestion questions, readers with book recommendations, and publishers with licensing inquiries.
          </p>
        </div>
        <Link to="/contact">
          <Button variant="primary" size="lg" className="whitespace-nowrap shadow-md">
            Get in Touch
          </Button>
        </Link>
      </div>
    </div>
  );
}
