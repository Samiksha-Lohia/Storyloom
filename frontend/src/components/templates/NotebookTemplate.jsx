import React from 'react';
import { CoverImage } from '../common/CoverImage';
import { Eye, BookOpen, Star, Clock } from 'lucide-react';

export function NotebookTemplate({
  book,
  accent: _accent,
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
  return (
    <div className="book-template-notebook space-y-8 pb-16">
      {renderMatureWarning()}

      <section className="bg-paper rounded border border-rule p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="w-48 sm:w-56 aspect-[2/3] rounded border border-rule overflow-hidden bg-paper">
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

            <div className="mt-4 text-center">
              <span className="text-xs text-muted block">written by</span>
              <p className="text-base text-ink font-bold mt-0.5">
                {authorName}
              </p>
              {authorUsername && (
                <span className="text-xs text-muted block">@{authorUsername}</span>
              )}
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-rule text-ink uppercase tracking-wider">
                  {book?.genre || 'Memoir / Literary'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded border border-rule text-muted uppercase tracking-wider">
                  {book?.status || 'draft'}
                </span>
                {book?.mature && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-danger text-danger uppercase tracking-wider">
                    18+ Mature
                  </span>
                )}
              </div>

              <h1 className="font-calligraphy text-4xl sm:text-5xl lg:text-6xl font-normal text-ink leading-tight">
                {book?.title || 'Untitled Manuscript'}
              </h1>

              <div className="flex flex-wrap items-center gap-4 py-3 border-y border-rule text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-muted" />
                  <span className="font-bold text-ink">{formatNumber(book?.stats?.reads || 0)}</span>
                  <span>reads</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-muted" />
                  <span className="font-bold text-ink">
                    {book?.stats?.ratingAvg ? book.stats.ratingAvg.toFixed(1) : 'New'}
                  </span>
                  <span>({formatNumber(book?.stats?.ratingCount || 0)})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-muted" />
                  <span className="font-bold text-ink">{book?.pageCount || 1}</span>
                  <span>pages</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted" />
                  <span className="font-bold text-ink">{readingTimeText}</span>
                </div>
              </div>

              <div className="pt-2">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Notes &amp; Synopsis
                </h2>
                <div className="text-ink text-sm sm:text-base leading-relaxed whitespace-pre-line font-body">
                  {displayDesc}
                </div>
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 text-xs font-bold text-accent hover:underline cursor-pointer"
                  >
                    {descExpanded ? 'Show less' : 'Read more...'}
                  </button>
                )}
              </div>

              {book?.tags && book.tags.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-1 rounded border border-rule text-ink bg-paper font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                {renderActionButtons()}
              </div>
            </div>

            <div className="pt-4 border-t border-rule text-xs text-muted flex justify-between">
              <span>Dated: {updatedDate}</span>
              <span>Lang: {book?.language?.toUpperCase() || 'EN'}</span>
            </div>
          </div>
        </div>
      </section>

      {renderTabsSection()}

      {renderRelatedBooks()}
    </div>
  );
}

export default NotebookTemplate;
