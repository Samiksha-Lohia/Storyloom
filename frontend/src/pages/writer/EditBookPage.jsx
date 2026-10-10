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
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import CoverCropper from '../../components/common/CoverCropper';
import { GENRES } from '../../constants/app';

export function EditBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [book, setBook] = useState(null);
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [genre, setGenre] = useState('General');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [language, setLanguage] = useState('en');
  const [mature, setMature] = useState(false);
  const [template, setTemplate] = useState('classic');
  const [status, setStatus] = useState('draft');

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
        const formData = new FormData();
        formData.append('cover', newCoverFile);
        formData.append('title', title.trim());
        formData.append('blurb', blurb.trim());
        formData.append('genre', genre);
        formData.append('language', language);
        formData.append('mature', String(mature));
        formData.append('template', template);
        formData.append('status', status);
        tags.forEach((tag) => formData.append('tags[]', tag));

        updated = await api.books.update(id, formData, true);
      } else {
        const payload = {
          title: title.trim(),
          blurb: blurb.trim(),
          genre,
          tags,
          language,
          mature,
          template,
          status,
        };
        updated = await api.books.update(id, payload, false);
      }

      setBook(updated);
      if (updated.coverUrl) setCoverPreviewUrl(updated.coverUrl);
      setNewCoverFile(null);
      setShowCoverCropper(false);
      setSuccessMsg('Story details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update book.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="p-12 text-center text-xs text-muted border border-rule rounded bg-paper">
          Loading…
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 border border-rule rounded text-danger flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-ink">Story Not Found</h2>
        <p className="text-xs text-muted">{error}</p>
        <Link to="/w/books">
          <Button variant="secondary" size="sm">
            ← Return to My Books
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 pb-20 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/w/books')}
            className="p-2 rounded text-ink hover:border-ink border border-rule cursor-pointer"
            aria-label="Back to My Books"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-rule text-muted">
              Story Settings
            </span>
            <h1 className="text-2xl sm:text-3xl font-normal text-ink mt-1">
              Edit Story & Presentation
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/book/${id}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5" />
              Public Page
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-paper border border-success text-success rounded p-4 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <p className="font-bold flex-1">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-paper border border-danger text-danger rounded p-4 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <p className="font-bold flex-1">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-10">
        <div className="bg-paper rounded border border-rule p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-ink border-b border-rule pb-3">
            Cover Artwork & Story Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 flex flex-col items-center space-y-4">
              <div className="w-44 aspect-[2/3] rounded overflow-hidden border border-rule bg-paper">
                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt={title || 'Cover'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted p-4 text-center">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs">No cover image</span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCoverCropper(!showCoverCropper)}
                className="text-xs"
              >
                {showCoverCropper ? 'Cancel Cover Crop' : 'Replace Cover Image'}
              </Button>

              {newCoverFile && (
                <span className="text-[11px] font-bold text-success">
                  ✓ New cover ready to save
                </span>
              )}
            </div>

            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
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
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Synopsis / Blurb
                </label>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="Provide a compelling synopsis..."
                  rows={4}
                  className="w-full px-3 py-2 rounded border border-rule text-xs text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-rule text-xs font-bold text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink cursor-pointer"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-rule text-xs font-bold text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-rule text-xs font-bold text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Tags (up to 10)
                </label>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded border border-rule bg-paper focus-within:ring-1 focus-within:ring-ink">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-paper text-ink rounded text-xs font-bold flex items-center gap-1.5 border border-rule"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-muted hover:text-danger font-bold cursor-pointer"
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
                    className="flex-1 min-w-[140px] px-2 py-1 text-xs focus:outline-hidden bg-transparent text-ink placeholder-muted"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink block">Mature Content (18+)</span>
                  <span className="text-xs text-muted block">
                    Story includes violence, explicit language, or adult themes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={mature}
                  onChange={(e) => setMature(e.target.checked)}
                  className="w-4 h-4 accent-ink cursor-pointer"
                />
              </div>
            </div>
          </div>

          {showCoverCropper && (
            <div className="pt-6 border-t border-rule space-y-3">
              <h3 className="font-bold text-xs text-ink">
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/w/books')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 px-6"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4" />
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
