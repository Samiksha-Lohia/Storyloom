import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton } from '../../components/common/Skeleton';
import CoverCropper from '../../components/common/CoverCropper';
import TemplatePicker from '../../components/writer/TemplatePicker';
import { GENRES } from '../../constants/app';
import { DEFAULT_ACCENT } from '../../constants/templates';

export function EditBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Book State
  const [book, setBook] = useState(null);
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [genre, setGenre] = useState('General');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [language, setLanguage] = useState('en');
  const [mature, setMature] = useState(false);
  const [template, setTemplate] = useState('classic');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [status, setStatus] = useState('draft');

  // Cover replacement state
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadBook() {
      try {
        setLoading(true);
        setError('');
        const res = await api.books.getById(id);
        const data = res?.data || res;
        if (!isMounted) return;

        setBook(data);
        setTitle(data.title || '');
        setBlurb(data.blurb || '');
        setGenre(data.genre || 'General');
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setLanguage(data.language || 'en');
        setMature(Boolean(data.mature));
        setTemplate(data.template || 'classic');
        setAccent(data.accent || DEFAULT_ACCENT);
        setStatus(data.status || 'draft');
        setCoverPreviewUrl(data.coverUrl || '');
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load book for editing.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (id) loadBook();
    return () => {
      isMounted = false;
    };
  }, [id]);

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

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Story title cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      let updated;
      if (newCoverFile) {
        // Multipart FormData for cover replacement + metadata
        const formData = new FormData();
        formData.append('cover', newCoverFile);
        formData.append('title', title.trim());
        formData.append('blurb', blurb.trim());
        formData.append('genre', genre);
        formData.append('language', language);
        formData.append('mature', String(mature));
        formData.append('template', template);
        formData.append('accent', accent);
        formData.append('status', status);
        tags.forEach((tag) => formData.append('tags[]', tag));

        updated = await api.books.update(id, formData, true);
      } else {
        // JSON payload
        const payload = {
          title: title.trim(),
          blurb: blurb.trim(),
          genre,
          tags,
          language,
          mature,
          template,
          accent,
          status,
        };
        updated = await api.books.update(id, payload, false);
      }

      setBook(updated);
      if (updated.coverUrl) setCoverPreviewUrl(updated.coverUrl);
      setNewCoverFile(null);
      setShowCoverCropper(false);
      setSuccessMsg('Story details, template, and presentation updated successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update book.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="bg-white rounded-3xl p-8 border border-stone-200 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Story Not Found</h2>
        <p className="text-sm text-stone-600">{error}</p>
        <Link to="/w/books">
          <Button variant="outline" size="sm">
            ← Return to My Books
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 pb-20">
      {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/w/books')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back to My Books"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A]">
              Story Settings
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212]">
              Edit Story & Presentation
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/book/${id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5" />
              Public Page
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs shadow-md"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* ─── Alerts ────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium flex-1">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      {/* ─── Main Form Section ─────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-10">
        {/* Cover Artwork & Metadata Card */}
        <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-serif text-lg font-bold text-[#121212] border-b border-[#E5E5E5] pb-3">
            Cover Artwork & Story Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Cover Column */}
            <div className="md:col-span-4 flex flex-col items-center space-y-4">
              <div className="w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-md border border-[#E5E5E5] bg-[#F7F7F7]">
                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt={title || 'Cover'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs">No cover image</span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCoverCropper(!showCoverCropper)}
                className="text-xs"
              >
                {showCoverCropper ? 'Cancel Cover Crop' : 'Replace Cover Image'}
              </Button>

              {newCoverFile && (
                <span className="text-[11px] font-bold text-emerald-600">
                  ✓ New cover ready to save
                </span>
              )}
            </div>

            {/* Metadata Fields Column */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                  Story Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Story Title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                  Synopsis / Blurb
                </label>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="Provide a compelling synopsis..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E5E5E5] text-sm text-[#121212] focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E5] text-sm text-[#121212] bg-[#F7F7F7]"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E5] text-sm text-[#121212] bg-[#F7F7F7]"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E5] text-sm text-[#121212] bg-[#F7F7F7]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                  Tags (up to 10)
                </label>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-[#E5E5E5] bg-white">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-[#F7F7F7] text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-[#E5E5E5]"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-red-500 font-bold cursor-pointer"
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
                    className="flex-1 min-w-[140px] px-2 py-1 text-xs sm:text-sm focus:outline-hidden bg-transparent"
                  />
                </div>
              </div>

              {/* Mature toggle */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#121212] block">Mature Content (18+)</span>
                  <span className="text-[11px] text-slate-500 block">
                    Story includes violence, explicit language, or adult themes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={mature}
                  onChange={(e) => setMature(e.target.checked)}
                  className="w-4 h-4 accent-[#FF500A] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Inline Cover Cropper if requested */}
          {showCoverCropper && (
            <div className="pt-6 border-t border-[#E5E5E5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#121212]">
                Frame New Cover Artwork (2:3 Standard Ratio)
              </h3>
              <CoverCropper
                onCropComplete={(file, url) => {
                  setNewCoverFile(file);
                  setCoverPreviewUrl(url);
                }}
              />
            </div>
          )}
        </div>

        {/* Template Picker & Live Preview Card */}
        <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs">
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
              status,
              coverPreviewUrl,
              pageCount: book?.pageCount,
              pageOffsets: book?.pageOffsets,
              writerName: user?.name,
              writerUsername: user?.username,
              stats: book?.stats,
            }}
          />
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/w/books')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 px-6 shadow-md"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving Changes...' : 'Save Presentation Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default EditBookPage;
