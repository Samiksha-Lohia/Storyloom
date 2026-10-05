import React from 'react';
import { CoverImage } from '../common/CoverImage';
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
}) {
  return (
    <div
      className="book-template-classic space-y-8 pb-16 font-body text-ink"
      style={{ '--accent': accent }}
    >
      {/* 18+ Warning */}
      {renderMatureWarning()}

      {/* Main Classic Header (Cover Left, Details Right) */}
      <section className="bg-paper rounded border border-rule p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
            <div className="w-48 sm:w-56 md:w-full max-w-[240px] aspect-[2/3] rounded overflow-hidden border border-rule bg-paper flex items-center justify-center">
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
            <div className="mt-3 text-center">
              <span className="text-xs text-muted block">Written by</span>
              <span className="font-bold text-ink text-sm">
                {authorName}
              </span>
              {authorUsername && (
                <span className="text-[11px] text-muted block">@{authorUsername}</span>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Category & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded border border-rule text-ink bg-paper">
                  {book?.genre || 'General Fiction'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-rule text-muted bg-paper">
                  {book?.status || 'draft'}
                </span>
                {book?.mature && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink text-paper">
                    18+
                  </span>
                )}
              </div>

              {/* Title: Petit Formal Script >= 28px, normal letter spacing, never bold */}
              <h1 className="font-calligraphy text-3xl sm:text-4xl lg:text-5xl font-normal text-ink leading-tight">
                {book?.title || 'Untitled Story'}
              </h1>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-rule text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-ink shrink-0" />
                  <div>
                    <span className="font-bold text-ink block leading-tight">
                      {formatNumber(book?.stats?.reads || 0)}
                    </span>
                    <span className="text-[11px] text-muted">Reads</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-ink shrink-0" />
                  <div>
                    <span className="font-bold text-ink block leading-tight">
                      {book?.stats?.ratingAvg ? book.stats.ratingAvg.toFixed(1) : 'New'}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatNumber(book?.stats?.ratingCount || 0)} reviews
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ink shrink-0" />
                  <div>
                    <span className="font-bold text-ink block leading-tight">
                      {book?.pageCount || 1}
                    </span>
                    <span className="text-[11px] text-muted">Pages</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-ink shrink-0" />
                  <div>
                    <span className="font-bold text-ink block leading-tight">
                      {readingTimeText}
                    </span>
                    <span className="text-[11px] text-muted">Est. Time</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                {renderActionButtons()}
              </div>

              {/* Tags */}
              {book?.tags && book.tags.length > 0 && (
                <div className="pt-1">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-paper text-ink px-2 py-0.5 rounded font-bold border border-rule"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              <div className="pt-1">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Synopsis
                </h2>
                <p className="text-ink text-sm leading-relaxed whitespace-pre-line">
                  {displayDesc}
                </p>
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-1 text-xs font-bold text-accent hover:underline cursor-pointer"
                  >
                    {descExpanded ? 'Show less' : 'Read more...'}
                  </button>
                )}
              </div>
            </div>

            {/* Footer metadata */}
            <div className="pt-3 border-t border-rule flex flex-wrap items-center justify-between text-xs text-muted gap-2">
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

