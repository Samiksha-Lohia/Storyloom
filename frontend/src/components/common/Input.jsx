import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
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
    rightAction,
    ...props
  },
  ref
) {
  const errorId = id ? `${id}-error` : undefined;
  const hintId = id ? `${id}-hint` : undefined;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-ink select-none">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-muted pointer-events-none flex items-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full h-10 px-3 text-sm bg-paper rounded border text-ink placeholder:text-muted focus:outline-none ${
            Icon ? 'pl-9' : ''
          } ${
            rightAction ? 'pr-9' : ''
          } ${
            error
              ? 'border-danger focus:border-danger'
              : 'border-rule focus:border-ink'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        {rightAction && (
          <div className="absolute right-3 flex items-center">
            {rightAction}
          </div>
        )}
      </div>

      {error ? (
        <div id={errorId} role="alert" className="text-xs text-danger font-bold mt-0.5">
          {error}
        </div>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
export { Input };


