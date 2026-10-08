import React from 'react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded cursor-pointer select-none border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1 h-8 gap-1.5',
    default: 'text-sm px-4 py-2 h-10 gap-2',
    lg: 'text-base px-6 py-2.5 h-11 gap-2',
  };

  const variantStyles = {
    primary:
      'bg-accent hover:bg-accent-hover text-paper border-accent',
    secondary:
      'bg-paper hover:bg-rule/50 text-ink border-rule',
    ghost:
      'bg-transparent hover:bg-rule/40 text-ink border-transparent',
    outline:
      'bg-paper hover:bg-rule/40 text-ink border-rule',
    danger:
      'bg-danger hover:opacity-90 text-paper border-danger',
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
        <span>Loading…</span>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}

export { Button };

