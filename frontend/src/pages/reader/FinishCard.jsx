import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
          cardBg: 'bg-[#18181A] border-[#333333] text-[#E6E6E6]',
          badgeBg: 'border-[#333333] text-accent',
          subtext: 'text-muted',
          itemBg: 'bg-[#2A2A30] border-[#333333]',
        };
      case 'sepia':
        return {
          cardBg: 'bg-[#F4ECD8] border-[#D9D2C3] text-[#382C1E]',
          badgeBg: 'border-[#D9D2C3] text-accent',
          subtext: 'text-[#6C5B48]',
          itemBg: 'bg-[#FAF4E6] border-[#D9D2C3]',
        };
      default:
        return {
          cardBg: 'bg-paper border-rule text-ink',
          badgeBg: 'border-rule text-accent',
          subtext: 'text-muted',
          itemBg: 'bg-paper border-rule',
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-6">
      <div className={`p-8 rounded border space-y-6 ${styles.cardBg}`}>
        {/* Title & Congratulations */}
        <div className="space-y-2">
          <span className={`px-2.5 py-0.5 rounded border text-xs font-bold uppercase tracking-wider inline-block ${styles.badgeBg}`}>
            Story Completed
          </span>
          <h2 className="font-bold text-2xl text-ink">
            You Finished Reading
          </h2>
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>
            You completed <strong className="font-bold text-ink">"{book.title}"</strong>. Your reading progress has been marked as finished.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link to={`/book/${book.id || book._id}`}>
            <Button variant="primary" size="md">
              Return to Story Page
            </Button>
          </Link>
          {onReplayFromStart && (
            <Button
              variant="secondary"
              size="md"
              onClick={onReplayFromStart}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Read Again from Page 1
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
