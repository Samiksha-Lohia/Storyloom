import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
  rating = 0,
  count,
  showNumber = true,
  size = 'md',
  className = '',
}) {
  const normalizedRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const starSize = size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-ink select-none ${className}`}
      aria-label={`Rating: ${normalizedRating.toFixed(1)} out of 5 stars`}
    >
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const filled = normalizedRating >= starIndex;

          return (
            <Star
              key={starIndex}
              className={`${starSize} ${
                filled
                  ? 'fill-ink text-ink'
                  : 'text-rule fill-transparent'
              }`}
            />
          );
        })}
      </div>

      {showNumber && (
        <span className={`${textSize} font-bold text-ink`}>
          {normalizedRating > 0 ? normalizedRating.toFixed(1) : 'New'}
        </span>
      )}

      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted">({count.toLocaleString()})</span>
      )}
    </div>
  );
}

export { StarRating };

