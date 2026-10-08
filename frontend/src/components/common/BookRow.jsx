import React from 'react';
import BookCard from './BookCard';
import Carousel from './Carousel';
import { BookCardSkeleton } from './Skeleton';

export default function BookRow({
  title,
  subtitle,
  books = [],
  loading = false,
  mode = 'row',
  showRank = false,
  emptyMessage = 'No items yet.',
  actions = null,
  className = '',
}) {
  const showExternalHeader = mode === 'grid' || loading || books.length === 0;

  return (
    <section className={`w-full ${className}`}>
      {showExternalHeader && (title || subtitle || actions) && (
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            {title && <h2 className="font-bold text-xl text-ink font-body">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}

      {loading ? (
        mode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="w-full h-[385px] sm:h-[405px]">
                <BookCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="w-40 sm:w-44 md:w-48 shrink-0 h-[385px] sm:h-[405px]">
                <BookCardSkeleton />
              </div>
            ))}
          </div>
        )
      ) : books.length === 0 ? (
        <div className="bg-paper border border-rule rounded p-8 text-center">
          <p className="text-xs text-muted">{emptyMessage}</p>
        </div>
      ) : mode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-stretch">
          {books.map((book, idx) => (
            <div key={book.id || book._id} className="w-full h-[385px] sm:h-[405px] flex">
              <BookCard book={book} rank={showRank ? idx + 1 : undefined} />
            </div>
          ))}
        </div>
      ) : (
        <Carousel
          title={title}
          subtitle={subtitle}
          actions={actions}
          ariaLabel={title || 'Books row'}
        >
          {books.map((book, idx) => (
            <div
              key={book.id || book._id}
              className="w-40 sm:w-44 md:w-48 shrink-0 h-[385px] sm:h-[405px] flex"
            >
              <BookCard book={book} rank={showRank ? idx + 1 : undefined} />
            </div>
          ))}
        </Carousel>
      )}
    </section>
  );
}

export { BookRow };
