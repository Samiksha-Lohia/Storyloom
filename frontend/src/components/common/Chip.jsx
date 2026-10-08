import React from 'react';

export default function Chip({
  children,
  label,
  active = false,
  onClick,
  className = '',
  size = 'default',
}) {
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-xs md:text-sm px-3 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  };

  const isClickable = Boolean(onClick);

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-bold rounded border select-none ${
        sizeStyles[size] || sizeStyles.default
      } ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink border-rule hover:border-ink hover:text-accent'
      } ${isClickable ? 'cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {children || label}
    </button>
  );
}

export { Chip };

