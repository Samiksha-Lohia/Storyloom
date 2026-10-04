import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
  rating = 0,
  count,
  size = 'default', // 'sm' | 'default' | 'lg'
  showNumber = true,
  className = '',
}) {
  const normalizedRating = Math.max(0, Math.min(5, Number(rating) || 0));

  const starSizes = {
    sm: 'w-3 h-3',
    default: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    default: 'text-xs md:text-sm',
    lg: 'text-base font-bold',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-slate-700 select-none ${className}`}
      aria-label={`Rating: ${normalizedRating.toFixed(1)} out of 5 stars`}
    >
      <div className="flex items-center text-amber-400">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const filled = normalizedRating >= starIndex;
          const half = !filled && normalizedRating >= starIndex - 0.5;

          return (
            <Star
              key={starIndex}
              className={`${starSizes[size] || starSizes.default} ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : half
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-slate-200 fill-slate-100'
              }`}
            />
          );
        })}
      </div>

      {showNumber && (
        <span className={`font-semibold text-[#121212] ${textSizes[size] || textSizes.default}`}>
          {normalizedRating > 0 ? normalizedRating.toFixed(1) : 'New'}
        </span>
      )}

      {count !== undefined && count > 0 && (
        <span className="text-xs text-[#6B6B6B]">({count.toLocaleString()})</span>
      )}
    </div>
  );
}

export { StarRating };

