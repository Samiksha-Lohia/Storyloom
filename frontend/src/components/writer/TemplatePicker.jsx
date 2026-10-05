import React, { useState } from 'react';
import { Check, Smartphone, Monitor } from 'lucide-react';
import { TEMPLATE_OPTIONS, ACCENT_PRESETS } from '../../constants/templates';
import { BookPageData } from '../templates/BookPageData';

export function TemplatePicker({
  selectedTemplate,
  onSelectTemplate,
  selectedAccent,
  onSelectAccent,
  draftBook,
}) {
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const previewBook = {
    _id: 'preview-id',
    title: draftBook?.title || 'Manuscript Title',
    blurb:
      draftBook?.blurb ||
      'A serialized manuscript draft exploring character development and narrative progression.',
    genre: draftBook?.genre || 'Fantasy',
    tags: draftBook?.tags?.length ? draftBook.tags : ['fantasy', 'adventure'],
    template: selectedTemplate || 'classic',
    accent: selectedAccent || ACCENT_PRESETS[0].hex,
    coverUrl: draftBook?.coverPreviewUrl || draftBook?.coverUrl || null,
    coverPublicId: draftBook?.coverPublicId || null,
    status: draftBook?.status || 'draft',
    mature: draftBook?.mature || false,
    pageCount: draftBook?.pageCount || 24,
    pageOffsets: draftBook?.pageOffsets || Array.from({ length: 5 }, (_, i) => i * 1800),
    language: draftBook?.language || 'en',
    writerId: {
      name: draftBook?.writerName || 'Author Name',
      username: draftBook?.writerUsername || 'author',
      bio: 'Writer bio and description.',
    },
    stats: {
      reads: draftBook?.stats?.reads || 1400,
      ratingAvg: draftBook?.stats?.ratingAvg || 4.5,
      ratingCount: draftBook?.stats?.ratingCount || 18,
    },
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Controls: Template Selector & Accent Swatches ─────────── */}
      <div className="space-y-4">
        {/* Template Choice Cards */}
        <div>
          <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
            1. Select Presentation Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TEMPLATE_OPTIONS.map((tpl) => {
              const isSelected = selectedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tpl.id)}
                  className={`text-left p-4 rounded border cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent bg-paper text-ink font-bold'
                      : 'border-rule bg-paper text-ink hover:border-muted'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-ink">{tpl.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-rule text-muted">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-body leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-rule flex items-center justify-between text-[11px]">
                    <span className="text-muted">Best for: {tpl.bestFor}</span>
                    {isSelected && (
                      <span className="text-accent shrink-0">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Swatches */}
        <div>
          <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
            2. Choose Accent Palette
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {ACCENT_PRESETS.map((p) => {
              const isSelected = selectedAccent === p.hex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectAccent(p.hex)}
                  className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 text-left bg-paper ${
                    isSelected
                      ? 'border-ink text-ink font-bold'
                      : 'border-rule text-ink hover:border-muted'
                  }`}
                >
                  <span
                    style={{ backgroundColor: p.hex }}
                    className="w-5 h-5 rounded border border-rule flex items-center justify-center text-paper shrink-0"
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-ink truncate">{p.name}</p>
                    <p className="text-[10px] text-muted font-mono truncate">{p.hex}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Live Preview Pane ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rule pb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-ink">
              Live Story Page Preview
            </h3>
            <span className="text-xs text-muted">
              ({selectedTemplate.toUpperCase()} • {selectedAccent})
            </span>
          </div>

          {/* Viewport switch */}
          <div className="inline-flex rounded border border-rule bg-paper p-0.5">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile (375px)
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="bg-paper p-4 rounded border border-rule flex justify-center overflow-x-auto min-h-[400px]">
          <div
            className={`w-full bg-paper rounded border border-rule p-4 overflow-hidden ${
              previewDevice === 'mobile'
                ? 'max-w-[375px]'
                : 'max-w-5xl'
            }`}
          >
            <BookPageData
              book={previewBook}
              isPreview={true}
              forcedTemplate={selectedTemplate}
              forcedAccent={selectedAccent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplatePicker;
