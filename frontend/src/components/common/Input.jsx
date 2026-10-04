import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  disabled = false,
  required = false,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-[#121212] select-none">
          {label} {required && <span className="text-[#D63B2F]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full h-11 px-3.5 text-sm bg-white rounded-lg border transition-all ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-[#D63B2F] focus:ring-2 focus:ring-[#D63B2F]/30 focus:border-[#D63B2F]'
              : 'border-[#E5E5E5] focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]'
          } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-[#D63B2F] font-medium mt-0.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#6B6B6B] mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}

export { Input };

