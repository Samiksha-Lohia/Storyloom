import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StarWishlistButton({
  bookId,
  initialWishlisted = false,
  inTalks = false,
  size = 'md', // 'sm', 'md', 'lg'
  showLabel = false,
  onToggle = null,
  className = '',
}) {
  const { role, status } = useAuth();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  // Only approved publishers can wishlist books
  const isApprovedPublisher = role === 'publisher' && status === 'active';

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isApprovedPublisher) {
      return;
    }

    const nextState = !wishlisted;
    setWishlisted(nextState);
    setLoading(true);

    try {
      if (nextState) {
        await api.wishlist.add(bookId);
      } else {
        await api.wishlist.remove(bookId);
      }
      if (onToggle) onToggle(nextState);
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      // Revert on error
      setWishlisted(!nextState);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'px-4 py-2.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* "In talks" indicator ready for Phase 9 */}
      {inTalks && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
          <MessageSquare className="w-3 h-3" />
          In talks
        </span>
      )}

      {isApprovedPublisher && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          title={wishlisted ? 'Remove from publisher wishlist' : 'Add to private publisher wishlist'}
          className={`flex items-center rounded-xl transition-all duration-200 border cursor-pointer ${sizeClasses[size]} ${
            wishlisted
              ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-2xs hover:bg-amber-100'
              : 'bg-white/90 border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <Star
            className={`${iconSizes[size]} transition-transform active:scale-125 ${
              wishlisted ? 'fill-amber-400 text-amber-500' : ''
            }`}
          />
          {showLabel && (
            <span className="font-semibold text-xs ml-1.5">
              {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
