import React, { useState, useEffect } from 'react';
import { Bookmark, MessageSquare } from 'lucide-react';
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
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-xs',
    lg: 'px-3 py-1.5 text-xs gap-1.5',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {inTalks && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-paper text-ink border border-rule">
          <MessageSquare className="w-4 h-4 text-ink" />
          In talks
        </span>
      )}

      {isApprovedPublisher && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          title={wishlisted ? 'Remove from publisher wishlist' : 'Add to private publisher wishlist'}
          className={`flex items-center rounded border border-rule cursor-pointer ${sizeClasses[size]} ${
            wishlisted
              ? 'bg-ink text-paper border-ink'
              : 'bg-paper text-ink hover:border-ink hover:text-accent'
          }`}
        >
          <Bookmark
            className={`w-4 h-4 ${
              wishlisted ? 'fill-paper text-paper' : 'text-current'
            }`}
          />
          {showLabel && (
            <span className="font-bold text-xs ml-1">
              {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

