import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, MessageSquare, CheckCheck, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function FinishCard({
  book,
  theme = 'light',
  onReplayFromStart,
}) {
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          cardBg: 'bg-[#202024] border-[#303038] text-[#E6E6E6]',
          badgeBg: 'bg-[#FF500A]/20 text-[#FF500A]',
          subtext: 'text-stone-400',
          itemBg: 'bg-[#282830] border-[#383842]',
        };
      case 'sepia':
        return {
          cardBg: 'bg-[#FAF4E6] border-[#DECFA7] text-[#382C1E]',
          badgeBg: 'bg-[#FF500A]/15 text-[#FF500A]',
          subtext: 'text-[#6C5B48]',
          itemBg: 'bg-[#F2E8D2] border-[#DECFA7]',
        };
      default:
        return {
          cardBg: 'bg-white border-stone-200 text-stone-900',
          badgeBg: 'bg-[#FFF0E8] text-[#FF500A]',
          subtext: 'text-stone-500',
          itemBg: 'bg-stone-50 border-stone-200',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-6 animate-in fade-in duration-300">
      <div className={`p-8 sm:p-10 rounded-3xl border shadow-sm space-y-6 ${styles.cardBg}`}>
        {/* Trophy icon */}
        <div className="w-16 h-16 rounded-3xl bg-[#FFF0E8] text-[#FF500A] flex items-center justify-center mx-auto shadow-xs">
          <Trophy className="w-8 h-8" />
        </div>

        {/* Title & Congratulations */}
        <div className="space-y-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles.badgeBg}`}>
            Story Completed
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-black">
            You Finished Reading!
          </h2>
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>
            Congratulations on completing <strong className="font-bold">"{book.title}"</strong>. Your reading progress has been marked as finished in your library.
          </p>
        </div>

        {/* Rating & Review (Phase 5 Preview) */}
        <div className={`p-5 rounded-2xl border text-left space-y-3 ${styles.itemBg}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              Rate this Story
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200/60 text-stone-600 px-2 py-0.5 rounded-full">
              Coming in Phase 5
            </span>
          </div>

          <div className="flex items-center gap-2 text-stone-300 opacity-60 cursor-not-allowed">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="text-2xl">★</span>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-200/40 flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Write a Review
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200/60 text-stone-600 px-2 py-0.5 rounded-full">
              Coming in Phase 5
            </span>
          </div>
        </div>

        {/* Similar Books (Phase 5 Preview) */}
        <div className={`p-5 rounded-2xl border text-left space-y-2 ${styles.itemBg}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#FF500A]" />
              Similar Stories in {book.genre || 'General'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200/60 text-stone-600 px-2 py-0.5 rounded-full">
              Coming in Phase 5
            </span>
          </div>
          <p className={`text-xs ${styles.subtext}`}>
            Personalized narrative recommendations will appear here based on pacing and themes.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to={`/book/${book.id || book._id}`}>
            <Button variant="secondary" size="md">
              Return to Story Page
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            onClick={onReplayFromStart}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Read Again from Page 1
          </Button>
        </div>
      </div>
    </div>
  );
}
