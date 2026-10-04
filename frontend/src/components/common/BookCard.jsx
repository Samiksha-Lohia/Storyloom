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
    'SceneCraft Author';

  const reads = book.stats?.reads ?? book.stats?.readCount ?? 0;
  const rating = book.stats?.ratingAvg ?? book.stats?.rating ?? 0;
  const coverPid = book.coverPublicId || book.coverImageId;

  return (
    <Link
      to={`/book/${bookId}`}
      className={`group flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF500A] focus-visible:ring-offset-4 rounded-xl ${className}`}
    >
      {/* 2:3 Cover with soft hover shadow */}
      <div className="relative overflow-hidden rounded-xl shadow-xs group-hover:shadow-md transition-shadow">
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
          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-stone-900/80 text-white font-bold text-xs flex items-center justify-center backdrop-blur-xs shadow-sm">
            #{rank}
          </span>
        )}

        {/* Mature 18+ badge if applicable */}
        {book.mature && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold bg-black/80 text-white rounded shadow-sm">
            18+
          </span>
        )}

        {/* Genre tag badge */}
        {book.genre && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-white/95 backdrop-blur-xs text-[#121212] rounded-full shadow-xs">
            {book.genre}
          </span>
        )}
      </div>

      {/* Book details */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="font-semibold text-xs sm:text-sm text-[#121212] line-clamp-2 leading-snug group-hover:text-[#FF500A] transition-colors">
          {book.title}
        </h3>

        <p className="text-[11px] text-[#6B6B6B] truncate">
          by <span className="font-medium text-slate-700">{authorName}</span>
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mt-0.5 text-[11px] text-[#6B6B6B]">
          <StarRating rating={rating} size="sm" />

          {reads > 0 && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Eye className="w-3 h-3 text-slate-400" />
              {formatReads(reads)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { BookCard };

