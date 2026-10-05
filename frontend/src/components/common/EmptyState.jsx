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
      className={`flex flex-col items-center justify-center p-8 text-center rounded border border-dashed border-rule bg-paper select-none ${className}`}
    >
      <div className="w-8 h-8 rounded border border-rule flex items-center justify-center mb-3 text-muted">
        {React.isValidElement(Icon) ? Icon : <Icon className="w-4 h-4" />}
      </div>
      <h3 className="text-base font-bold text-ink mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed font-body">
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
