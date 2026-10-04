import React, { useState } from 'react';
import { Check, Smartphone, Monitor, Sparkles } from 'lucide-react';
import { TEMPLATE_OPTIONS, ACCENT_PRESETS } from '../../constants/templates';
import { BookPageData } from '../templates/BookPageData';

export function TemplatePicker({
  selectedTemplate,
  onSelectTemplate,
  selectedAccent,
  onSelectAccent,
  draftBook,
}) {
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Prepare a synthesized preview book object merging draft form values
  const previewBook = {
    _id: 'preview-id',
    title: draftBook?.title || 'Echoes of the Obsidian Crown',
    blurb:
      draftBook?.blurb ||
      'In a realm fractured by ancient oaths, an archivist unearths a forbidden manuscript that could shatter the fragile peace between the human kingdoms and the fae courts.',
    genre: draftBook?.genre || 'Fantasy',
    tags: draftBook?.tags?.length ? draftBook.tags : ['fantasy', 'magic', 'adventure', 'royalty'],
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
      name: draftBook?.writerName || 'Elena Vance',
      username: draftBook?.writerUsername || 'elenavance',
      bio: 'Author of dark fantasy epics and speculative fiction.',
    },
    stats: {
      reads: draftBook?.stats?.reads || 14200,
      ratingAvg: draftBook?.stats?.ratingAvg || 4.8,
      ratingCount: draftBook?.stats?.ratingCount || 184,
    },
  };

  return (
    <div className="space-y-8">
      {/* ─── Top Controls: Template Selector & Accent Swatches ─────────── */}
      <div className="space-y-6">
        {/* Template Choice Cards */}
        <div>
          <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-2">
            1. Select Presentation Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATE_OPTIONS.map((tpl) => {
              const isSelected = selectedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tpl.id)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#FF500A] bg-[#FFF0E8]/20 shadow-md ring-2 ring-[#FF500A]/20'
                      : 'border-[#E5E5E5] bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base text-[#121212]">{tpl.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5]/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Best for: {tpl.bestFor}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#FF500A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
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
          <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-2">
            2. Choose Accent Palette (Accessible WCAG 2.1 Contrast)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACCENT_PRESETS.map((p) => {
              const isSelected = selectedAccent === p.hex || selectedAccent === p.legacyHex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectAccent(p.hex)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                    isSelected
                      ? 'border-[#121212] bg-white shadow-md ring-2 ring-slate-900/10'
                      : 'border-[#E5E5E5] bg-white hover:border-slate-300'
                  }`}
                >
                  <span
                    style={{ backgroundColor: p.hex }}
                    className="w-7 h-7 rounded-full shadow-xs flex items-center justify-center text-white shrink-0 border border-black/10"
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#121212] truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{p.hex}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Live Preview Pane ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF500A]" />
            <h3 className="font-serif font-bold text-sm text-[#121212]">
              Live Story Page Preview
            </h3>
            <span className="text-xs text-slate-400">
              ({selectedTemplate.toUpperCase()} • {selectedAccent})
            </span>
          </div>

          {/* Viewport switch */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-white shadow-xs text-[#121212]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-white shadow-xs text-[#121212]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile (375px)
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200 flex justify-center overflow-x-auto min-h-[500px]">
          <div
            className={`transition-all duration-300 w-full bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-6 overflow-hidden ${
              previewDevice === 'mobile'
                ? 'max-w-[375px] ring-8 ring-slate-800/10'
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
