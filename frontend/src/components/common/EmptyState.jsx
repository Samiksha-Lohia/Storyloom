import React from 'react';
import { BookOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = BookOpen,
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  actionText,
  actionLabel,
  onAction,
  className = '',
}) {
  const buttonLabel = actionLabel || actionText;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F7F7F7]/60 select-none ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-white text-slate-400 border border-[#E5E5E5] flex items-center justify-center mb-3 shadow-xs">
        {React.isValidElement(Icon) ? Icon : <Icon className="w-6 h-6" />}
      </div>
      <h3 className="text-base md:text-lg font-bold text-[#121212] mb-1 font-serif">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-[#6B6B6B] max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {buttonLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };

