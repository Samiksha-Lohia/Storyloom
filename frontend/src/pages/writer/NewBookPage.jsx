import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CoverCropper from '../../components/common/CoverCropper';
import PipelineProgressView from '../../components/writer/PipelineProgressView';
import TemplatePicker from '../../components/writer/TemplatePicker';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { GENRES } from '../../constants/app';
import { DEFAULT_ACCENT } from '../../constants/templates';

const STEPS = [
  { id: 'manuscript', label: '1. Manuscript' },
  { id: 'cover', label: '2. Cover Artwork' },
  { id: 'metadata', label: '3. Story Details' },
  { id: 'template', label: '4. Layout Template' },
  { id: 'rights', label: '5. Rights & AI' },
];

export function NewBookPage() {
  const { user } = useAuth();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [manuscriptFile, setManuscriptFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [genre, setGenre] = useState(GENRES[0] || 'Fantasy');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [language, setLanguage] = useState('en');
  const [mature, setMature] = useState(false);
  const [template, setTemplate] = useState(user?.defaultTemplate || 'classic');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [acceptedRights, setAcceptedRights] = useState(false);

  // Submission & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdBook, setCreatedBook] = useState(null);

  // Manuscript Validation (Max 15 MB, .txt/.pdf/.docx)
  const validateManuscript = (file) => {
    if (!file) return 'Please select a manuscript file.';
    const validExtensions = ['.txt', '.pdf', '.docx'];
    const validMimes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const hasValidMime = validMimes.includes(file.type);
    if (!hasValidExt && !hasValidMime) {
      return 'Supported formats are .txt, .pdf, or .docx manuscripts.';
    }
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed is 15 MB.`;
    }
    return null;
  };

  const handleManuscriptDrop = (e) => {
    e.preventDefault();
    setSubmitError('');
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const err = validateManuscript(file);
      if (err) {
        setSubmitError(err);
      } else {
        setManuscriptFile(file);
        if (!title) {
          // Auto-fill title from filename
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
      }
    }
  };

  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (clean && !tags.includes(clean) && tags.length < 10) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Step Validation
  const canProceed = () => {
    if (currentStep === 0) return !!manuscriptFile;
    if (currentStep === 1) return true; // Cover is optional, fallback tint generated
    if (currentStep === 2) return title.trim().length > 0 && blurb.trim().length > 0;
    if (currentStep === 3) return true;
    if (currentStep === 4) return acceptedRights;
    return true;
  };

  // Submission handler
  const handleSubmit = async () => {
    if (!manuscriptFile || !title.trim() || !acceptedRights) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const formData = new FormData();
      formData.append('file', manuscriptFile);
      if (coverFile) {
        formData.append('cover', coverFile);
      }
      formData.append('title', title.trim());
      formData.append('blurb', blurb.trim());
      formData.append('genre', genre);
      formData.append('language', language);
      formData.append('mature', String(mature));
      formData.append('template', template);
      formData.append('accent', accent);
      formData.append('acceptedRights', 'true');

      tags.forEach((tag) => {
        formData.append('tags[]', tag);
      });

      const result = await api.books.create(formData);
      setCreatedBook(result);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create story.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If book is submitted, switch to live pipeline progress view
  if (createdBook) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <PipelineProgressView
          book={createdBook}
          documentId={createdBook.documentId}
          onPublished={() => {
            // Callback when published
          }}
        />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A]">
          Writer Studio
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-stone-900 mt-1">
          Publish New Story
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Upload your manuscript, frame your cover artwork, and activate AI story intelligence.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === idx;
            const isDone = currentStep > idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (idx < currentStep) setCurrentStep(idx);
                }}
                disabled={idx > currentStep}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#FF500A] text-white shadow-xs'
                    : isDone
                    ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    : 'text-stone-400 cursor-not-allowed'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Wizard Content Panels */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        {/* ─── Step 1: Manuscript ────────────────────────────────────────── */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Manuscript Upload</h2>
              <p className="text-xs text-stone-500">
                Upload your completed or in-progress manuscript file (.txt, .pdf, or .docx up to 15 MB).
              </p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleManuscriptDrop}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                manuscriptFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-stone-200 hover:border-[#FF500A] bg-stone-50/50 hover:bg-[#FFF0E8]/20'
              }`}
            >
              {manuscriptFile ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-base">{manuscriptFile.name}</p>
                    <p className="text-xs text-stone-500">
                      {(manuscriptFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for pagination
                    </p>
                  </div>
                  <label className="text-xs font-bold text-[#FF500A] hover:underline cursor-pointer">
                    Replace Manuscript
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const err = validateManuscript(file);
                          if (err) setSubmitError(err);
                          else {
                            setManuscriptFile(file);
                            setSubmitError('');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const err = validateManuscript(file);
                        if (err) setSubmitError(err);
                        else {
                          setManuscriptFile(file);
                          setSubmitError('');
                        }
                      }
                    }}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center text-stone-400">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 text-sm block">
                      Choose manuscript or drag and drop here
                    </span>
                    <span className="text-xs text-stone-500 mt-1 block">
                      Text files (.txt), Word (.docx), or PDF (.pdf) up to 15 MB
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-stone-100 rounded-full text-[11px] font-bold text-stone-600">
                    Client-side validation verified
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 2: Cover with 2:3 Canvas Cropper ──────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Cover Artwork (2:3 Ratio)</h2>
              <p className="text-xs text-stone-500">
                Frame your cover to the standard 2:3 book ratio. If skipped, an elegant tinted fallback will be generated.
              </p>
            </div>

            <CoverCropper
              initialFile={coverFile}
              onCropComplete={(file, url) => {
                setCoverFile(file);
                setCoverPreviewUrl(url);
              }}
            />
          </div>
        )}

        {/* ─── Step 3: Metadata ─────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Story Details</h2>
              <p className="text-xs text-stone-500">
                Give your readers the title, synopsis, genre, and tags.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Story Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Echoes of the Obsidian Crown"
                  className="font-medium text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Synopsis / Blurb *
                </label>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="Hook your readers with a compelling summary..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF500A] focus:border-transparent text-sm text-stone-900 resize-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Primary Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF500A] text-sm text-stone-900 bg-white"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF500A] text-sm text-stone-900 bg-white"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Tags (up to 10)
                </label>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-[#FF500A]">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-stone-100 text-stone-800 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-stone-400 hover:text-red-500 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length < 10 ? 'Type tag and press Enter...' : 'Tag limit reached'}
                    disabled={tags.length >= 10}
                    className="flex-1 min-w-[140px] px-2 py-1 text-xs sm:text-sm focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Maturity Rating */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-stone-900 block">Mature Content (18+)</span>
                  <span className="text-xs text-stone-500 block">
                    Contains graphic violence, explicit language, or mature themes.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mature}
                    onChange={(e) => setMature(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF500A]" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Template & Accent Selection with Live Preview ── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Story Presentation Template</h2>
              <p className="text-xs text-stone-500">
                Choose how your book detail page is rendered to readers, and see the live preview below.
              </p>
            </div>

            <TemplatePicker
              selectedTemplate={template}
              onSelectTemplate={setTemplate}
              selectedAccent={accent}
              onSelectAccent={setAccent}
              draftBook={{
                title: title.trim(),
                blurb: blurb.trim(),
                genre,
                tags,
                mature,
                coverPreviewUrl,
                writerName: user?.name,
                writerUsername: user?.username,
              }}
            />
          </div>
        )}

        {/* ─── Step 5: Rights & AI Disclosure ──────────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Rights & AI Intelligence Disclosure</h2>
              <p className="text-xs text-stone-500">
                Confirm your ownership and acknowledge automated story intelligence processing.
              </p>
            </div>

            <div className="space-y-4">
              {/* Rights Checkbox */}
              <label className="p-4 rounded-2xl border border-stone-200 hover:border-[#FF500A] bg-stone-50/50 flex items-start gap-3.5 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={acceptedRights}
                  onChange={(e) => setAcceptedRights(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#FF500A] rounded border-stone-300 focus:ring-[#FF500A]"
                  required
                />
                <div>
                  <span className="font-bold text-sm text-stone-900 block flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#FF500A]" />
                    I own this work or have the rights to publish it
                  </span>
                  <span className="text-xs text-stone-600 mt-0.5 block leading-relaxed">
                    By submitting this manuscript, you certify under penalty of terms suspension that you are the creator or authorized rights-holder of this original work.
                  </span>
                </div>
              </label>

              {/* AI Disclosure Line per Spec §13 */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-start gap-3.5 text-xs text-amber-900 leading-relaxed">
                <Cpu className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950">AI Narrative Intelligence Disclosure</span>
                  <span>
                    Manuscripts are sent to a private LLM provider for analysis (extracting scenes, character networks, timelines, and dialogue metrics). Your text is never used to train public foundational models.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-stone-100 mt-6">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-1.5"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? 'Uploading & Starting Pipeline...' : 'Submit Manuscript'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
