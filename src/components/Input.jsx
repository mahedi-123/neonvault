import { forwardRef } from 'react';
import { cn } from '../utils/helpers';

const Input = forwardRef(({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-body font-medium text-text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-surface border border-border text-text placeholder:text-text-subtle',
          'px-4 py-3 text-sm font-body',
          'transition-all duration-200',
          'hover:border-border-hover',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-error focus:ring-error',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;