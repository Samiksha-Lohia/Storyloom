import React from 'react';

export default function Chip({
  children,
  label,
  active = false,
  onClick,
  className = '',
  size = 'default',
  variant = 'default',
}) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1',
    default: 'text-xs md:text-sm px-3.5 py-1.5',
    lg: 'text-sm px-4 py-2',
  };

  const isClickable = Boolean(onClick);

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium rounded-full transition-colors select-none ${
        sizeStyles[size] || sizeStyles.default
      } ${
        active
          ? 'bg-[#FF500A] text-white shadow-xs'
          : 'bg-[#FFF0E8] text-[#FF500A] hover:bg-[#FFE3D4]'
      } ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'} ${className}`}
    >
      {children || label}
    </button>
  );
}

export { Chip };

