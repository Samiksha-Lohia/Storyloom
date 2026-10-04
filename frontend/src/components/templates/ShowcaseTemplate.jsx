import React from 'react';
import { CoverImage } from '../common/CoverImage';
import { Eye, BookOpen, Star, Clock } from 'lucide-react';

export function ShowcaseTemplate({
  book,
  accent,
  coverUrl,
  authorName,
  authorUsername,
  authorAvatar,
  authorBio,
  formatNumber,
  readingTimeText,
  updatedDate,
  displayDesc,
  isLongDesc,
  descExpanded,
  setDescExpanded,
  renderActionButtons,
  renderTabsSection,
  renderRelatedBooks,
  renderMatureWarning,
  _isPreview,
}) {
  return (
    <div
      className="book-template-showcase space-y-12 pb-16 transition-colors"
      style={{ '--accent': accent }}
    >
      {/* 18+ Warning */}
      {renderMatureWarning()}

      {/* ─── Full-width Hero with Blurred & Darkened Cover Backdrop ───────── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121212] text-white p-6 sm:p-10 lg:p-14 shadow-xl border border-stone-800">
        {/* CSS Blurred & Darkened Cover Backdrop */}
        {coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-30 brightness-40 pointer-events-none transform -translate-y-4"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/85 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* Centered Cover */}
          <div className="w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10 border border-white/20 bg-stone-900 shrink-0 transform transition-transform hover:scale-102">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={book?.title || 'Cover'}
                className="w-full h-full object-cover"
              />
            ) : (
              <CoverImage
                publicId={book?.coverPublicId}
                title={book?.title}
                genre={book?.genre}
                preset="large"
                className="w-full h-full"
              />
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              style={{
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
              }}
              className="text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
            >
              {book?.genre || 'Showcase'}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/15">
              {book?.status || 'draft'}
            </span>
            {book?.mature && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                18+ Mature
              </span>
            )}
          </div>

          {/* Title & Author */}
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-md">
              {book?.title || 'Untitled Story'}
            </h1>
            <p className="text-sm sm:text-base text-stone-300">
              by <span className="font-semibold text-white">{authorName}</span>
              {authorUsername && <span className="text-stone-400 text-xs ml-1.5">(@{authorUsername})</span>}
            </p>
          </div>

          {/* Stat Chips in Hero */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs">
              <Eye className="w-3.5 h-3.5 text-stone-300" />
              <span className="font-bold">{formatNumber(book?.stats?.reads || 0)}</span>
              <span className="text-stone-300">Reads</span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-bold">
                {book?.stats?.ratingAvg ? book.stats.ratingAvg.toFixed(1) : 'New'}
              </span>
              <span className="text-stone-300">({formatNumber(book?.stats?.ratingCount || 0)})</span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-stone-300" />
              <span className="font-bold">{book?.pageCount || 1}</span>
              <span className="text-stone-300">Pages</span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-stone-300" />
              <span className="font-bold">{readingTimeText}</span>
            </div>
          </div>

          {/* Action Buttons in Hero */}
          <div className="pt-2">
            {renderActionButtons('justify-center')}
          </div>
        </div>
      </section>

      {/* ─── Two-Column Section: Wide Synopsis + Side Author Card ─────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Wide Synopsis (Left / Main) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
              Story Overview
            </h2>
            <p className="text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif">
              {displayDesc}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                style={{ color: 'var(--accent)' }}
                className="mt-3 text-sm font-bold hover:underline cursor-pointer"
              >
                {descExpanded ? 'Show less' : 'Read more...'}
              </button>
            )}
          </div>

          {/* Tags */}
          {book?.tags && book.tags.length > 0 && (
            <div className="pt-4 border-t border-[#E5E5E5]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-2.5">
                Story Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                    }}
                    className="text-xs bg-[#F7F7F7] text-slate-700 px-3 py-1 rounded-full font-medium border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-[#64748B] pt-2">
            Updated {updatedDate} • Language: {book?.language?.toUpperCase() || 'EN'}
          </div>
        </div>

        {/* Author Card (Side Column) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 shadow-xs space-y-4">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
              About the Author
            </span>

            <div className="flex items-center gap-3.5">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#E5E5E5]"
                />
              ) : (
                <div
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                  className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-xs"
                >
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <p className="font-serif font-bold text-base text-[#121212]">{authorName}</p>
                {authorUsername && (
                  <p className="text-xs text-[#64748B]">@{authorUsername}</p>
                )}
                <span
                  style={{ color: 'var(--accent)' }}
                  className="text-[11px] font-bold uppercase tracking-wider mt-0.5 inline-block"
                >
                  Verified Writer
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
              {authorBio}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      {renderTabsSection()}

      {/* Related Books */}
      {renderRelatedBooks()}
    </div>
  );
}

export default ShowcaseTemplate;
