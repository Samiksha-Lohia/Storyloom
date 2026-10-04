import React from 'react';
import { CoverImage } from '../common/CoverImage';
import { Eye, BookOpen, Star, Clock } from 'lucide-react';

export function NotebookTemplate({
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
  _isPreview,
}) {
  // Sticker rotations for tags
  const rotations = ['rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-[-0.8deg]', 'rotate-[2deg]', 'rotate-[-2deg]'];

  return (
    <div
      className="book-template-notebook space-y-10 pb-16 transition-colors"
      style={{ '--accent': accent }}
    >
      {/* 18+ Warning */}
      {renderMatureWarning()}

      {/* ─── Notebook Paper Card with Ruled Lines & Pinned Cover ─────────── */}
      <section className="relative rounded-3xl border border-stone-300 bg-[#FDFBF7] p-6 sm:p-10 shadow-md overflow-hidden">
        {/* Notebook Spiral / Left Margin Line */}
        <div className="hidden sm:block absolute left-8 top-0 bottom-0 w-0.5 bg-rose-300/80 z-0 pointer-events-none" />

        <div className="relative z-10 sm:pl-8 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Pinned Cover Column */}
          <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center">
            <div className="relative group">
              {/* Pushpin at top center */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-md ring-1 ring-rose-800" />
                <div className="w-0.5 h-1.5 bg-stone-400" />
              </div>

              {/* Pinned Book Cover with physical tilt */}
              <div className="w-48 sm:w-56 md:w-60 aspect-[2/3] rounded-xl overflow-hidden shadow-xl border-2 border-stone-200 bg-white transform -rotate-1.5 transition-transform group-hover:rotate-0">
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
            </div>

            {/* Handwritten Author Note */}
            <div className="mt-5 text-center">
              <span className="text-xs text-stone-500 font-serif italic block">written by</span>
              <p
                style={{ fontFamily: 'var(--font-handwriting, Caveat, cursive)' }}
                className="text-2xl sm:text-3xl text-stone-800 font-bold tracking-wide mt-0.5"
              >
                {authorName}
              </p>
              {authorUsername && (
                <span className="text-xs text-stone-400 block font-mono">@{authorUsername}</span>
              )}
            </div>
          </div>

          {/* Notebook Paper Body */}
          <div className="md:col-span-8 lg:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Genre sticker & status */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#FFFFFF',
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-xs transform -rotate-1"
                >
                  {book?.genre || 'Memoir / Literary'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-stone-200/80 text-stone-700 border border-stone-300 transform rotate-1">
                  {book?.status || 'draft'}
                </span>
                {book?.mature && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    18+ Mature
                  </span>
                )}
              </div>

              {/* Handwritten Title */}
              <h1
                style={{ fontFamily: 'var(--font-handwriting, Caveat, cursive)' }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-tight leading-tight"
              >
                {book?.title || 'Untitled Manuscript'}
              </h1>

              {/* Stats as Notebook stamps */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 border-y border-dashed border-stone-300 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Eye style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  <span className="font-bold text-stone-800">{formatNumber(book?.stats?.reads || 0)}</span>
                  <span className="text-stone-500">reads</span>
                </div>

                <div className="flex items-center gap-2">
                  <Star style={{ color: 'var(--accent)' }} className="w-4 h-4 fill-current" />
                  <span className="font-bold text-stone-800">
                    {book?.stats?.ratingAvg ? book.stats.ratingAvg.toFixed(1) : 'New'}
                  </span>
                  <span className="text-stone-500">({formatNumber(book?.stats?.ratingCount || 0)})</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  <span className="font-bold text-stone-800">{book?.pageCount || 1}</span>
                  <span className="text-stone-500">pages</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock style={{ color: 'var(--accent)' }} className="w-4 h-4" />
                  <span className="font-bold text-stone-800">{readingTimeText}</span>
                </div>
              </div>

              {/* Ruled Paper Synopsis Section */}
              <div className="relative pt-2">
                <h2
                  style={{ fontFamily: 'var(--font-handwriting, Caveat, cursive)' }}
                  className="text-2xl font-bold text-stone-800 mb-2"
                >
                  Notes & Synopsis
                </h2>
                {/* Clean, readable body font on subtle ruled lines */}
                <div
                  className="text-stone-800 text-sm sm:text-base leading-8 whitespace-pre-line font-serif rounded-xl p-4 bg-white/70 border border-stone-200/80"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E5E7EB 31px, #E5E7EB 32px)',
                    backgroundAttachment: 'local',
                  }}
                >
                  {displayDesc}
                </div>
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

              {/* Tags as Sticker Chips */}
              {book?.tags && book.tags.length > 0 && (
                <div className="pt-2">
                  <span
                    style={{ fontFamily: 'var(--font-handwriting, Caveat, cursive)' }}
                    className="text-xl font-bold text-stone-700 block mb-2"
                  >
                    Stickers & Tags
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {book.tags.map((tag, i) => {
                      const rot = rotations[i % rotations.length];
                      return (
                        <span
                          key={tag}
                          className={`text-xs px-3 py-1.5 rounded-md font-semibold bg-white border border-stone-300 text-stone-800 shadow-[2px_3px_6px_rgba(0,0,0,0.06)] transform ${rot} transition-transform hover:scale-105`}
                        >
                          #{tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4">
                {renderActionButtons()}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-stone-200 text-xs text-stone-500 flex justify-between">
              <span>Dated: {updatedDate}</span>
              <span>Lang: {book?.language?.toUpperCase() || 'EN'}</span>
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

export default NotebookTemplate;
