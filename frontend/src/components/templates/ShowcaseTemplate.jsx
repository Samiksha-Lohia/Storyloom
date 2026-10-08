import React from 'react';
import { CoverImage } from '../common/CoverImage';
import { Eye, BookOpen, Star, Clock } from 'lucide-react';

export function ShowcaseTemplate({
  book,
  accent: _accent,
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
    <div className="book-template-showcase space-y-8 pb-16">
      {renderMatureWarning()}

      <section className="bg-paper border border-rule rounded p-6 sm:p-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          <div className="w-48 sm:w-56 aspect-[2/3] rounded border border-rule overflow-hidden bg-paper shrink-0">
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

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-rule text-ink uppercase tracking-wider">
              {book?.genre || 'Showcase'}
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

          <div className="space-y-2">
            <h1 className="font-calligraphy text-4xl sm:text-5xl lg:text-6xl font-normal text-ink leading-tight">
              {book?.title || 'Untitled Story'}
            </h1>
            <p className="text-sm text-muted">
              by <span className="font-bold text-ink">{authorName}</span>
              {authorUsername && <span className="text-muted text-xs ml-1.5">(@{authorUsername})</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted border-y border-rule py-3 w-full">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-muted" />
              <span className="font-bold text-ink">{formatNumber(book?.stats?.reads || 0)}</span>
              <span>Reads</span>
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
              <span>Pages</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted" />
              <span className="font-bold text-ink">{readingTimeText}</span>
            </div>
          </div>

          <div className="pt-2">
            {renderActionButtons('justify-center')}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-paper rounded border border-rule p-6 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
              Story Overview
            </h2>
            <p className="text-ink text-base leading-relaxed whitespace-pre-line font-body">
              {displayDesc}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-3 text-sm font-bold text-accent hover:underline cursor-pointer"
              >
                {descExpanded ? 'Show less' : 'Read more...'}
              </button>
            )}
          </div>

          {book?.tags && book.tags.length > 0 && (
            <div className="pt-4 border-t border-rule">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2.5">
                Story Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-paper text-ink px-2.5 py-1 rounded border border-rule font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted pt-2">
            Updated {updatedDate} • Language: {book?.language?.toUpperCase() || 'EN'}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-paper rounded border border-rule p-6 space-y-4">
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">
              About the Author
            </span>

            <div className="flex items-center gap-3.5">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-12 h-12 rounded border border-rule object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded border border-rule bg-paper text-ink flex items-center justify-center font-bold text-lg shrink-0">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <p className="font-bold text-base text-ink">{authorName}</p>
                {authorUsername && (
                  <p className="text-xs text-muted">@{authorUsername}</p>
                )}
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider mt-0.5 inline-block">
                  Verified Writer
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted leading-relaxed font-body">
              {authorBio}
            </p>
          </div>
        </div>
      </section>

      {renderTabsSection()}

      {renderRelatedBooks()}
    </div>
  );
}

export default ShowcaseTemplate;
