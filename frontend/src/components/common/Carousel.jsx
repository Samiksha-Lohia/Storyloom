import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Carousel({
  children,
  title,
  subtitle,
  ariaLabel,
  viewAllLink,
  actions,
  className = '',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, children]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      scroll('right');
    }
  };

  const hasHeader = Boolean(title || subtitle || actions || viewAllLink);

  return (
    <section className={`relative w-full ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between mb-4 border-b border-rule pb-2">
          <div>
            {title && (
              <h2 className="text-xl font-bold font-body text-ink">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions || viewAllLink}

            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <button
                type="button"
                aria-label="Previous items"
                disabled={!canScrollLeft}
                onClick={() => scroll('left')}
                className="w-7 h-7 rounded border border-rule flex items-center justify-center text-ink bg-paper hover:border-ink hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next items"
                disabled={!canScrollRight}
                onClick={() => scroll('right')}
                className="w-7 h-7 rounded border border-rule flex items-center justify-center text-ink bg-paper hover:border-ink hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasHeader && (
        <>
          <button
            type="button"
            aria-label="Previous items"
            disabled={!canScrollLeft}
            onClick={() => scroll('left')}
            className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded border border-rule bg-paper text-ink items-center justify-center hover:border-ink disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next items"
            disabled={!canScrollRight}
            onClick={() => scroll('right')}
            className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded border border-rule bg-paper text-ink items-center justify-center hover:border-ink disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel || title || 'Carousel'}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </section>
  );
}

export { Carousel };

