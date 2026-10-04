import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size = 'default', // 'sm' | 'default' | 'lg'
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF500A] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 h-8 gap-1.5',
    default: 'text-sm px-5 py-2.5 h-11 md:h-10 gap-2',
    lg: 'text-base px-7 py-3 h-12 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-[#FF500A] hover:bg-[#E04600] text-white shadow-sm hover:shadow active:scale-[0.98]',
    secondary:
      'bg-white hover:bg-[#FFF0E8] text-[#FF500A] border border-[#FF500A] active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-slate-100 text-[#121212] active:bg-slate-200',
    outline:
      'bg-transparent hover:bg-slate-50 text-[#121212] border border-[#E5E5E5] active:bg-slate-100',
    danger:
      'bg-[#D63B2F] hover:bg-red-700 text-white shadow-sm active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.default} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}

export { Button };

