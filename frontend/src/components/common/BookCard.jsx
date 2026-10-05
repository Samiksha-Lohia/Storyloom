import React from 'react';
import { Link } from 'react-router-dom';
import CoverImage from './CoverImage';
import StarRating from './StarRating';
import { Eye } from 'lucide-react';

function formatReads(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function BookCard({ book, rank, className = '' }) {
  if (!book) return null;

  const bookId = book._id || book.id;
  const authorName =
    book.writerId?.name ||
    book.authorId?.name ||
    book.author?.name ||
    book.author?.username ||
    'Storyloom Author';

  const reads = book.stats?.reads ?? book.stats?.readCount ?? 0;
  const rating = book.stats?.ratingAvg ?? book.stats?.rating ?? 0;
  const coverPid = book.coverPublicId || book.coverImageId;

  return (
    <Link
      to={`/book/${bookId}`}
      className={`group flex flex-col gap-2 select-none rounded border border-rule bg-paper p-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      {/* 2:3 Cover */}
      <div className="relative overflow-hidden rounded">
        <CoverImage
          publicId={coverPid}
          url={book.coverUrl}
          title={book.title}
          accent={book.accent}
          genre={book.genre}
          preset="thumb"
        />

        {/* Rank badge if present */}
        {rank !== undefined && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded border border-rule bg-paper text-ink font-bold text-[10px]">
            #{rank}
          </span>
        )}

        {/* Mature 18+ badge if applicable */}
        {book.mature && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold bg-ink text-paper rounded">
            18+
          </span>
        )}

        {/* Genre tag badge */}
        {book.genre && (
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-bold bg-paper text-ink rounded border border-rule">
            {book.genre}
          </span>
        )}
      </div>

      {/* Book details */}
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-xs sm:text-sm text-ink line-clamp-2 leading-snug group-hover:text-accent group-hover:underline">
          {book.title}
        </h3>

        <p className="text-[11px] text-muted truncate">
          by <span className="font-bold text-ink">{authorName}</span>
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mt-0.5 text-[11px] text-muted">
          <StarRating rating={rating} size="sm" />

          {reads > 0 && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Eye className="w-3.5 h-3.5 text-muted" />
              {formatReads(reads)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { BookCard };


