import React from 'react';
import { Link } from 'react-router-dom';
import CoverImage from './CoverImage';
import StarRating from './StarRating';
import { Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function formatReads(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function BookCard({ book, rank, className = '' }) {
  const { isAuthenticated } = useAuth();
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

  const targetPath = `/book/${bookId}`;
  const linkTo = isAuthenticated
    ? targetPath
    : `/login?redirectTo=${encodeURIComponent(targetPath)}`;
  const linkState = isAuthenticated
    ? undefined
    : { from: targetPath, redirectTo: targetPath };

  return (
    <Link
      to={linkTo}
      state={linkState}
      className={`group flex flex-col w-full h-full select-none rounded border border-rule bg-paper p-2.5 text-ink transition-colors hover:border-ink/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      {/* Fixed 2:3 Cover with strict aspect ratio container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-paper shrink-0">
        <CoverImage
          publicId={coverPid}
          url={book.coverUrl}
          title={book.title}
          accent={book.accent}
          genre={book.genre}
          preset="thumb"
          className="w-full h-full object-cover"
        />

        {/* Rank badge if present */}
        {rank !== undefined && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded border border-rule bg-paper/95 backdrop-blur-xs text-ink font-bold text-[10px] shadow-xs">
            #{rank}
          </span>
        )}

        {/* Mature 18+ badge if applicable */}
        {book.mature && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-ink text-paper rounded shadow-xs">
            18+
          </span>
        )}

        {/* Genre tag badge slot (fixed height slot) */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center h-5 pointer-events-none">
          {book.genre ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-paper/95 backdrop-blur-xs text-ink rounded border border-rule shadow-xs truncate max-w-full">
              {book.genre}
            </span>
          ) : null}
        </div>
      </div>

      {/* Book details with fixed slot heights for strict alignment */}
      <div className="flex flex-col mt-2.5 shrink-0">
        {/* Title slot: exactly 2 lines height */}
        <div className="h-10 flex items-start overflow-hidden">
          <h3 className="font-bold text-xs sm:text-sm text-ink line-clamp-2 leading-snug break-words group-hover:text-accent group-hover:underline">
            {book.title}
          </h3>
        </div>

        {/* Author slot: exactly 1 line height, strictly aligned across all cards */}
        <div className="h-4 flex items-center overflow-hidden mt-1">
          <p className="text-[11px] text-muted truncate">
            by <span className="font-bold text-ink">{authorName}</span>
          </p>
        </div>
      </div>

      {/* Stats slot: fixed bottom alignment */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-rule/50 text-[11px] text-muted h-7 gap-1 min-w-0 shrink-0">
        <StarRating rating={rating} size="sm" className="shrink-0" />

        {reads > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium shrink-0">
            <Eye className="w-3.5 h-3.5 text-muted" />
            {formatReads(reads)}
          </span>
        ) : (
          <span className="text-[10px] text-muted/60 shrink-0">New story</span>
        )}
      </div>
    </Link>
  );
}

export { BookCard };


