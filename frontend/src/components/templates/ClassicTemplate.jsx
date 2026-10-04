import React from 'react';
import { CoverImage } from '../common/CoverImage';
import { StarRating } from '../common/StarRating';
import { Chip } from '../common/Chip';
import { Eye, BookOpen, Star, Clock } from 'lucide-react';

export function ClassicTemplate({
  book,
  accent,
  coverUrl,
  authorName,
  authorUsername,
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
  isPreview,
}) {
  return (
    <div
      className="book-template-classic space-y-10 pb-16 transition-colors"
      style={{ '--accent': accent }}
    >
      {/* 18+ Warning */}
      {renderMatureWarning()}

      {/* Main Classic Header (Cover Left, Details Right) */}
      <section className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
            <div className="w-48 sm:w-56 md:w-full max-w-[240px] aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-[#E5E5E5] bg-[#F7F7F7] flex items-center justify-center">
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

            {/* Author Credit */}
            <div className="mt-4 text-center">
              <span className="text-xs text-[#64748B] block">Written by</span>
              <span className="font-serif font-bold text-[#121212] text-sm">
                {authorName}
              </span>
              {authorUsername && (
                <span className="text-[11px] text-slate-400 block">@{authorUsername}</span>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: 'var(--accent)',
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full"
                >
                  {book?.genre || 'General Fiction'}
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    book?.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {book?.status || 'draft'}
                </span>
                {book?.mature && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    18+
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#121212] tracking-tight leading-tight">
                {book?.title || 'Untitled Story'}
              </h1>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-[#E5E5E5] text-sm">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <Eye style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#121212] block leading-tight">
                      {formatNumber(book?.stats?.reads || 0)}
                    </span>
                    <span className="text-[11px] text-[#64748B]">Reads</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <Star style={{ color: 'var(--accent)' }} className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <span className="font-bold text-[#121212] block leading-tight">
                      {book?.stats?.ratingAvg ? book.stats.ratingAvg.toFixed(1) : 'New'}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {formatNumber(book?.stats?.ratingCount || 0)} reviews
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <BookOpen style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#121212] block leading-tight">
                      {book?.pageCount || 1}
                    </span>
                    <span className="text-[11px] text-[#64748B]">Pages</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <Clock style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#121212] block leading-tight">
                      {readingTimeText}
                    </span>
                    <span className="text-[11px] text-[#64748B]">Est. Time</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {renderActionButtons()}
              </div>

              {/* Tags */}
              {book?.tags && book.tags.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-[#F7F7F7] text-slate-700 px-3 py-1 rounded-full font-medium border border-[#E5E5E5]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              <div className="pt-2">
                <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                  Synopsis
                </h2>
                <p className="text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-serif">
                  {displayDesc}
                </p>
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    style={{ color: 'var(--accent)' }}
                    className="mt-2 text-xs font-bold hover:underline cursor-pointer"
                  >
                    {descExpanded ? 'Show less' : 'Read more...'}
                  </button>
                )}
              </div>
            </div>

            {/* Footer metadata */}
            <div className="pt-4 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between text-xs text-[#64748B] gap-2">
              <span>Updated on {updatedDate}</span>
              <span>Language: {book?.language?.toUpperCase() || 'EN'}</span>
            </div>
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

export default ClassicTemplate;
